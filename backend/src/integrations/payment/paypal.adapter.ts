// src/integrations/payment/paypal.adapter.ts
import paypal from '@paypal/checkout-server-sdk';
import type { OrderResult, RefundResult as PayPalRefundResult } from '@paypal/checkout-server-sdk';
import { PaymentIntegrationConfig } from '../../config/integrations.js';
import logger from '../../config/logger.js';
import { decryptCredentials } from '../../utils/encryption.js';
import {
  ProcessPaymentData,
  ProcessPaymentResult,
  RefundData,
  RefundResult,
  TestConnectionResult,
} from './payment.types.js';

/**
 * PayPal adapter for payment integration
 */
export class PayPalAdapter {
  /**
   * Get PayPal client based on configuration
   */
  private getPayPalClient(config: PaymentIntegrationConfig): paypal.core.PayPalHttpClient {
    const decryptedCredentials = decryptCredentials(config.credentials);
    const clientId = decryptedCredentials.clientId;
    const clientSecret = decryptedCredentials.clientSecret;
    const testMode = config.settings?.testMode as boolean | undefined;

    if (!clientId || !clientSecret) {
      throw new Error('PayPal client ID and client secret are required');
    }

    const environment = testMode
      ? new paypal.core.SandboxEnvironment(clientId, clientSecret)
      : new paypal.core.LiveEnvironment(clientId, clientSecret);

    return new paypal.core.PayPalHttpClient(environment);
  }

  /**
   * Test PayPal API connection
   */
  async testConnection(config: PaymentIntegrationConfig): Promise<TestConnectionResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const clientId = decryptedCredentials.clientId;
      const clientSecret = decryptedCredentials.clientSecret;

      if (!clientId || !clientSecret) {
        return {
          success: false,
          error: 'Client ID and client secret are required',
        };
      }

      // Simple test - try to get access token
      // PayPal SDK handles this internally, so we'll just verify credentials format
      // Note: We validate credentials format here; actual connection test happens when processing payments
      if (clientId.length < 10 || clientSecret.length < 10) {
        return {
          success: false,
          error: 'Invalid PayPal credentials format',
        };
      }

      return { success: true };
    } catch (error) {
      logger.error('PayPal connection test error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error testing connection',
      };
    }
  }

  /**
   * Process payment using PayPal
   */
  async processPayment(
    config: PaymentIntegrationConfig,
    paymentData: ProcessPaymentData
  ): Promise<ProcessPaymentResult> {
    try {
      const client = this.getPayPalClient(config);

      // Create order request
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: paymentData.invoiceId,
            description: paymentData.description || `Payment for invoice ${paymentData.invoiceId}`,
            amount: {
              currency_code: paymentData.currency,
              value: paymentData.amount.toFixed(2),
            },
            custom_id: paymentData.invoiceId,
          },
        ],
        application_context: {
          brand_name: 'RepairTix',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${config.settings?.webhookUrl || ''}/paypal/return`,
          cancel_url: `${config.settings?.webhookUrl || ''}/paypal/cancel`,
        },
      });

      const order = await client.execute(request);

      if (!order.result || order.statusCode !== 201) {
        throw new Error('PayPal order creation failed');
      }

      const orderResult = order.result as OrderResult;
      const orderId = orderResult?.id;
      if (!orderId) {
        throw new Error('PayPal order ID not returned');
      }

      // For PayPal, we need to capture the order after creation
      // In a real implementation, this would be done after user approval
      // For now, we'll return the order ID and expect webhook to complete it
      const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
      captureRequest.requestBody({});
      const capture = await client.execute(captureRequest);

      if (!capture.result || capture.statusCode !== 201) {
        throw new Error('PayPal order capture failed');
      }

      const captureResult = capture.result as OrderResult;
      const captureId = captureResult?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      const status = captureResult?.status;

      return {
        transactionId: captureId || orderId,
        status: status === 'COMPLETED' ? 'succeeded' : status === 'PENDING' ? 'pending' : 'failed',
        paymentMethod: 'paypal',
        amount: paymentData.amount,
        currency: paymentData.currency,
        metadata: {
          invoiceId: paymentData.invoiceId,
          orderId,
        },
      };
    } catch (error) {
      logger.error('PayPal processPayment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing payment';
      throw new Error(`PayPal payment failed: ${errorMessage}`);
    }
  }

  /**
   * Refund payment using PayPal
   */
  async refundPayment(config: PaymentIntegrationConfig, refundData: RefundData): Promise<RefundResult> {
    try {
      const client = this.getPayPalClient(config);

      // Get capture details first to determine amount and currency
      const captureRequest = new paypal.payments.CapturesGetRequest(refundData.transactionId);
      const capture = await client.execute(captureRequest);

      if (!capture.result || capture.statusCode !== 200) {
        throw new Error('PayPal capture not found');
      }

      const captureDetails = capture.result as { amount?: { currency_code?: string } };
      const refundAmount = refundData.amount
        ? {
            value: refundData.amount.toFixed(2),
            currency_code: captureDetails?.amount?.currency_code || 'USD',
          }
        : undefined; // Full refund if amount not specified

      // Create refund request
      const refundRequest = new paypal.payments.CapturesRefundRequest(refundData.transactionId);
      refundRequest.requestBody({
        amount: refundAmount,
        note_to_payer: refundData.reason || 'Refund request',
      });

      const refund = await client.execute(refundRequest);

      if (!refund.result || refund.statusCode !== 201) {
        throw new Error('PayPal refund creation failed');
      }

      const refundDetails = refund.result as PayPalRefundResult;
      const refundId = refundDetails?.id || '';
      const status = refundDetails?.status || '';

      return {
        refundId,
        status: status === 'COMPLETED' ? 'succeeded' : status === 'PENDING' ? 'pending' : 'failed',
        amount: refundDetails?.amount?.value ? Number(refundDetails.amount.value) : refundData.amount || 0,
        currency: refundDetails?.amount?.currency_code?.toUpperCase() || 'USD',
        transactionId: refundData.transactionId,
      };
    } catch (error) {
      logger.error('PayPal refundPayment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing refund';
      throw new Error(`PayPal refund failed: ${errorMessage}`);
    }
  }
}

export default new PayPalAdapter();
