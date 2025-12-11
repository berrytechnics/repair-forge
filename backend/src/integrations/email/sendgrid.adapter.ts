// src/integrations/email/sendgrid.adapter.ts
import sgMail from '@sendgrid/mail';
import { EmailIntegrationConfig } from '../../config/integrations.js';
import logger from '../../config/logger.js';
import { decryptCredentials } from '../../utils/encryption.js';

export interface EmailData {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
}

/**
 * SendGrid adapter for email integration
 */
export class SendGridAdapter {
  /**
   * Test SendGrid API key connection
   * Uses SendGrid's validation API endpoint
   */
  async testConnection(config: EmailIntegrationConfig): Promise<TestConnectionResult> {
    try {
      // Decrypt credentials before use
      const decryptedCredentials = decryptCredentials(config.credentials);
      const apiKey = decryptedCredentials.apiKey;

      if (!apiKey) {
        return {
          success: false,
          error: 'API key not found in credentials',
        };
      }

      // Set API key for this test
      sgMail.setApiKey(apiKey);

      // Test connection by making a simple API call to validate the key
      // SendGrid doesn't have a dedicated "test" endpoint, so we'll use
      // the mail send endpoint with a test email (won't actually send)
      // Or we can use the API key validation endpoint
      try {
        // Use SendGrid's API to validate the key
        // We'll make a request to the user profile endpoint which requires auth
        const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          return { success: true };
        } else if (response.status === 401) {
          return {
            success: false,
            error: 'Invalid API key. Please check your SendGrid API key.',
          };
        } else {
          const errorText = await response.text();
          return {
            success: false,
            error: `SendGrid API error: ${response.status} - ${errorText}`,
          };
        }
      } catch (error) {
        logger.error('SendGrid connection test error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error testing connection',
        };
      }
    } catch (error) {
      logger.error('SendGrid adapter testConnection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email using SendGrid
   */
  async sendEmail(config: EmailIntegrationConfig, emailData: EmailData): Promise<void> {
    try {
      // Decrypt credentials before use
      const decryptedCredentials = decryptCredentials(config.credentials);
      const apiKey = decryptedCredentials.apiKey;

      if (!apiKey) {
        throw new Error('SendGrid API key not found in credentials');
      }

      // Set API key
      sgMail.setApiKey(apiKey);

      // Get from email from settings or use default
      const fromEmail = emailData.from || config.settings?.fromEmail as string;
      if (!fromEmail) {
        throw new Error('From email address is required');
      }

      // Build from address with optional name
      const fromName = emailData.fromName || (config.settings?.fromName as string);
      const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

      // Prepare message - SendGrid requires at least text or html
      interface SendGridMessage {
        to: string[];
        from: string;
        subject: string;
        replyTo?: string;
        text?: string;
        html?: string;
      }
      const msg: SendGridMessage = {
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        from,
        subject: emailData.subject,
        replyTo: emailData.replyTo || (config.settings?.replyTo as string) || fromEmail,
      };

      // Add text and/or html content
      if (emailData.text) {
        msg.text = emailData.text;
      }
      if (emailData.html) {
        msg.html = emailData.html;
      }

      // Ensure at least one content type is present
      if (!msg.text && !msg.html) {
        throw new Error('Either text or html content is required');
      }

      // Send email - type assertion needed because SendGrid types are stricter
      await sgMail.send(msg as Parameters<typeof sgMail.send>[0]);

      logger.info(`Email sent successfully via SendGrid to ${Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to}`);
    } catch (error) {
      logger.error('SendGrid sendEmail error:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          throw new Error('Invalid SendGrid API key. Please check your credentials.');
        }
        if (error.message.includes('Forbidden')) {
          throw new Error('SendGrid API key does not have permission to send emails.');
        }
        throw error;
      }

      throw new Error('Failed to send email via SendGrid');
    }
  }
}

export default new SendGridAdapter();
