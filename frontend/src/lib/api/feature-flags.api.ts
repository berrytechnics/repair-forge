import { ApiResponse, api } from "./index";

export interface PosFeatureFlagStatus {
  enabled: boolean;
}

/**
 * Get POS feature flag status (admin only)
 */
export async function getPosEnabled(): Promise<ApiResponse<PosFeatureFlagStatus>> {
  const response = await api.get<ApiResponse<PosFeatureFlagStatus>>(
    "/feature-flags/pos"
  );

  if (response.data.success && response.data.data) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to get POS feature flag status"
  );
}

/**
 * Set POS feature flag status (admin only)
 */
export async function setPosEnabled(
  enabled: boolean
): Promise<ApiResponse<PosFeatureFlagStatus>> {
  const response = await api.post<ApiResponse<PosFeatureFlagStatus>>(
    "/feature-flags/pos",
    { enabled }
  );

  if (response.data.success && response.data.data) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to set POS feature flag status"
  );
}

