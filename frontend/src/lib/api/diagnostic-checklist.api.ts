import api, { ApiResponse } from ".";

// Checklist interfaces
export type ChecklistFieldType = "checkbox" | "text" | "dropdown";

export interface ChecklistItem {
  id: string;
  templateId: string;
  label: string;
  fieldType: ChecklistFieldType;
  isRequired: boolean;
  orderIndex: number;
  dropdownOptions: string[] | null;
}

export interface ChecklistTemplate {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistTemplateSummary {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChecklistItemData {
  label: string;
  fieldType: ChecklistFieldType;
  isRequired: boolean;
  orderIndex: number;
  dropdownOptions?: string[];
}

export interface CreateChecklistTemplateData {
  name: string;
  description?: string;
  items: CreateChecklistItemData[];
}

export interface UpdateChecklistTemplateData {
  name?: string;
  description?: string;
  isActive?: boolean;
  items?: CreateChecklistItemData[];
}

export interface ChecklistResponse {
  id: string;
  ticketId: string;
  templateId: string;
  itemId: string;
  responseValue: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistResponseData {
  itemId: string;
  responseValue: string | null;
}

export interface SaveChecklistResponsesData {
  templateId: string;
  responses: ChecklistResponseData[];
}

// Checklist Template API functions
export const getChecklistTemplates = async (): Promise<
  ApiResponse<ChecklistTemplateSummary[]>
> => {
  const response = await api.get<ApiResponse<ChecklistTemplateSummary[]>>(
    "/diagnostic-checklists/templates"
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch checklist templates"
  );
};

export const getChecklistTemplate = async (
  id: string
): Promise<ApiResponse<ChecklistTemplate>> => {
  const response = await api.get<ApiResponse<ChecklistTemplate>>(
    `/diagnostic-checklists/templates/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch checklist template"
  );
};

export const createChecklistTemplate = async (
  templateData: CreateChecklistTemplateData
): Promise<ApiResponse<ChecklistTemplate>> => {
  const response = await api.post<ApiResponse<ChecklistTemplate>>(
    "/diagnostic-checklists/templates",
    templateData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to create checklist template"
  );
};

export const updateChecklistTemplate = async (
  id: string,
  templateData: UpdateChecklistTemplateData
): Promise<ApiResponse<ChecklistTemplate>> => {
  const response = await api.put<ApiResponse<ChecklistTemplate>>(
    `/diagnostic-checklists/templates/${id}`,
    templateData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update checklist template"
  );
};

export const deleteChecklistTemplate = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/diagnostic-checklists/templates/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to delete checklist template"
  );
};

// Checklist Response API functions
export const getTicketChecklistResponses = async (
  ticketId: string
): Promise<ApiResponse<ChecklistResponse[]>> => {
  const response = await api.get<ApiResponse<ChecklistResponse[]>>(
    `/diagnostic-checklists/tickets/${ticketId}/responses`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch checklist responses"
  );
};

export const saveTicketChecklistResponses = async (
  ticketId: string,
  data: SaveChecklistResponsesData
): Promise<ApiResponse<ChecklistResponse[]>> => {
  const response = await api.post<ApiResponse<ChecklistResponse[]>>(
    `/diagnostic-checklists/tickets/${ticketId}/responses`,
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to save checklist responses"
  );
};

export const updateTicketChecklistResponses = async (
  ticketId: string,
  data: SaveChecklistResponsesData
): Promise<ApiResponse<ChecklistResponse[]>> => {
  const response = await api.put<ApiResponse<ChecklistResponse[]>>(
    `/diagnostic-checklists/tickets/${ticketId}/responses`,
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update checklist responses"
  );
};

