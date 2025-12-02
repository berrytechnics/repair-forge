// src/integrations/payment/square.adapter.ts
import { SquareClient, SquareEnvironment } from 'square';
import { PaymentIntegrationConfig } from '../../config/integrations.js';
import logger from '../../config/logger.js';
import { decryptCredentials } from '../../utils/encryption.js';
import {
  ProcessPaymentData,
  ProcessPaymentResult,
  RefundData,
  RefundResult,
  TestConnectionResult,
  CreateTerminalCheckoutData,
  CreateTerminalCheckoutResult,
  CreateCustomerData,
  CreateCustomerResult,
  CreateSubscriptionData,
  CreateSubscriptionResult,
  UpdateSubscriptionData,
  SubscriptionStatusResult,
} from './payment.types.js';

// Type definitions for Square API responses
interface SquareMerchant {
  id?: string;
  [key: string]: unknown;
}

interface SquareLocation {
  id?: string;
  [key: string]: unknown;
}

interface SquareMerchantResponse {
  body?: {
    merchants?: SquareMerchant[];
  };
  merchants?: SquareMerchant[];
}

interface SquareLocationResponse {
  body?: {
    locations?: SquareLocation[];
  };
  locations?: SquareLocation[];
}

interface SquareError {
  detail?: string;
  message?: string;
  code?: string;
}

interface SquareErrorResponse {
  response?: {
    data?: {
      errors?: SquareError[];
    };
  };
  body?: {
    errors?: SquareError[];
  };
}

interface SquarePayment {
  id?: string;
  status?: string;
  sourceType?: string;
  processingFee?: {
    amountMoney?: {
      amount?: bigint | string | number;
    };
  };
  totalMoney?: {
    amount?: bigint | string | number;
    currency?: string;
  };
}

interface SquarePaymentResponse {
  body?: {
    payment?: SquarePayment;
  };
  payment?: SquarePayment;
}

interface SquareRefund {
  id?: string;
  status?: string;
  amountMoney?: {
    amount?: bigint | string | number;
    currency?: string;
  };
}

interface SquareRefundResponse {
  body?: {
    refund?: SquareRefund;
  };
  refund?: SquareRefund;
}

interface SquareTerminalCheckout {
  id?: string;
  status?: string;
  deviceId?: string;
  deadlineDuration?: string;
  paymentIds?: string[];
}

interface SquareTerminalCheckoutResponse {
  body?: {
    checkout?: SquareTerminalCheckout;
  };
  checkout?: SquareTerminalCheckout;
}

/**
 * Square adapter for payment integration
 */
