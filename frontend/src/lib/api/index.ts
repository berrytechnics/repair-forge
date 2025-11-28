import axios, { AxiosError, AxiosRequestConfig } from "axios";

// Get base URL and ensure it ends with /api
const getBaseURL = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  // Remove trailing slash if present
  const baseUrl = envUrl.replace(/\/$/, "");
  // Ensure /api is included
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
};

// Create axios instance
const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interface
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    errors?: Record<string, string>;
  };
}

// Types for auth
export interface User {
  id: string;
  currentLocationId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Token management
let accessToken: string | null = null;

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from variable, localStorage, or sessionStorage (in case it was updated elsewhere)
    let token = accessToken;
    if (!token && typeof window !== "undefined") {
      token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
      // Update the module-level variable to keep it in sync
      if (token) {
        accessToken = token;
      }
    }
    // Add auth token to headers if available
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper function to extract error message from API response
export const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    
    // Check if it's an API error response with our format
    if (axiosError.response?.data) {
      const apiError = axiosError.response.data;
      
      // If it's our API error format
      if (!apiError.success && apiError.error) {
        // If there are validation errors, combine them
        if (apiError.error.errors) {
          const errorMessages = Object.values(apiError.error.errors);
          return errorMessages.length > 0 
            ? errorMessages.join(", ")
            : apiError.error.message;
        }
        return apiError.error.message;
      }
    }
    
    // Handle HTTP status codes
    if (axiosError.response?.status) {
      switch (axiosError.response.status) {
        case 400:
          return "Invalid request. Please check your input and try again.";
        case 401:
          return "You are not authorized. Please log in again.";
        case 403:
          return "You don't have permission to perform this action.";
        case 404:
          return "The requested resource was not found.";
        case 409:
          return "A conflict occurred. The resource may have been modified.";
        case 422:
          return "Validation failed. Please check your input.";
        case 500:
          return "Server error. Please try again later.";
        case 503:
          return "Service temporarily unavailable. Please try again later.";
        default:
          return axiosError.message || "An unexpected error occurred.";
      }
    }
    
    // Network errors
    if (axiosError.code === "ECONNABORTED") {
      return "Request timeout. Please try again.";
    }
    if (axiosError.code === "ERR_NETWORK") {
      return "Network error. Please check your connection and try again.";
    }
  }
  
  // If it's a regular Error object
  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback
  return "An unexpected error occurred. Please try again.";
};

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 or 403 (unauthorized/forbidden), token is invalid or expired
    // Since there's no refresh endpoint yet, redirect to login (but not if already on login page)
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Logout
      logout();
      
      // Redirect to login page if we're in the browser and not already on login/register pages
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        if (currentPath !== "/login" && currentPath !== "/register") {
          window.location.href = "/login";
        }
      }
    }

    // Enhance error with user-friendly message
    const friendlyError = new Error(getErrorMessage(error));
    (friendlyError as Error & {
      response?: AxiosError["response"];
      request?: AxiosError["request"];
      config?: AxiosError["config"];
      isAxiosError?: boolean;
    }).response = error.response;
    (friendlyError as Error & {
      response?: AxiosError["response"];
      request?: AxiosError["request"];
      config?: AxiosError["config"];
      isAxiosError?: boolean;
    }).request = error.request;
    (friendlyError as Error & {
      response?: AxiosError["response"];
      request?: AxiosError["request"];
      config?: AxiosError["config"];
      isAxiosError?: boolean;
    }).config = error.config;
    (friendlyError as Error & {
      response?: AxiosError["response"];
      request?: AxiosError["request"];
      config?: AxiosError["config"];
      isAxiosError?: boolean;
    }).isAxiosError = true;
    
    return Promise.reject(friendlyError);
  }
);

// Auth functions
export const login = async (
  credentials: LoginCredentials,
  rememberMe: boolean = true
): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>(
    "/auth/login",
    credentials
  );

  if (response.data.success && response.data.data) {
    const { accessToken: token, refreshToken } = response.data.data;
    accessToken = token;
    
    // Store tokens based on remember me preference
    // localStorage persists across browser sessions
    // sessionStorage clears when browser tab/window closes
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("accessToken", token);
    storage.setItem("refreshToken", refreshToken);
    
    // Clear the other storage type to avoid conflicts
    if (rememberMe) {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    
    return response.data.data;
  }

  throw new Error(response.data.error?.message || "Login failed");
};

export const register = async (
  userData: LoginCredentials & {
    firstName: string;
    lastName: string;
    companyName?: string;
    invitationToken?: string;
    role?: string;
  },
  rememberMe: boolean = true
): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>(
    "/auth/register",
    userData
  );

  if (response.data.success && response.data.data) {
    const { accessToken: token, refreshToken } = response.data.data;
    accessToken = token;
    
    // Store tokens based on remember me preference
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("accessToken", token);
    storage.setItem("refreshToken", refreshToken);
    
    // Clear the other storage type to avoid conflicts
    if (rememberMe) {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    
    return response.data.data;
  }

  throw new Error(response.data.error?.message || "Registration failed");
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<ApiResponse<User>>("/auth/me");

  if (response.data.success && response.data.data) {
    return response.data.data;
  }

  throw new Error(response.data.error?.message || "Failed to get user");
};

export const logout = (): void => {
  accessToken = null;
  if (typeof window !== "undefined") {
    // Clear tokens from both storage types
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
  }
};

// User/Technician API functions
export type Technician = User & {
  // Additional technician-specific fields could be added here
};

export const getTechnicians = async (): Promise<ApiResponse<Technician[]>> => {
  const response = await api.get<ApiResponse<Technician[]>>(
    "/users/technicians"
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch technicians"
  );
};

// Permissions API functions
export const getPermissionsMatrix = async (): Promise<Record<string, string[]>> => {
  const response = await api.get<ApiResponse<Record<string, string[]>>>(
    "/users/permissions/matrix"
  );

  if (response.data.success && response.data.data) {
    return response.data.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch permissions matrix"
  );
};

export const updateRolePermissions = async (
  role: string,
  permissions: string[]
): Promise<void> => {
  const response = await api.put<ApiResponse<void>>(
    `/users/permissions/role/${role}`,
    { permissions }
  );

  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || "Failed to update role permissions"
    );
  }
};

// Function to restore token from storage
export const restoreTokenFromStorage = (): void => {
  if (typeof window !== "undefined") {
    const savedToken = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    if (savedToken) {
      accessToken = savedToken;
    }
  }
};

// Set token from storage on init (check both localStorage and sessionStorage)
restoreTokenFromStorage();

export default api;
