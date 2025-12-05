import api, { ApiResponse } from ".";
import { Customer } from "./customer.api";
import { Ticket } from "./ticket.api";

// Invoice interfaces
export interface InvoiceItem {
  id: string;
  invoiceId: string;
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  subtotal?: number;
  type: "part" | "service" | "other";
  isTaxable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customer?: Customer;
  ticketId?: string;
  ticket?: Ticket;
  locationId?: string | null;
  status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  issueDate?: string;
  dueDate?: string;
  paidDate?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  refundAmount?: number;
  refundDate?: string;
  refundReason?: string;
  refundMethod?: string;
  notes?: string;
  paymentMethod?: string;
  paymentReference?: string;
  cashDrawerSessionId?: string | null;
  invoiceItems?: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceData {
  customerId?: string | null;
  ticketId?: string;
  status?: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  dueDate?: string;
  subtotal?: number;
  discountAmount?: number;
  notes?: string;
  invoiceItems?: Omit<
    InvoiceItem,
    "id" | "invoiceId" | "createdAt" | "updatedAt"
  >[];
}

export interface UpdateInvoiceData {
  customerId?: string;
  ticketId?: string;
  status?: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  dueDate?: string;
  subtotal?: number;
  discountAmount?: number;
  notes?: string;
  invoiceItems?: Omit<
    InvoiceItem,
    "id" | "invoiceId" | "createdAt" | "updatedAt"
  >[];
}

export interface CreateInvoiceItemData {
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  type: "part" | "service" | "other";
}

export interface UpdateInvoiceItemData {
  inventoryItemId?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  type?: "part" | "service" | "other";
}

export interface MarkInvoicePaidData {
  paymentMethod: string;
  paymentReference?: string;
  paidDate?: string;
  notes?: string;
}

export interface RefundInvoiceData {
  refundAmount: number;
  refundReason?: string;
  refundMethod?: string;
}

// Invoice API functions
export const getInvoices = async (
  params?: URLSearchParams
): Promise<ApiResponse<Invoice[]>> => {
  const url = params ? `/invoices?${params.toString()}` : "/invoices";
  const response = await api.get<ApiResponse<Invoice[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch invoices");
};

export const getInvoiceById = async (
  id: string
): Promise<ApiResponse<Invoice>> => {
  const response = await api.get<ApiResponse<Invoice>>(`/invoices/${id}`);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch invoice");
};

export const createInvoice = async (
  invoiceData: CreateInvoiceData
): Promise<ApiResponse<Invoice>> => {
  const response = await api.post<ApiResponse<Invoice>>(
    "/invoices",
    invoiceData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to create invoice");
};

export const updateInvoice = async (
  id: string,
  invoiceData: UpdateInvoiceData
): Promise<ApiResponse<Invoice>> => {
  const response = await api.put<ApiResponse<Invoice>>(
    `/invoices/${id}`,
    invoiceData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to update invoice");
};

export const deleteInvoice = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/invoices/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to delete invoice");
};

export const addInvoiceItem = async (
  invoiceId: string,
  itemData: CreateInvoiceItemData
): Promise<ApiResponse<InvoiceItem>> => {
  const response = await api.post<ApiResponse<InvoiceItem>>(
    `/invoices/${invoiceId}/items`,
    itemData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to add invoice item");
};

export const updateInvoiceItem = async (
  invoiceId: string,
  itemId: string,
  itemData: UpdateInvoiceItemData
): Promise<ApiResponse<InvoiceItem>> => {
  const response = await api.put<ApiResponse<InvoiceItem>>(
    `/invoices/${invoiceId}/items/${itemId}`,
    itemData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update invoice item"
  );
};

export const removeInvoiceItem = async (
  invoiceId: string,
  itemId: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/invoices/${invoiceId}/items/${itemId}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to remove invoice item"
  );
};

export const markInvoiceAsPaid = async (
  invoiceId: string,
  paymentData: MarkInvoicePaidData
): Promise<ApiResponse<Invoice>> => {
  const response = await api.post<ApiResponse<Invoice>>(
    `/invoices/${invoiceId}/paid`,
    paymentData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to mark invoice as paid"
  );
};

export const refundInvoice = async (
  invoiceId: string,
  refundData: RefundInvoiceData
): Promise<ApiResponse<Invoice>> => {
  const response = await api.post<ApiResponse<Invoice>>(
    `/invoices/${invoiceId}/refund`,
    refundData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to refund invoice"
  );
};

export const getInvoicesByCustomer = async (
  customerId: string
): Promise<ApiResponse<Invoice[]>> => {
  const response = await api.get<ApiResponse<Invoice[]>>(
    `/customers/${customerId}/invoices`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch customer invoices"
  );
};

export const getInvoicesByTicket = async (
  ticketId: string
): Promise<ApiResponse<Invoice[]>> => {
  const response = await api.get<ApiResponse<Invoice[]>>(
    `/invoices?ticketId=${ticketId}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch ticket invoices"
  );
};
