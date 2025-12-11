import api, { ApiResponse } from ".";

// Inventory Model interfaces
export interface InventoryModel {
  id: string;
  companyId: string;
  brandId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryModelData {
  brandId: string;
  name: string;
}

export interface UpdateInventoryModelData {
  brandId?: string;
  name?: string;
}

// Inventory Model API functions
export const getInventoryModels = async (
  brandId?: string
): Promise<ApiResponse<InventoryModel[]>> => {
  const params = brandId ? `?brandId=${brandId}` : "";
  const response = await api.get<ApiResponse<InventoryModel[]>>(
    `/inventory-models${params}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory models"
  );
};

export const getInventoryModelById = async (
  id: string
): Promise<ApiResponse<InventoryModel>> => {
  const response = await api.get<ApiResponse<InventoryModel>>(
    `/inventory-models/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory model"
  );
};

export const createInventoryModel = async (
  modelData: CreateInventoryModelData
): Promise<ApiResponse<InventoryModel>> => {
  const response = await api.post<ApiResponse<InventoryModel>>(
    "/inventory-models",
    modelData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to create inventory model"
  );
};

export const updateInventoryModel = async (
  id: string,
  modelData: UpdateInventoryModelData
): Promise<ApiResponse<InventoryModel>> => {
  const response = await api.put<ApiResponse<InventoryModel>>(
    `/inventory-models/${id}`,
    modelData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update inventory model"
  );
};

export const deleteInventoryModel = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/inventory-models/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to delete inventory model"
  );
};
