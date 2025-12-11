import api, { ApiResponse } from ".";

// Inventory Brand interfaces
export interface InventoryBrand {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryBrandData {
  name: string;
}

export interface UpdateInventoryBrandData {
  name?: string;
}

// Inventory Brand API functions
export const getInventoryBrands = async (): Promise<
  ApiResponse<InventoryBrand[]>
> => {
  const response = await api.get<ApiResponse<InventoryBrand[]>>(
    "/inventory-brands"
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory brands"
  );
};

export const getInventoryBrandById = async (
  id: string
): Promise<ApiResponse<InventoryBrand>> => {
  const response = await api.get<ApiResponse<InventoryBrand>>(
    `/inventory-brands/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory brand"
  );
};

export const createInventoryBrand = async (
  brandData: CreateInventoryBrandData
): Promise<ApiResponse<InventoryBrand>> => {
  const response = await api.post<ApiResponse<InventoryBrand>>(
    "/inventory-brands",
    brandData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to create inventory brand"
  );
};

export const updateInventoryBrand = async (
  id: string,
  brandData: UpdateInventoryBrandData
): Promise<ApiResponse<InventoryBrand>> => {
  const response = await api.put<ApiResponse<InventoryBrand>>(
    `/inventory-brands/${id}`,
    brandData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update inventory brand"
  );
};

export const deleteInventoryBrand = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/inventory-brands/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to delete inventory brand"
  );
};
