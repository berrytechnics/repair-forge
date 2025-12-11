import api, { ApiResponse } from ".";

// Invitation interfaces
export interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  invitedBy: string;
}

export interface CreateInvitationData {
  email: string;
  role: string;
  expiresAt?: string;
}

// Invitation API functions
export const getInvitations = async (): Promise<ApiResponse<Invitation[]>> => {
  const response = await api.get<ApiResponse<Invitation[]>>("/invitations");
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to fetch invitations");
};

export const createInvitation = async (
  data: CreateInvitationData
): Promise<ApiResponse<Invitation>> => {
  const response = await api.post<ApiResponse<Invitation>>("/invitations", data);
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to create invitation");
};

export const revokeInvitation = async (
  invitationId: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/invitations/${invitationId}`
  );
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to revoke invitation");
};

export const resendInvitation = async (
  invitationId: string,
  expiresInDays?: number
): Promise<ApiResponse<Invitation>> => {
  const response = await api.post<ApiResponse<Invitation>>(
    `/invitations/${invitationId}/resend`,
    { expiresInDays }
  );
  if (response.data.success) {
    return response.data;
  }
  throw new Error(response.data.error?.message || "Failed to resend invitation");
};
