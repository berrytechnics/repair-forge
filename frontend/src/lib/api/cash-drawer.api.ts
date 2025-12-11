import api, { ApiResponse } from ".";

export interface CashDrawerSession {
  id: string;
  companyId: string;
  locationId: string | null;
  userId: string;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  variance: number | null;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpenDrawerData {
  openingAmount: number;
  locationId?: string | null;
}

export interface CloseDrawerData {
  closingAmount: number;
  notes?: string | null;
}

/**
 * Open a cash drawer session
 */
export const openDrawer = async (
  data: OpenDrawerData
): Promise<ApiResponse<CashDrawerSession>> => {
  const response = await api.post<ApiResponse<CashDrawerSession>>(
    "/cash-drawer/open",
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to open cash drawer"
  );
};

/**
 * Close a cash drawer session
 */
export const closeDrawer = async (
  sessionId: string,
  data: CloseDrawerData
): Promise<ApiResponse<CashDrawerSession>> => {
  const response = await api.post<ApiResponse<CashDrawerSession>>(
    `/cash-drawer/${sessionId}/close`,
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to close cash drawer"
  );
};

/**
 * Get current open drawer session
 */
export const getCurrentDrawer = async (): Promise<
  ApiResponse<CashDrawerSession | null>
> => {
  const response = await api.get<ApiResponse<CashDrawerSession | null>>(
    "/cash-drawer/current"
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to get current drawer"
  );
};

/**
 * Get drawer session history
 */
export const getDrawerHistory = async (filters?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<CashDrawerSession[]>> => {
  const params = new URLSearchParams();
  if (filters?.startDate) params.append("startDate", filters.startDate);
  if (filters?.endDate) params.append("endDate", filters.endDate);
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  const response = await api.get<ApiResponse<CashDrawerSession[]>>(
    `/cash-drawer/history?${params.toString()}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to get drawer history"
  );
};

/**
 * Get specific drawer session
 */
export const getDrawerSession = async (
  sessionId: string
): Promise<ApiResponse<CashDrawerSession>> => {
  const response = await api.get<ApiResponse<CashDrawerSession>>(
    `/cash-drawer/${sessionId}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to get drawer session"
  );
};
