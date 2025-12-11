import api, { ApiResponse } from '.';

export interface ProcessPaymentData {
  invoiceId: string;
  paymentMethod?: string;
  sourceId?: string; // Card nonce/token from payment provider SDK (required for Square)
  idempotencyKey?: string; // Optional idempotency key
  amount?: number;
}

export interface ProcessPaymentResponse {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
}

export interface RefundPaymentData {
  transactionId: string;
  amount?: number;
  reason?: string;
}

export interface RefundPaymentResponse {
  refundId: string;
  status: string;
  amount: number;
  currency: string;
  transactionId: string;
}

/**
 * Process payment for an invoice
 */
export const processPayment = async (
  data: ProcessPaymentData
): Promise<ApiResponse<ProcessPaymentResponse>> => {
  const response = await api.post<ApiResponse<ProcessPaymentResponse>>('/payments/process', data);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || 'Failed to process payment');
};

/**
 * Refund a payment
 */
export const refundPayment = async (
  data: RefundPaymentData
): Promise<ApiResponse<RefundPaymentResponse>> => {
  const response = await api.post<ApiResponse<RefundPaymentResponse>>('/payments/refund', data);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || 'Failed to refund payment');
};
