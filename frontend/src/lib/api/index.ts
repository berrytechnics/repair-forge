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
  firstName: string;
  lastName: string;
  email: string;
  role: string;
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
    // Add auth token to headers if available
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get refresh token from local storage
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Attempt to refresh token
        const response = await axios.post<
          ApiResponse<{ accessToken: string; refreshToken: string }>
        >(`${getBaseURL()}/auth/refresh`, { refreshToken });

        if (response.data.success && response.data.data) {
          // Update tokens
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            response.data.data;
          accessToken = newAccessToken;
          localStorage.setItem("refreshToken", newRefreshToken);

          // Retry original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          return axios(originalRequest);
        }
      } catch (err) {
        console.error(err);
        // If refresh fails, logout user
        logout();
      }
    }

    return Promise.reject(error);
  }
);

// Auth functions
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>(
    "/auth/login",
    credentials
  );

  if (response.data.success && response.data.data) {
    const { accessToken: token, refreshToken } = response.data.data;
    accessToken = token;
    localStorage.setItem("accessToken", token);
    localStorage.setItem("refreshToken", refreshToken);
    return response.data.data;
  }

  throw new Error(response.data.error?.message || "Login failed");
};

export const register = async (
  userData: LoginCredentials & {
    firstName: string;
    lastName: string;
    role?: string;
  }
): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>(
    "/auth/register",
    userData
  );

  if (response.data.success && response.data.data) {
    const { accessToken: token, refreshToken } = response.data.data;
    accessToken = token;
    localStorage.setItem("accessToken", token);
    localStorage.setItem("refreshToken", refreshToken);
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
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  // Redirect to login or handle in UI
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

// Set token from storage on init
if (typeof window !== "undefined") {
  const savedToken = localStorage.getItem("accessToken");
  if (savedToken) {
    accessToken = savedToken;
  }
}

export default api;
