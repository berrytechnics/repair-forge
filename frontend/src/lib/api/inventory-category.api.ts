import api, { ApiResponse } from ".";

// Inventory Category interfaces
export interface InventoryCategory {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryCategoryData {
  name: string;
}

export interface UpdateInventoryCategoryData {
  name?: string;
}

// Inventory Category API functions
export const getInventoryCategories = async (): Promise<
  ApiResponse<InventoryCategory[]>
> => {
  const response = await api.get<ApiResponse<InventoryCategory[]>>(
    "/inventory-categories"
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory categories"
  );
};

export const getInventoryCategoryById = async (
  id: string
): Promise<ApiResponse<InventoryCategory>> => {
  const response = await api.get<ApiResponse<InventoryCategory>>(
    `/inventory-categories/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory category"
  );
};

export const createInventoryCategory = async (
  categoryData: CreateInventoryCategoryData
): Promise<ApiResponse<InventoryCategory>> => {
  const response = await api.post<ApiResponse<InventoryCategory>>(
    "/inventory-categories",
    categoryData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to create inventory category"
  );
};

export const updateInventoryCategory = async (
  id: string,
  categoryData: UpdateInventoryCategoryData
): Promise<ApiResponse<InventoryCategory>> => {
  const response = await api.put<ApiResponse<InventoryCategory>>(
    `/inventory-categories/${id}`,
    categoryData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update inventory category"
  );
};

export const deleteInventoryCategory = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/inventory-categories/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to delete inventory category"
  );
};
