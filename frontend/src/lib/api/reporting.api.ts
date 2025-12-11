import api, { ApiResponse } from ".";

// Reporting interfaces
export interface DashboardStats {
  monthlyRevenue: number;
  lowStockCount: number;
  activeTickets: number;
  totalCustomers: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface PriorityDistribution {
  priority: string;
  count: number;
}

export interface RevenueByLocation {
  locationId: string | null;
  locationName: string;
  revenue: number;
}

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  ticketsCompleted: number;
  averageCompletionDays: number | null;
}

export interface InvoiceStatusBreakdown {
  status: string;
  count: number;
  totalAmount: number;
}

// Reporting API functions
export const getDashboardStats = async (
  locationId?: string | null,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<DashboardStats>> => {
  const params = new URLSearchParams();
  if (locationId !== undefined && locationId !== null) {
    params.append("locationId", locationId);
  }
  if (startDate) {
    params.append("startDate", startDate);
  }
  if (endDate) {
    params.append("endDate", endDate);
  }

  const url = params.toString()
    ? `/reporting/dashboard-stats?${params.toString()}`
    : "/reporting/dashboard-stats";

  const response = await api.get<ApiResponse<DashboardStats>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch dashboard stats"
  );
};

export const getRevenueOverTime = async (
  startDate: string,
  endDate: string,
  locationId?: string | null,
  groupBy: "day" | "week" | "month" = "day"
): Promise<ApiResponse<RevenueDataPoint[]>> => {
  const params = new URLSearchParams();
  params.append("startDate", startDate);
  params.append("endDate", endDate);
  params.append("groupBy", groupBy);
  if (locationId !== undefined && locationId !== null) {
    params.append("locationId", locationId);
  }

  const response = await api.get<ApiResponse<RevenueDataPoint[]>>(
    `/reporting/revenue-over-time?${params.toString()}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch revenue data"
  );
};

export const getTicketStatusDistribution = async (
  locationId?: string | null,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<StatusDistribution[]>> => {
  const params = new URLSearchParams();
  if (locationId !== undefined && locationId !== null) {
    params.append("locationId", locationId);
  }
  if (startDate) {
    params.append("startDate", startDate);
  }
  if (endDate) {
    params.append("endDate", endDate);
  }

  const url = params.toString()
    ? `/reporting/ticket-status-distribution?${params.toString()}`
    : "/reporting/ticket-status-distribution";

  const response = await api.get<ApiResponse<StatusDistribution[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch ticket status distribution"
  );
};

export const getTicketPriorityDistribution = async (
  locationId?: string | null,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<PriorityDistribution[]>> => {
  const params = new URLSearchParams();
  if (locationId !== undefined && locationId !== null) {
    params.append("locationId", locationId);
  }
  if (startDate) {
    params.append("startDate", startDate);
  }
  if (endDate) {
    params.append("endDate", endDate);
  }

  const url = params.toString()
    ? `/reporting/ticket-priority-distribution?${params.toString()}`
    : "/reporting/ticket-priority-distribution";

  const response = await api.get<ApiResponse<PriorityDistribution[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch ticket priority distribution"
  );
};

export const getRevenueByLocation = async (
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<RevenueByLocation[]>> => {
  const params = new URLSearchParams();
  if (startDate) {
    params.append("startDate", startDate);
  }
  if (endDate) {
    params.append("endDate", endDate);
  }

  const url = params.toString()
    ? `/reporting/revenue-by-location?${params.toString()}`
    : "/reporting/revenue-by-location";

  const response = await api.get<ApiResponse<RevenueByLocation[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch revenue by location"
  );
};

export const getTechnicianPerformance = async (
  locationId?: string | null,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<TechnicianPerformance[]>> => {
  const params = new URLSearchParams();
  if (locationId !== undefined && locationId !== null) {
    params.append("locationId", locationId);
  }
  if (startDate) {
    params.append("startDate", startDate);
  }
  if (endDate) {
    params.append("endDate", endDate);
  }

  const url = params.toString()
    ? `/reporting/technician-performance?${params.toString()}`
    : "/reporting/technician-performance";

  const response = await api.get<ApiResponse<TechnicianPerformance[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch technician performance"
  );
};

export const getInvoiceStatusBreakdown = async (
  locationId?: string | null,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<InvoiceStatusBreakdown[]>> => {
  const params = new URLSearchParams();
  if (locationId !== undefined && locationId !== null) {
    params.append("locationId", locationId);
  }
  if (startDate) {
    params.append("startDate", startDate);
  }
  if (endDate) {
    params.append("endDate", endDate);
  }

  const url = params.toString()
    ? `/reporting/invoice-status-breakdown?${params.toString()}`
    : "/reporting/invoice-status-breakdown";

  const response = await api.get<ApiResponse<InvoiceStatusBreakdown[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch invoice status breakdown"
  );
};
