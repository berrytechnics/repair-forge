import { ApiResponse } from "./index";
import api from "./index";
import { Location } from "./location.api";

export interface Company {
  id: string;
  name: string;
  subdomain: string | null;
  plan: string;
  status: string;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
  error?: { message: string };
}

/**
 * Get all companies with pagination and search (superuser only)
 */
export const getCompanies = async (
  page: number = 1,
  limit: number = 50,
  search?: string
): Promise<PaginatedResponse<Company>> => {
  const params: Record<string, string | number> = { page, limit };
  if (search) {
    params.search = search;
  }

  const response = await api.get<PaginatedResponse<Company>>("/companies", {
    params,
  });

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch companies"
  );
};

/**
 * Get company by ID (superuser only)
 */
export const getCompany = async (id: string): Promise<ApiResponse<Company>> => {
  const response = await api.get<ApiResponse<Company>>(`/companies/${id}`);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch company"
  );
};

/**
 * Get all locations for a company (superuser only)
 */
export const getCompanyLocations = async (companyId: string): Promise<ApiResponse<Location[]>> => {
  const response = await api.get<ApiResponse<Location[]>>(`/companies/${companyId}/locations`);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch company locations"
  );
};

/**
 * Toggle free status for a location in a company (superuser only)
 */
export const toggleLocationFreeStatus = async (
  companyId: string,
  locationId: string,
  isFree: boolean
): Promise<ApiResponse<Location>> => {
  const response = await api.patch<ApiResponse<Location>>(
    `/companies/${companyId}/locations/${locationId}/free`,
    { isFree }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to toggle location free status"
  );
};
