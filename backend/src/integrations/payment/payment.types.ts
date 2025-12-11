/**
 * Common payment types and interfaces
 */

export type PaymentMethodType = 'online' | 'terminal'; // online = web payments, terminal = in-person tap/swipe/chip

export interface ProcessPaymentData {
  amount: number;
  currency: string;
  invoiceId: string;
  customerId: string;
  paymentMethod?: string;
  sourceId?: string; // Card nonce/token from payment provider SDK (required for Square online payments)
  idempotencyKey?: string; // Optional idempotency key (will be generated if not provided)
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodType?: PaymentMethodType; // Defaults to 'online' if not specified
  deviceId?: string; // Square Terminal device ID (required for terminal payments)
}

export interface ProcessPaymentResult {
  transactionId: string;
  status: 'succeeded' | 'pending' | 'failed' | 'canceled';
  paymentMethod: string;
  amount: number;
  currency: string;
  fee?: number;
  metadata?: Record<string, string>;
  error?: string;
}

export interface RefundData {
  transactionId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
  metadata?: Record<string, string>;
}

export interface RefundResult {
  refundId: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
  currency: string;
  transactionId: string;
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
}

/**
 * Terminal checkout result for in-person payments
 * Used when creating a checkout that will be processed on a Square Terminal device
 */
export interface CreateTerminalCheckoutResult {
  checkoutId: string;
  status: 'pending' | 'completed' | 'canceled' | 'failed';
  deviceId?: string;
  expiresAt?: string;
  paymentUrl?: string; // URL to display QR code or payment instructions
}

/**
 * Data required to create a terminal checkout
 */
export interface CreateTerminalCheckoutData {
  amount: number;
  currency: string;
  invoiceId: string;
  customerId: string;
  deviceId: string; // Square Terminal device ID
  description?: string;
  metadata?: Record<string, string>;
}

/**
 * Subscription-related types
 */
export interface CreateCustomerData {
  email: string;
  givenName?: string;
  familyName?: string;
  companyName?: string;
  phoneNumber?: string;
}

export interface CreateCustomerResult {
  customerId: string;
  email: string;
}

export interface CreateSubscriptionData {
  customerId: string;
  cardId: string; // Square card ID from saved card
  planId: string; // Square subscription plan ID
  locationId: string; // Square location ID
  idempotencyKey: string;
  startDate?: string; // ISO date string
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  status: string;
  planId: string;
  customerId: string;
}

export interface UpdateSubscriptionData {
  subscriptionId: string;
  planId?: string;
  cardId?: string;
}

export interface SubscriptionStatusResult {
  subscriptionId: string;
  status: string;
  planId: string;
  customerId: string;
  currentPhase?: {
    startDate: string;
    endDate?: string;
  };
}
