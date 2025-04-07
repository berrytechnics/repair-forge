import api, { ApiResponse } from "./api";
import { Ticket } from "./ticket.api";

// Customer interfaces
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

export interface UpdateCustomerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

// Customer API functions
export const getCustomers = async (
  params?: URLSearchParams
): Promise<ApiResponse<Customer[]>> => {
  const url = params ? `/customers?${params.toString()}` : "/customers";
  const response = await api.get<ApiResponse<Customer[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch customers");
};

export const getCustomerById = async (
  id: string
): Promise<ApiResponse<Customer>> => {
  const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch customer");
};

export const createCustomer = async (
  customerData: CreateCustomerData
): Promise<ApiResponse<Customer>> => {
  const response = await api.post<ApiResponse<Customer>>(
    "/customers",
    customerData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to create customer");
};

export const updateCustomer = async (
  id: string,
  customerData: UpdateCustomerData
): Promise<ApiResponse<Customer>> => {
  const response = await api.put<ApiResponse<Customer>>(
    `/customers/${id}`,
    customerData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to update customer");
};

export const deleteCustomer = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/customers/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to delete customer");
};

export const searchCustomers = async (
  query: string
): Promise<ApiResponse<Customer[]>> => {
  const response = await api.get<ApiResponse<Customer[]>>(
    `/customers/search?query=${encodeURIComponent(query)}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to search customers");
};

export const getCustomerTickets = async (
  customerId: string
): Promise<ApiResponse<Ticket[]>> => {
  const response = await api.get<ApiResponse<Ticket[]>>(
    `/customers/${customerId}/tickets`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch customer tickets"
  );
};