export class SquareAdapter {
  /**
   * Test Square API connection
   */
  async testConnection(config: PaymentIntegrationConfig): Promise<TestConnectionResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials || {});
      const accessToken = decryptedCredentials.accessToken;
      const _applicationId = decryptedCredentials.applicationId;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken) {
        return {
          success: false,
          error: 'Access token is required',
        };
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      // Test connection by retrieving merchant information
      // This is the simplest endpoint that validates the access token
      // It requires MERCHANT_PROFILE_READ scope which is standard for all Square apps
      try {
        const merchantResponse = await client.merchants.list() as unknown as SquareMerchantResponse;
        const merchants = merchantResponse.body?.merchants || merchantResponse.merchants;
        
        if (merchants && Array.isArray(merchants) && merchants.length > 0) {
          return { success: true };
        }
      } catch (merchantError) {
        // If merchants.list fails, try locations.list as fallback
        logger.warn('Merchants API failed, trying Locations API:', merchantError);
        const locationsResponse = await client.locations.list() as unknown as SquareLocationResponse;
        const locations = locationsResponse.body?.locations || locationsResponse.locations;
        
        if (locations && Array.isArray(locations) && locations.length > 0) {
          return { success: true };
        }
        // Both failed, throw the more descriptive error
        throw merchantError;
      }

      return {
        success: false,
        error: 'Failed to retrieve merchant or location information. Please verify your access token has the correct permissions.',
      };
    } catch (error: unknown) {
      logger.error('Square connection test error:', error);
      
      // Extract detailed error message from Square API response
      let errorMessage = 'Unknown error testing connection';
      const squareError = error as SquareErrorResponse;
      
      if (squareError?.response?.data?.errors && Array.isArray(squareError.response.data.errors)) {
        const squareErrors = squareError.response.data.errors;
        errorMessage = squareErrors.map((e) => e.detail || e.message || e.code).join('; ') || errorMessage;
      } else if (squareError?.body?.errors && Array.isArray(squareError.body.errors)) {
        const squareErrors = squareError.body.errors;
        errorMessage = squareErrors.map((e) => e.detail || e.message || e.code).join('; ') || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Provide helpful guidance for authorization errors
      if (errorMessage.toLowerCase().includes('authorized') || errorMessage.toLowerCase().includes('unauthorized')) {
        errorMessage += ' Please ensure your Square access token has the required OAuth scopes: MERCHANT_PROFILE_READ, PAYMENTS_READ, and PAYMENTS_WRITE. Check your Square Developer Dashboard to verify token permissions.';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Process payment using Square
   */
  async processPayment(
    config: PaymentIntegrationConfig,
    paymentData: ProcessPaymentData
  ): Promise<ProcessPaymentResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const accessToken = decryptedCredentials.accessToken;
      const applicationId = decryptedCredentials.applicationId;
      const locationId = decryptedCredentials.locationId;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken || !applicationId || !locationId) {
        throw new Error('Square credentials incomplete: accessToken, applicationId, and locationId are required');
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      // Check payment method type
      const paymentMethodType = paymentData.paymentMethodType || 'online';

      // For online payments, Square requires a card nonce (sourceId) from Square Web Payments SDK
      if (paymentMethodType === 'online' && !paymentData.sourceId) {
        throw new Error(
          'Square requires a card nonce (sourceId) from Square Web Payments SDK for online payments. ' +
          'Please integrate Square\'s Web Payments SDK on the frontend to tokenize card data. ' +
          'For testing in sandbox, you can use Square\'s test card nonces. ' +
          'For in-person payments, use paymentMethodType: "terminal" with a deviceId.'
        );
      }

      // For terminal payments, create a terminal checkout and return pending status
      if (paymentMethodType === 'terminal') {
        if (!paymentData.deviceId) {
          throw new Error('Device ID is required for terminal payments');
        }
        
        const checkoutResult = await this.createTerminalCheckout(config, {
          amount: paymentData.amount,
          currency: paymentData.currency,
          invoiceId: paymentData.invoiceId,
          customerId: paymentData.customerId,
          deviceId: paymentData.deviceId,
          description: paymentData.description,
          metadata: paymentData.metadata,
        });

        // Return as ProcessPaymentResult with pending status
        return {
          transactionId: checkoutResult.checkoutId,
          status: checkoutResult.status === 'completed' ? 'succeeded' : 'pending',
          paymentMethod: 'terminal',
          amount: paymentData.amount,
          currency: paymentData.currency,
          metadata: {
            ...paymentData.metadata,
            checkoutId: checkoutResult.checkoutId,
            deviceId: checkoutResult.deviceId || '',
            invoiceId: paymentData.invoiceId,
          },
        };
      }

      // Convert amount to cents (Square uses smallest currency unit)
      const amountCents = Math.round(paymentData.amount * 100);

      // Generate idempotency key (Square limit: 45 characters)
      // Use provided idempotency key or generate one
      let idempotencyKey = paymentData.idempotencyKey;
      if (!idempotencyKey) {
        const invoiceIdShort = paymentData.invoiceId.substring(0, 8);
        const timestamp = Date.now().toString();
        idempotencyKey = `${invoiceIdShort}-${timestamp}`.substring(0, 45);
      } else {
        // Ensure provided key is within limit
        idempotencyKey = idempotencyKey.substring(0, 45);
      }

      // Create payment request
      const response = await client.payments.create({
        sourceId: paymentData.sourceId!, // Card nonce from Square Web Payments SDK (already validated above)
        idempotencyKey,
        amountMoney: {
          amount: BigInt(amountCents),
          // Square SDK requires specific currency types, but we validate at runtime
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currency: paymentData.currency as any,
        },
        locationId,
        referenceId: paymentData.invoiceId,
        note: paymentData.description || `Payment for invoice ${paymentData.invoiceId}`,
      });

      const paymentResponse = response as unknown as SquarePaymentResponse;
      const payment = paymentResponse.body?.payment || paymentResponse.payment;
      
      if (!payment) {
        throw new Error('Payment creation failed: No payment returned');
      }

      return {
        transactionId: payment.id || '',
        status: payment.status === 'COMPLETED' ? 'succeeded' : payment.status === 'PENDING' ? 'pending' : 'failed',
        paymentMethod: payment.sourceType || 'card',
        amount: paymentData.amount,
        currency: paymentData.currency,
        fee: payment.processingFee ? Number(payment.processingFee.amountMoney?.amount || 0) / 100 : undefined,
        metadata: {
          invoiceId: paymentData.invoiceId,
          locationId,
        },
      };
    } catch (error) {
      logger.error('Square processPayment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing payment';
      throw new Error(`Square payment failed: ${errorMessage}`);
    }
  }

  /**
   * Refund payment using Square
   */
  async refundPayment(
    config: PaymentIntegrationConfig,
    refundData: RefundData
  ): Promise<RefundResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const accessToken = decryptedCredentials.accessToken;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken) {
        throw new Error('Square access token is required');
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      // Get payment details first to determine amount
      const paymentResponse = await client.payments.get({
        paymentId: refundData.transactionId,
      });

      const paymentData = paymentResponse as unknown as SquarePaymentResponse;
      const payment = paymentData.body?.payment || paymentData.payment;
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      const totalAmount = payment.totalMoney?.amount ? Number(payment.totalMoney.amount) : 0;
      const refundAmount = refundData.amount
        ? Math.round(refundData.amount * 100) // Convert to cents
        : totalAmount; // Full refund if amount not specified

      // Generate idempotency key for refund (Square limit: 45 characters)
      // Use first 8 chars of transactionId + timestamp
      const transactionIdShort = refundData.transactionId.substring(0, 8);
      const refundTimestamp = Date.now().toString();
      const refundIdempotencyKey = `rf-${transactionIdShort}-${refundTimestamp}`.substring(0, 45);

      // Create refund
      const refundResponse = await client.refunds.refundPayment({
        idempotencyKey: refundIdempotencyKey,
        paymentId: refundData.transactionId,
        amountMoney: {
          amount: BigInt(refundAmount),
          // Square SDK requires specific currency types, but we validate at runtime
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currency: (payment.totalMoney?.currency || 'USD') as any,
        },
        reason: refundData.reason || 'Customer request',
      });

      const refundDataResponse = refundResponse as unknown as SquareRefundResponse;
      const refund = refundDataResponse.body?.refund || refundDataResponse.refund;
      
      if (!refund) {
        throw new Error('Refund creation failed: No refund returned');
      }

      return {
        refundId: refund.id || '',
        status: refund.status === 'COMPLETED' ? 'succeeded' : refund.status === 'PENDING' ? 'pending' : 'failed',
        amount: Number(refund.amountMoney?.amount || 0) / 100,
        currency: refund.amountMoney?.currency || 'USD',
        transactionId: refundData.transactionId,
      };
    } catch (error) {
      logger.error('Square refundPayment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing refund';
      throw new Error(`Square refund failed: ${errorMessage}`);
    }
  }

  /**
   * Create a terminal checkout for in-person payments (tap, chip, swipe)
   * This creates a checkout that will be displayed on a Square Terminal device
   */
  async createTerminalCheckout(
    config: PaymentIntegrationConfig,
    checkoutData: CreateTerminalCheckoutData
  ): Promise<CreateTerminalCheckoutResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const accessToken = decryptedCredentials.accessToken;
      const locationId = decryptedCredentials.locationId;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken || !locationId) {
        throw new Error('Square credentials incomplete: accessToken and locationId are required');
      }

      if (!checkoutData.deviceId) {
        throw new Error('Device ID is required for terminal checkout');
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      // Convert amount to cents (Square uses smallest currency unit)
      const amountCents = Math.round(checkoutData.amount * 100);

      // Generate idempotency key (Square limit: 45 characters)
      const invoiceIdShort = checkoutData.invoiceId.substring(0, 8);
      const timestamp = Date.now().toString();
      const idempotencyKey = `term-${invoiceIdShort}-${timestamp}`.substring(0, 45);

      // Create terminal checkout
      // Type assertion needed as Square SDK types may not be fully up to date
      const terminalClient = client.terminal as unknown as {
        createTerminalCheckout: (params: {
          idempotencyKey: string;
          checkout: {
            amountMoney: { amount: bigint; currency: string };
            referenceId: string;
            note: string;
            deviceOptions: {
              deviceId: string;
              skipReceiptScreen: boolean;
              tipSettings: { allowTipping: boolean };
            };
          };
        }) => Promise<unknown>;
      };
      const response = await terminalClient.createTerminalCheckout({
        idempotencyKey,
        checkout: {
          amountMoney: {
            amount: BigInt(amountCents),
            // Square SDK requires specific currency types, but we validate at runtime
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            currency: checkoutData.currency as any,
          },
          referenceId: checkoutData.invoiceId,
          note: checkoutData.description || `Payment for invoice ${checkoutData.invoiceId}`,
          deviceOptions: {
            deviceId: checkoutData.deviceId,
            skipReceiptScreen: false,
            tipSettings: {
              allowTipping: false,
            },
          },
        },
      });

      const checkoutResponse = response as unknown as SquareTerminalCheckoutResponse;
      const checkout = checkoutResponse.body?.checkout || checkoutResponse.checkout;

      if (!checkout || !checkout.id) {
        throw new Error('Terminal checkout creation failed: No checkout returned');
      }

      // Map Square status to our status
      let status: 'pending' | 'completed' | 'canceled' | 'failed' = 'pending';
      if (checkout.status === 'COMPLETED') {
        status = 'completed';
      } else if (checkout.status === 'CANCELED') {
        status = 'canceled';
      } else if (checkout.status === 'FAILED') {
        status = 'failed';
      }

      return {
        checkoutId: checkout.id,
        status,
        deviceId: checkout.deviceId,
        expiresAt: checkout.deadlineDuration ? new Date(Date.now() + parseInt(checkout.deadlineDuration)).toISOString() : undefined,
      };
    } catch (error) {
      logger.error('Square createTerminalCheckout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating terminal checkout';
      throw new Error(`Square terminal checkout failed: ${errorMessage}`);
    }
  }

  /**
   * Get terminal checkout status
   */
  async getTerminalCheckoutStatus(
    config: PaymentIntegrationConfig,
    checkoutId: string
  ): Promise<CreateTerminalCheckoutResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const accessToken = decryptedCredentials.accessToken;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken) {
        throw new Error('Square access token is required');
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      // Type assertion needed as Square SDK types may not be fully up to date
      const terminalClient = client.terminal as unknown as {
        getTerminalCheckout: (params: { checkoutId: string }) => Promise<unknown>;
      };
      const response = await terminalClient.getTerminalCheckout({
        checkoutId,
      });

      const checkoutResponse = response as unknown as SquareTerminalCheckoutResponse;
      const checkout = checkoutResponse.body?.checkout || checkoutResponse.checkout;

      if (!checkout) {
        throw new Error('Terminal checkout not found');
      }

      // Map Square status to our status
      let status: 'pending' | 'completed' | 'canceled' | 'failed' = 'pending';
      if (checkout.status === 'COMPLETED') {
        status = 'completed';
      } else if (checkout.status === 'CANCELED') {
        status = 'canceled';
      } else if (checkout.status === 'FAILED') {
        status = 'failed';
      }

      return {
        checkoutId: checkout.id || checkoutId,
        status,
        deviceId: checkout.deviceId || undefined,
        expiresAt: checkout.deadlineDuration ? new Date(Date.now() + parseInt(checkout.deadlineDuration)).toISOString() : undefined,
      };
    } catch (error) {
      logger.error('Square getTerminalCheckoutStatus error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error getting terminal checkout status';
      throw new Error(`Square terminal checkout status failed: ${errorMessage}`);
    }
  }

  /**
   * Create a Square customer
   */
  async createCustomer(
    config: PaymentIntegrationConfig,
    customerData: CreateCustomerData
  ): Promise<CreateCustomerResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const accessToken = decryptedCredentials.accessToken;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken) {
        throw new Error('Square access token is required');
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      // Square SDK types may not be fully up to date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (client.customers as any).createCustomer({
        givenName: customerData.givenName,
        familyName: customerData.familyName,
        companyName: customerData.companyName,
        emailAddress: customerData.email,
        phoneNumber: customerData.phoneNumber,
      });

      const customer = (response as unknown as { body?: { customer?: { id?: string; emailAddress?: string } } }).body?.customer;

      if (!customer || !customer.id) {
        throw new Error('Failed to create customer: No customer returned');
      }

      return {
        customerId: customer.id,
        email: customer.emailAddress || customerData.email,
      };
    } catch (error) {
      logger.error('Square createCustomer error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating customer';
      throw new Error(`Square customer creation failed: ${errorMessage}`);
    }
  }

  /**
   * Create a Square subscription
   */
  async createSubscription(
    config: PaymentIntegrationConfig,
    subscriptionData: CreateSubscriptionData
  ): Promise<CreateSubscriptionResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const accessToken = decryptedCredentials.accessToken;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken) {
        throw new Error('Square access token is required');
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      // Square SDK types may not be fully up to date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (client.subscriptions as any).createSubscription({
        idempotencyKey: subscriptionData.idempotencyKey,
        locationId: subscriptionData.locationId,
        planId: subscriptionData.planId,
        customerId: subscriptionData.customerId,
        cardId: subscriptionData.cardId,
        startDate: subscriptionData.startDate,
      });

      const subscription = (response as unknown as { 
        body?: { 
          subscription?: { 
            id?: string; 
            status?: string; 
            planId?: string; 
            customerId?: string;
          } 
        } 
      }).body?.subscription;

      if (!subscription || !subscription.id) {
        throw new Error('Failed to create subscription: No subscription returned');
      }

      return {
        subscriptionId: subscription.id,
        status: subscription.status || 'PENDING',
        planId: subscription.planId || subscriptionData.planId,
        customerId: subscription.customerId || subscriptionData.customerId,
      };
    } catch (error) {
      logger.error('Square createSubscription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating subscription';
      throw new Error(`Square subscription creation failed: ${errorMessage}`);
    }
  }

  /**
   * Update a Square subscription
   */
  async updateSubscription(
    config: PaymentIntegrationConfig,
    subscriptionData: UpdateSubscriptionData
  ): Promise<CreateSubscriptionResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const accessToken = decryptedCredentials.accessToken;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken) {
        throw new Error('Square access token is required');
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      const updateData: Record<string, unknown> = {};
      if (subscriptionData.planId) {
        updateData.planId = subscriptionData.planId;
      }
      if (subscriptionData.cardId) {
        updateData.cardId = subscriptionData.cardId;
      }

      // Square SDK types may not be fully up to date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (client.subscriptions as any).updateSubscription({
        subscriptionId: subscriptionData.subscriptionId,
        ...updateData,
      });

      const subscription = (response as unknown as { 
        body?: { 
          subscription?: { 
            id?: string; 
            status?: string; 
            planId?: string; 
            customerId?: string;
          } 
        } 
      }).body?.subscription;

      if (!subscription || !subscription.id) {
        throw new Error('Failed to update subscription: No subscription returned');
      }

      return {
        subscriptionId: subscription.id,
        status: subscription.status || 'ACTIVE',
        planId: subscription.planId || '',
        customerId: subscription.customerId || '',
      };
    } catch (error) {
      logger.error('Square updateSubscription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error updating subscription';
      throw new Error(`Square subscription update failed: ${errorMessage}`);
    }
  }

  /**
   * Cancel a Square subscription
   */
  async cancelSubscription(
    config: PaymentIntegrationConfig,
    subscriptionId: string
  ): Promise<void> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const accessToken = decryptedCredentials.accessToken;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken) {
        throw new Error('Square access token is required');
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      // Square SDK types may not be fully up to date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.subscriptions as any).cancelSubscription({
        subscriptionId,
      });
    } catch (error) {
      logger.error('Square cancelSubscription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error canceling subscription';
      throw new Error(`Square subscription cancellation failed: ${errorMessage}`);
    }
  }

  /**
   * Get Square subscription status
   */
  async getSubscriptionStatus(
    config: PaymentIntegrationConfig,
    subscriptionId: string
  ): Promise<SubscriptionStatusResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const accessToken = decryptedCredentials.accessToken;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken) {
        throw new Error('Square access token is required');
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      // Square SDK types may not be fully up to date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (client.subscriptions as any).retrieveSubscription({
        subscriptionId,
      });

      const subscription = (response as unknown as { 
        body?: { 
          subscription?: { 
            id?: string; 
            status?: string; 
            planId?: string; 
            customerId?: string;
            phases?: Array<{
              startDate?: string;
              endDate?: string;
            }>;
          } 
        } 
      }).body?.subscription;

      if (!subscription || !subscription.id) {
        throw new Error('Subscription not found');
      }

      return {
        subscriptionId: subscription.id,
        status: subscription.status || 'UNKNOWN',
        planId: subscription.planId || '',
        customerId: subscription.customerId || '',
        currentPhase: subscription.phases && subscription.phases.length > 0 ? {
          startDate: subscription.phases[0].startDate || '',
          endDate: subscription.phases[0].endDate,
        } : undefined,
      };
    } catch (error) {
      logger.error('Square getSubscriptionStatus error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error getting subscription status';
      throw new Error(`Square subscription status failed: ${errorMessage}`);
    }
  }

  /**
   * Save a card for a customer (for autopay)
   */
  async saveCardForCustomer(
    config: PaymentIntegrationConfig,
    customerId: string,
    cardToken: string // Card nonce from Square Web Payments SDK
  ): Promise<{ cardId: string }> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const accessToken = decryptedCredentials.accessToken;
      const locationId = decryptedCredentials.locationId;
      const testMode = config.settings?.testMode as boolean | undefined;

      if (!accessToken || !locationId) {
        throw new Error('Square credentials incomplete: accessToken and locationId are required');
      }

      const environment = testMode ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
      const client = new SquareClient({
        token: accessToken,
        environment: environment,
      });

      // Create a card from the token
      // Square SDK types may not be fully up to date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (client.cards as any).createCard({
        sourceId: cardToken,
        card: {
          customerId,
        },
      });

      const card = (response as unknown as { 
        body?: { 
          card?: { 
            id?: string;
          } 
        } 
      }).body?.card;

      if (!card || !card.id) {
        throw new Error('Failed to save card: No card returned');
      }

      return {
        cardId: card.id,
      };
    } catch (error) {
      logger.error('Square saveCardForCustomer error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error saving card';
      throw new Error(`Square card save failed: ${errorMessage}`);
    }
  }
}

export default new SquareAdapter();

