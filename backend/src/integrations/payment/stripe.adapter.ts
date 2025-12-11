// src/integrations/payment/stripe.adapter.ts
import Stripe from 'stripe';
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
 * Stripe adapter for payment integration
 */
export class StripeAdapter {
  /**
   * Test Stripe API connection
   */
  async testConnection(config: PaymentIntegrationConfig): Promise<TestConnectionResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const apiKey = decryptedCredentials.apiKey;

      if (!apiKey) {
        return {
          success: false,
          error: 'API key is required',
        };
      }

      if (!apiKey.startsWith('sk_')) {
        return {
          success: false,
          error: 'Invalid Stripe API key format. Must start with sk_',
        };
      }

      const stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
      });

      // Test connection by retrieving account information
      await stripe.accounts.retrieve();

      return { success: true };
    } catch (error) {
      logger.error('Stripe connection test error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        return {
          success: false,
          error: `Stripe API error: ${error.message}`,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error testing connection',
      };
    }
  }

  /**
   * Process payment using Stripe
   */
  async processPayment(
    config: PaymentIntegrationConfig,
    paymentData: ProcessPaymentData
  ): Promise<ProcessPaymentResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const apiKey = decryptedCredentials.apiKey;

      if (!apiKey) {
        throw new Error('Stripe API key is required');
      }

      const stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
      });

      // Convert amount to cents (Stripe uses smallest currency unit)
      const amountCents = Math.round(paymentData.amount * 100);

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: paymentData.currency.toLowerCase(),
        payment_method: paymentData.paymentMethod, // In production, this would be from Stripe Elements
        confirm: true,
        description: paymentData.description || `Payment for invoice ${paymentData.invoiceId}`,
        metadata: {
          invoiceId: paymentData.invoiceId,
          customerId: paymentData.customerId,
          ...paymentData.metadata,
        },
      });

      if (!paymentIntent) {
        throw new Error('Payment intent creation failed');
      }

      // Determine status
      let status: 'succeeded' | 'pending' | 'failed' | 'canceled' = 'pending';
      if (paymentIntent.status === 'succeeded') {
        status = 'succeeded';
      } else if (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'canceled') {
        status = 'failed';
      } else if (paymentIntent.status === 'requires_confirmation' || paymentIntent.status === 'processing') {
        status = 'pending';
      }

      return {
        transactionId: paymentIntent.id,
        status,
        paymentMethod: paymentIntent.payment_method_types[0] || 'card',
        amount: paymentData.amount,
        currency: paymentData.currency,
        fee: paymentIntent.application_fee_amount
          ? Number(paymentIntent.application_fee_amount) / 100
          : undefined,
        metadata: {
          invoiceId: paymentData.invoiceId,
          customerId: paymentData.customerId,
        },
      };
    } catch (error) {
      logger.error('Stripe processPayment error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new Error(`Stripe payment failed: ${error.message}`);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing payment';
      throw new Error(`Stripe payment failed: ${errorMessage}`);
    }
  }

  /**
   * Refund payment using Stripe
   */
  async refundPayment(config: PaymentIntegrationConfig, refundData: RefundData): Promise<RefundResult> {
    try {
      const decryptedCredentials = decryptCredentials(config.credentials);
      const apiKey = decryptedCredentials.apiKey;

      if (!apiKey) {
        throw new Error('Stripe API key is required');
      }

      const stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
      });

      // Get payment intent to determine amount and currency
      await stripe.paymentIntents.retrieve(refundData.transactionId);

      const refundAmount = refundData.amount
        ? Math.round(refundData.amount * 100) // Convert to cents
        : undefined; // Full refund if amount not specified

      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: refundData.transactionId,
        amount: refundAmount,
        reason: refundData.reason ? (refundData.reason as Stripe.RefundCreateParams.Reason) : undefined,
        metadata: refundData.metadata,
      });

      if (!refund) {
        throw new Error('Refund creation failed');
      }

      return {
        refundId: refund.id,
        status: refund.status === 'succeeded' ? 'succeeded' : refund.status === 'pending' ? 'pending' : 'failed',
        amount: Number(refund.amount) / 100,
        currency: refund.currency.toUpperCase(),
        transactionId: refundData.transactionId,
      };
    } catch (error) {
      logger.error('Stripe refundPayment error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new Error(`Stripe refund failed: ${error.message}`);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing refund';
      throw new Error(`Stripe refund failed: ${errorMessage}`);
    }
  }
}

export default new StripeAdapter();
