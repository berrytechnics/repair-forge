import api, { ApiResponse } from ".";

// User interfaces
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string; // Primary role for backward compatibility
  roles?: string[]; // Array of all roles
  primaryRole?: string; // Primary role
  currentLocationId?: string | null;
  active?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  active?: boolean;
}

export interface AddRoleData {
  role: string;
  isPrimary?: boolean;
}

export interface ResetPasswordData {
  newPassword: string;
}

// User API functions
export const getUsers = async (): Promise<ApiResponse<User[]>> => {
  const response = await api.get<ApiResponse<User[]>>("/users");
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to fetch users");
};

export const getUserById = async (userId: string): Promise<ApiResponse<User>> => {
  const response = await api.get<ApiResponse<User>>(`/users/${userId}`);
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to fetch user");
};

export const updateUser = async (
  userId: string,
  data: UpdateUserData
): Promise<ApiResponse<User>> => {
  const response = await api.put<ApiResponse<User>>(`/users/${userId}`, data);
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to update user");
};

export const deactivateUser = async (userId: string): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.put<ApiResponse<{ message: string }>>(`/users/${userId}/deactivate`);
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to deactivate user");
};

export const activateUser = async (userId: string): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.put<ApiResponse<{ message: string }>>(`/users/${userId}/activate`);
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to activate user");
};

export const addUserRole = async (
  userId: string,
  data: AddRoleData
): Promise<ApiResponse<User>> => {
  const response = await api.post<ApiResponse<User>>(`/users/${userId}/roles`, data);
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to add role");
};

export const removeUserRole = async (
  userId: string,
  role: string
): Promise<ApiResponse<User>> => {
  const response = await api.delete<ApiResponse<User>>(`/users/${userId}/roles/${role}`);
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to remove role");
};

export const setPrimaryRole = async (
  userId: string,
  role: string
): Promise<ApiResponse<User>> => {
  const response = await api.put<ApiResponse<User>>(`/users/${userId}/roles/${role}/primary`);
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to set primary role");
};

export const resetUserPassword = async (
  userId: string,
  data: ResetPasswordData
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post<ApiResponse<{ message: string }>>(
    `/users/${userId}/reset-password`,
    data
  );
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to reset password");
};
