import api, { ApiResponse } from ".";

// Location interfaces
export interface Location {
  id: string;
  company_id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  taxRate: number;
  taxName?: string | null;
  taxEnabled?: boolean;
  taxInclusive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  taxRate?: number;
  taxName?: string;
  taxEnabled?: boolean;
  taxInclusive?: boolean;
}

export interface UpdateLocationData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  taxRate?: number;
  taxName?: string;
  taxEnabled?: boolean;
  taxInclusive?: boolean;
}

export interface LocationUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Location API functions
export const getLocations = async (): Promise<ApiResponse<Location[]>> => {
  const response = await api.get<ApiResponse<Location[]>>("/locations");

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch locations");
};

export const getLocationById = async (
  id: string
): Promise<ApiResponse<Location>> => {
  const response = await api.get<ApiResponse<Location>>(`/locations/${id}`);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch location");
};

export const createLocation = async (
  locationData: CreateLocationData
): Promise<ApiResponse<Location>> => {
  const response = await api.post<ApiResponse<Location>>(
    "/locations",
    locationData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to create location");
};

export const updateLocation = async (
  id: string,
  locationData: UpdateLocationData
): Promise<ApiResponse<Location>> => {
  const response = await api.put<ApiResponse<Location>>(
    `/locations/${id}`,
    locationData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to update location");
};

export const deleteLocation = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/locations/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to delete location");
};

export const getLocationUsers = async (
  locationId: string
): Promise<ApiResponse<LocationUser[]>> => {
  const response = await api.get<ApiResponse<LocationUser[]>>(
    `/locations/${locationId}/users`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch location users"
  );
};

// User Location Assignment API functions
export const getUserLocations = async (
  userId: string
): Promise<ApiResponse<Array<{ id: string; name: string }>>> => {
  const response = await api.get<ApiResponse<Array<{ id: string; name: string }>>>(
    `/users/${userId}/locations`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch user locations"
  );
};

export const assignUserToLocation = async (
  userId: string,
  locationId: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post<ApiResponse<{ message: string }>>(
    `/users/${userId}/locations`,
    { locationId }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to assign user to location"
  );
};

export const removeUserFromLocation = async (
  userId: string,
  locationId: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/users/${userId}/locations/${locationId}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to remove user from location"
  );
};

export const setCurrentLocation = async (
  locationId: string | null
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.put<ApiResponse<{ message: string }>>(
    "/users/me/location",
    { locationId }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to set current location"
  );
};

export const getCurrentUserLocations = async (): Promise<
  ApiResponse<Array<{ id: string; name: string }>>
> => {
  const response = await api.get<ApiResponse<Array<{ id: string; name: string }>>>(
    "/users/me/locations"
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch current user locations"
  );
};



