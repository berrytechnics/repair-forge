/**
 * Integration configuration types and metadata
 */

export type IntegrationType = 'email' | 'payment' | 'sms';

export type EmailProvider = 'sendgrid';

export type PaymentProvider = 'square';

/**
 * Base integration configuration structure
 */
export interface IntegrationConfig {
  type: IntegrationType;
  provider: string;
  enabled: boolean;
  credentials: Record<string, string>; // Encrypted credentials
  settings?: Record<string, unknown>;
  lastTested?: Date | string;
  lastError?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Email integration configuration
 */
export interface EmailIntegrationConfig extends IntegrationConfig {
  type: 'email';
  provider: EmailProvider;
  settings?: {
    fromEmail: string;
    fromName?: string;
    replyTo?: string;
  };
}

/**
 * Payment integration configuration
 */
export interface PaymentIntegrationConfig extends IntegrationConfig {
  type: 'payment';
  provider: PaymentProvider;
  settings?: {
    testMode?: boolean;
    webhookUrl?: string;
  };
}

/**
 * Provider metadata for UI display
 */
export interface ProviderMetadata {
  id: string;
  displayName: string;
  description: string;
  documentationUrl?: string;
  icon?: string;
}

/**
 * Email provider metadata
 */
export const EMAIL_PROVIDERS: Record<EmailProvider, ProviderMetadata> = {
  sendgrid: {
    id: 'sendgrid',
    displayName: 'SendGrid',
    description: 'SendGrid email service (100 emails/day free tier)',
    documentationUrl: 'https://docs.sendgrid.com/for-developers/sending-email/api-getting-started',
  },
};

/**
 * Payment provider metadata
 */
export const PAYMENT_PROVIDERS: Record<PaymentProvider, ProviderMetadata> = {
  square: {
    id: 'square',
    displayName: 'Square',
    description: 'Square payment processing (2.6% + $0.10 per transaction)',
    documentationUrl: 'https://developer.squareup.com/docs/payments-overview',
  },
};

/**
 * Get provider metadata
 */
export function getProviderMetadata(type: IntegrationType, provider: string): ProviderMetadata | undefined {
  if (type === 'email') {
    return EMAIL_PROVIDERS[provider as EmailProvider];
  }
  if (type === 'payment') {
    return PAYMENT_PROVIDERS[provider as PaymentProvider];
  }
  return undefined;
}

/**
 * Get all available providers for an integration type
 */
export function getAvailableProviders(type: IntegrationType): ProviderMetadata[] {
  if (type === 'email') {
    return Object.values(EMAIL_PROVIDERS);
  }
  if (type === 'payment') {
    return Object.values(PAYMENT_PROVIDERS);
  }
  return [];
}
