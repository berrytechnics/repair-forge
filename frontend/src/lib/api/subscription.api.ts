import api, { ApiResponse } from ".";

// Subscription interfaces
export interface Subscription {
  id: string;
  companyId: string;
  squareSubscriptionId?: string | null;
  status: string;
  monthlyAmount: number;
  billingDay: number;
  autopayEnabled: boolean;
  squareCustomerId?: string | null;
  squareCardId?: string | null;
  locationCount: number;
  freeLocationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  companyId: string;
  squarePaymentId?: string | null;
  amount: number;
  status: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  locationCount: number;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Subscription API functions
export const getSubscription = async (): Promise<
  ApiResponse<Subscription | { status: string; monthlyAmount: number; locationCount: number; freeLocationCount: number; autopayEnabled: boolean }>
> => {
  const response = await api.get<
    ApiResponse<
      Subscription | {
        status: string;
        monthlyAmount: number;
        locationCount: number;
        freeLocationCount: number;
        autopayEnabled: boolean;
      }
    >
  >("/subscriptions");

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch subscription"
  );
};

export const enableAutopay = async (
  cardToken: string
): Promise<ApiResponse<Subscription>> => {
  const response = await api.post<ApiResponse<Subscription>>(
    "/subscriptions/autopay",
    { cardToken }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to enable autopay"
  );
};

export const disableAutopay = async (): Promise<
  ApiResponse<{ message: string }>
> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    "/subscriptions/autopay"
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to disable autopay"
  );
};

export const getPaymentHistory = async (): Promise<
  ApiResponse<SubscriptionPayment[]>
> => {
  const response = await api.get<ApiResponse<SubscriptionPayment[]>>(
    "/subscriptions/payments"
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch payment history"
  );
};

export const toggleLocationFree = async (
  locationId: string,
  isFree: boolean
): Promise<ApiResponse<{ id: string; isFree: boolean }>> => {
  const response = await api.patch<ApiResponse<{ id: string; isFree: boolean }>>(
    `/locations/${locationId}/free`,
    { isFree }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to toggle location free status"
  );
};



