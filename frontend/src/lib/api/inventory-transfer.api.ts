import api, { ApiResponse } from ".";

// Inventory Transfer interfaces
export type InventoryTransferStatus = "pending" | "completed" | "cancelled";

export interface InventoryTransferLocation {
  id: string;
  name: string;
}

export interface InventoryTransferItem {
  id: string;
  sku: string;
  name: string;
}

export interface InventoryTransferUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface InventoryTransfer {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  inventoryItemId: string;
  quantity: number;
  transferredBy: string;
  status: InventoryTransferStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  fromLocation?: InventoryTransferLocation;
  toLocation?: InventoryTransferLocation;
  inventoryItem?: InventoryTransferItem;
  transferredByUser?: InventoryTransferUser;
}

export interface CreateInventoryTransferData {
  fromLocationId: string;
  toLocationId: string;
  inventoryItemId: string;
  quantity: number;
  notes?: string | null;
}

// Inventory Transfer API functions
export const getInventoryTransfers = async (
  status?: InventoryTransferStatus,
  fromLocation?: string,
  toLocation?: string
): Promise<ApiResponse<InventoryTransfer[]>> => {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (fromLocation) params.append("fromLocation", fromLocation);
  if (toLocation) params.append("toLocation", toLocation);

  const url = `/inventory-transfers${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await api.get<ApiResponse<InventoryTransfer[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory transfers"
  );
};

export const getInventoryTransfer = async (
  id: string
): Promise<ApiResponse<InventoryTransfer>> => {
  const response = await api.get<ApiResponse<InventoryTransfer>>(
    `/inventory-transfers/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch inventory transfer"
  );
};

export const createInventoryTransfer = async (
  data: CreateInventoryTransferData
): Promise<ApiResponse<InventoryTransfer>> => {
  const response = await api.post<ApiResponse<InventoryTransfer>>(
    "/inventory-transfers",
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to create inventory transfer"
  );
};

export const completeInventoryTransfer = async (
  id: string
): Promise<ApiResponse<InventoryTransfer>> => {
  const response = await api.post<ApiResponse<InventoryTransfer>>(
    `/inventory-transfers/${id}/complete`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to complete inventory transfer"
  );
};

export const cancelInventoryTransfer = async (
  id: string
): Promise<ApiResponse<InventoryTransfer>> => {
  const response = await api.post<ApiResponse<InventoryTransfer>>(
    `/inventory-transfers/${id}/cancel`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to cancel inventory transfer"
  );
};
