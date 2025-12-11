import api, { ApiResponse } from ".";

// Asset interfaces
export interface Asset {
  id: string;
  customerId: string;
  deviceType: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetData {
  customerId: string;
  deviceType: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  notes?: string;
}

export interface UpdateAssetData {
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  notes?: string;
}

// Asset API functions
export const getAssets = async (
  customerId?: string
): Promise<ApiResponse<Asset[]>> => {
  const url = customerId
    ? `/assets?customerId=${encodeURIComponent(customerId)}`
    : "/assets";
  const response = await api.get<ApiResponse<Asset[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch assets");
};

export const getAssetById = async (
  id: string
): Promise<ApiResponse<Asset>> => {
  const response = await api.get<ApiResponse<Asset>>(`/assets/${id}`);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch asset");
};

export const getAssetsByCustomer = async (
  customerId: string
): Promise<ApiResponse<Asset[]>> => {
  const response = await api.get<ApiResponse<Asset[]>>(
    `/customers/${customerId}/assets`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch customer assets"
  );
};

export const createAsset = async (
  assetData: CreateAssetData
): Promise<ApiResponse<Asset>> => {
  const response = await api.post<ApiResponse<Asset>>("/assets", assetData);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to create asset");
};

export const updateAsset = async (
  id: string,
  assetData: UpdateAssetData
): Promise<ApiResponse<Asset>> => {
  const response = await api.put<ApiResponse<Asset>>(
    `/assets/${id}`,
    assetData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to update asset");
};

export const deleteAsset = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/assets/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to delete asset");
};
