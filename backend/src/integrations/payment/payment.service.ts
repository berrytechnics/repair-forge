// src/integrations/payment/payment.service.ts
import credentialService from '../../services/credential.service.js';
import companyService from '../../services/company.service.js';
import squareAdapter from './square.adapter.js';
import { PaymentIntegrationConfig } from '../../config/integrations.js';
import logger from '../../config/logger.js';
import {
  ProcessPaymentData,
  ProcessPaymentResult,
  RefundData,
  RefundResult,
  CreateTerminalCheckoutData,
  CreateTerminalCheckoutResult,
} from './payment.types.js';

/**
 * High-level payment service for processing payments
 * Handles integration configuration and routes to appropriate adapters
 */
export class PaymentService {
  /**
   * Check if payment integration is configured and enabled
   */
  async isPaymentConfigured(companyId: string): Promise<boolean> {
    try {
      const integration = await credentialService.getIntegration(companyId, 'payment');
      return integration !== null && integration.enabled === true;
    } catch (error) {
      logger.error('Error checking payment configuration:', error);
      return false;
    }
  }

  /**
   * Get payment integration config
   */
  private async getPaymentConfig(companyId: string): Promise<PaymentIntegrationConfig | null> {
    const integration = await credentialService.getIntegration(companyId, 'payment');
    if (!integration || integration.type !== 'payment') {
      return null;
    }
    return integration as PaymentIntegrationConfig;
  }

  /**
   * Process payment using configured provider
   */
  async processPayment(
    companyId: string,
    paymentData: ProcessPaymentData
  ): Promise<ProcessPaymentResult> {
    const config = await this.getPaymentConfig(companyId);
    if (!config) {
      throw new Error('Payment integration not configured');
    }

    if (!config.enabled) {
      throw new Error('Payment integration is disabled');
    }

    // Route to appropriate adapter based on provider
    if (config.provider === 'square') {
      return await squareAdapter.processPayment(config, paymentData);
    }
    throw new Error(`Payment provider ${config.provider} is not supported`);
  }

  /**
   * Refund payment using configured provider
   */
  async refundPayment(companyId: string, refundData: RefundData): Promise<RefundResult> {
    const config = await this.getPaymentConfig(companyId);
    if (!config) {
      throw new Error('Payment integration not configured');
    }

    if (!config.enabled) {
      throw new Error('Payment integration is disabled');
    }

    // Route to appropriate adapter based on provider
    if (config.provider === 'square') {
      return await squareAdapter.refundPayment(config, refundData);
    }
    throw new Error(`Payment provider ${config.provider} is not supported`);
  }

  /**
   * Get currency from company settings (defaults to USD)
   */
  async getCurrency(companyId: string): Promise<string> {
    try {
      const company = await companyService.findById(companyId);
      if (!company) {
        return 'USD';
      }

      const currency = (company.settings?.currency as string) || 'USD';
      return currency;
    } catch (error) {
      logger.error('Error getting company currency:', error);
      return 'USD';
    }
  }

  /**
   * Create terminal checkout for in-person payments (tap, chip, swipe)
   * Currently only supported for Square
   */
  async createTerminalCheckout(
    companyId: string,
    checkoutData: CreateTerminalCheckoutData
  ): Promise<CreateTerminalCheckoutResult> {
    const config = await this.getPaymentConfig(companyId);
    if (!config) {
      throw new Error('Payment integration not configured');
    }

    if (!config.enabled) {
      throw new Error('Payment integration is disabled');
    }

    // Terminal checkouts are currently only supported for Square
    if (config.provider !== 'square') {
      throw new Error(`Terminal checkouts are only supported for Square. Current provider: ${config.provider}`);
    }

    return await squareAdapter.createTerminalCheckout(config, checkoutData);
  }

  /**
   * Get terminal checkout status
   * Currently only supported for Square
   */
  async getTerminalCheckoutStatus(
    companyId: string,
    checkoutId: string
  ): Promise<CreateTerminalCheckoutResult> {
    const config = await this.getPaymentConfig(companyId);
    if (!config) {
      throw new Error('Payment integration not configured');
    }

    if (!config.enabled) {
      throw new Error('Payment integration is disabled');
    }

    // Terminal checkouts are currently only supported for Square
    if (config.provider !== 'square') {
      throw new Error(`Terminal checkouts are only supported for Square. Current provider: ${config.provider}`);
    }

    return await squareAdapter.getTerminalCheckoutStatus(config, checkoutId);
  }
}

export default new PaymentService();
