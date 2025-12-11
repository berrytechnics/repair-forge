import api, { ApiResponse } from ".";

// Purchase Order interfaces
export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  inventoryItemId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  subtotal: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  totalAmount: number;
  items?: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderData {
  supplier: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items: CreatePurchaseOrderItemData[];
}

export interface CreatePurchaseOrderItemData {
  inventoryItemId: string;
  quantityOrdered: number;
  unitCost: number;
  notes?: string | null;
}

export interface UpdatePurchaseOrderData {
  supplier?: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  status?: PurchaseOrderStatus;
  items?: CreatePurchaseOrderItemData[];
}

export interface ReceivePurchaseOrderData {
  items: ReceivePurchaseOrderItemData[];
}

export interface ReceivePurchaseOrderItemData {
  id: string;
  quantityReceived: number;
}

// Purchase Order API functions
export const getPurchaseOrders = async (
  status?: PurchaseOrderStatus
): Promise<ApiResponse<PurchaseOrder[]>> => {
  const url = status
    ? `/purchase-orders?status=${status}`
    : "/purchase-orders";
  const response = await api.get<ApiResponse<PurchaseOrder[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch purchase orders"
  );
};

export const getPurchaseOrder = async (
  id: string
): Promise<ApiResponse<PurchaseOrder>> => {
  const response = await api.get<ApiResponse<PurchaseOrder>>(
    `/purchase-orders/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch purchase order"
  );
};

export const createPurchaseOrder = async (
  data: CreatePurchaseOrderData
): Promise<ApiResponse<PurchaseOrder>> => {
  const response = await api.post<ApiResponse<PurchaseOrder>>(
    "/purchase-orders",
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to create purchase order"
  );
};

export const updatePurchaseOrder = async (
  id: string,
  data: UpdatePurchaseOrderData
): Promise<ApiResponse<PurchaseOrder>> => {
  const response = await api.put<ApiResponse<PurchaseOrder>>(
    `/purchase-orders/${id}`,
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update purchase order"
  );
};

export const deletePurchaseOrder = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/purchase-orders/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to delete purchase order"
  );
};

export const submitPurchaseOrder = async (
  id: string
): Promise<ApiResponse<PurchaseOrder>> => {
  const response = await api.post<ApiResponse<PurchaseOrder>>(
    `/purchase-orders/${id}/submit`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to submit purchase order"
  );
};

export const receivePurchaseOrder = async (
  id: string,
  data: ReceivePurchaseOrderData
): Promise<ApiResponse<PurchaseOrder>> => {
  const response = await api.post<ApiResponse<PurchaseOrder>>(
    `/purchase-orders/${id}/receive`,
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to receive purchase order"
  );
};

export const cancelPurchaseOrder = async (
  id: string
): Promise<ApiResponse<PurchaseOrder>> => {
  const response = await api.post<ApiResponse<PurchaseOrder>>(
    `/purchase-orders/${id}/cancel`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to cancel purchase order"
  );
};
