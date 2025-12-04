import api, { ApiResponse } from ".";

// Inventory interfaces
export interface LocationQuantity {
  locationId: string;
  quantity: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  compatibleWith: string[] | null;
  costPrice: number;
  sellingPrice: number;
  quantity?: number; // Quantity for specific location when filtered
  reorderLevel: number;
  location: string | null; // Physical location description
  supplier: string | null;
  supplierPartNumber: string | null;
  isActive: boolean;
  isTaxable: boolean;
  trackQuantity: boolean;
  createdAt: string;
  updatedAt: string;
  locationQuantities: LocationQuantity[];
}

// Inventory API functions
export const getInventory = async (
  params?: URLSearchParams
): Promise<ApiResponse<InventoryItem[]>> => {
  const url = params ? `/inventory?${params.toString()}` : "/inventory";
  const response = await api.get<ApiResponse<InventoryItem[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch inventory");
};

export const searchInventory = async (
  query: string
): Promise<ApiResponse<InventoryItem[]>> => {
  const response = await api.get<ApiResponse<InventoryItem[]>>(
    `/inventory?query=${encodeURIComponent(query)}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to search inventory");
};

export const getInventoryItem = async (
  id: string
): Promise<ApiResponse<InventoryItem>> => {
  const response = await api.get<ApiResponse<InventoryItem>>(`/inventory/${id}`);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory item"
  );
};

export interface CreateInventoryItemData {
  sku?: string;
  name: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  compatibleWith?: string[] | null;
  costPrice: number;
  sellingPrice: number;
  reorderLevel?: number;
  location?: string | null;
  supplier?: string | null;
  supplierPartNumber?: string | null;
  isActive?: boolean;
  isTaxable?: boolean;
  trackQuantity?: boolean;
}

export interface UpdateInventoryItemData {
  sku?: string;
  name?: string;
  description?: string | null;
  category?: string;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  compatibleWith?: string[] | null;
  costPrice?: number;
  sellingPrice?: number;
  reorderLevel?: number;
  location?: string | null;
  supplier?: string | null;
  supplierPartNumber?: string | null;
  isActive?: boolean;
  isTaxable?: boolean;
  trackQuantity?: boolean;
}

export const createInventoryItem = async (
  data: CreateInventoryItemData
): Promise<ApiResponse<InventoryItem>> => {
  const response = await api.post<ApiResponse<InventoryItem>>(
    "/inventory",
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to create inventory item"
  );
};

export const updateInventoryItem = async (
  id: string,
  data: UpdateInventoryItemData
): Promise<ApiResponse<InventoryItem>> => {
  const response = await api.put<ApiResponse<InventoryItem>>(
    `/inventory/${id}`,
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update inventory item"
  );
};

export const deleteInventoryItem = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/inventory/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to delete inventory item"
  );
};

export const updateLocationQuantity = async (
  inventoryItemId: string,
  locationId: string,
  quantity: number
): Promise<ApiResponse<InventoryItem>> => {
  const response = await api.put<ApiResponse<InventoryItem>>(
    `/inventory/${inventoryItemId}/locations/${locationId}/quantity`,
    { quantity }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update location quantity"
  );
};

