import api, { ApiResponse } from ".";

// Inventory Subcategory interfaces
export interface InventorySubcategory {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventorySubcategoryData {
  name: string;
}

export interface UpdateInventorySubcategoryData {
  name?: string;
}

// Inventory Subcategory API functions
export const getInventorySubcategories = async (): Promise<
  ApiResponse<InventorySubcategory[]>
> => {
  const response = await api.get<ApiResponse<InventorySubcategory[]>>(
    "/inventory-subcategories"
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory subcategories"
  );
};

export const getInventorySubcategoryById = async (
  id: string
): Promise<ApiResponse<InventorySubcategory>> => {
  const response = await api.get<ApiResponse<InventorySubcategory>>(
    `/inventory-subcategories/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory subcategory"
  );
};

export const createInventorySubcategory = async (
  subcategoryData: CreateInventorySubcategoryData
): Promise<ApiResponse<InventorySubcategory>> => {
  const response = await api.post<ApiResponse<InventorySubcategory>>(
    "/inventory-subcategories",
    subcategoryData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to create inventory subcategory"
  );
};

export const updateInventorySubcategory = async (
  id: string,
  subcategoryData: UpdateInventorySubcategoryData
): Promise<ApiResponse<InventorySubcategory>> => {
  const response = await api.put<ApiResponse<InventorySubcategory>>(
    `/inventory-subcategories/${id}`,
    subcategoryData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update inventory subcategory"
  );
};

export const deleteInventorySubcategory = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/inventory-subcategories/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to delete inventory subcategory"
  );
};
