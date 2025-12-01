import { ApiResponse, api } from "./index";

export interface MaintenanceModeStatus {
  enabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Get maintenance mode status (public endpoint, no auth required)
 */
export async function getMaintenanceModePublic(): Promise<
  ApiResponse<MaintenanceModeStatus>
> {
  const response = await api.get<ApiResponse<MaintenanceModeStatus>>(
    "/system/maintenance/public"
  );

  if (response.data.success && response.data.data) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to get maintenance mode status"
  );
}

/**
 * Get maintenance mode status (requires superuser auth)
 */
export async function getMaintenanceMode(): Promise<
  ApiResponse<MaintenanceModeStatus>
> {
  const response = await api.get<ApiResponse<MaintenanceModeStatus>>(
    "/system/maintenance"
  );

  if (response.data.success && response.data.data) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to get maintenance mode status"
  );
}

/**
 * Set maintenance mode status
 */
export async function setMaintenanceMode(
  enabled: boolean
): Promise<ApiResponse<MaintenanceModeStatus>> {
  const response = await api.post<ApiResponse<MaintenanceModeStatus>>(
    "/system/maintenance",
    { enabled }
  );

  if (response.data.success && response.data.data) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to set maintenance mode"
  );
}

