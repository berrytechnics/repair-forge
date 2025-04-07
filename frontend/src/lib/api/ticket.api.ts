import api, { ApiResponse } from "./api";
// Ticket interfaces
export interface Ticket {
  id: string;
  ticketNumber: string;
  customerId: string;
  technicianId?: string;
  status:
    | "new"
    | "assigned"
    | "in_progress"
    | "on_hold"
    | "completed"
    | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  deviceType: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  issueDescription: string;
  diagnosticNotes?: string;
  repairNotes?: string;
  estimatedCompletionDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  technician?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateTicketData {
  customerId: string;
  technicianId?: string;
  deviceType: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  issueDescription: string;
  priority?: "low" | "medium" | "high" | "urgent";
}

export interface UpdateTicketData {
  customerId?: string;
  technicianId?: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  issueDescription?: string;
  status?:
    | "new"
    | "assigned"
    | "in_progress"
    | "on_hold"
    | "completed"
    | "cancelled";
  priority?: "low" | "medium" | "high" | "urgent";
  estimatedCompletionDate?: string;
  completedDate?: string;
}
// Ticket API functions
export const getTickets = async (
  params?: URLSearchParams
): Promise<ApiResponse<Ticket[]>> => {
  const url = params ? `/tickets?${params.toString()}` : "/tickets";
  const response = await api.get<ApiResponse<Ticket[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch tickets");
};

export const getTicketById = async (
  id: string
): Promise<ApiResponse<Ticket>> => {
  const response = await api.get<ApiResponse<Ticket>>(`/tickets/${id}`);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch ticket");
};

export const createTicket = async (
  ticketData: CreateTicketData
): Promise<ApiResponse<Ticket>> => {
  const response = await api.post<ApiResponse<Ticket>>("/tickets", ticketData);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to create ticket");
};

export const updateTicket = async (
  id: string,
  ticketData: UpdateTicketData
): Promise<ApiResponse<Ticket>> => {
  const response = await api.put<ApiResponse<Ticket>>(
    `/tickets/${id}`,
    ticketData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to update ticket");
};

export const deleteTicket = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/tickets/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to delete ticket");
};

export const assignTechnician = async (
  ticketId: string,
  technicianId: string,
  notes?: string
): Promise<ApiResponse<Ticket>> => {
  const response = await api.post<ApiResponse<Ticket>>(
    `/tickets/${ticketId}/assign`,
    { technicianId, notes }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to assign technician"
  );
};

export const updateTicketStatus = async (
  ticketId: string,
  status:
    | "new"
    | "assigned"
    | "in_progress"
    | "on_hold"
    | "completed"
    | "cancelled",
  notes?: string
): Promise<ApiResponse<Ticket>> => {
  const response = await api.post<ApiResponse<Ticket>>(
    `/tickets/${ticketId}/status`,
    { status, notes }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update ticket status"
  );
};

export const addDiagnosticNote = async (
  ticketId: string,
  note: string
): Promise<ApiResponse<Ticket>> => {
  const response = await api.post<ApiResponse<Ticket>>(
    `/tickets/${ticketId}/diagnostic-notes`,
    { note }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to add diagnostic note"
  );
};

export const addRepairNote = async (
  ticketId: string,
  note: string
): Promise<ApiResponse<Ticket>> => {
  const response = await api.post<ApiResponse<Ticket>>(
    `/tickets/${ticketId}/repair-notes`,
    { note }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to add repair note");
};
