// src/integrations/email/email.service.ts
import { db } from '../../config/connection.js';
import { EmailIntegrationConfig } from '../../config/integrations.js';
import logger from '../../config/logger.js';
import credentialService from '../../services/credential.service.js';
import { Customer } from '../../services/customer.service.js';
import { Invoice } from '../../services/invoice.service.js';
import { Ticket } from '../../services/ticket.service.js';
import sendGridAdapter, { EmailData } from './sendgrid.adapter.js';

/**
 * High-level email service for sending notifications
 * Handles integration configuration and fallback gracefully
 *
 * SendGrid Configuration:
 * - Site-wide SendGrid (via env vars): Used for user invitations
 *   Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in backend .env
 * - Company-specific SendGrid (via UI): Used for ticket/invoice emails
 *   Configured per company via Settings > Integrations > Email
 */
export class EmailService {
  /**
   * Check if site-wide SendGrid is configured (for invitations)
   */
  private isSiteWideSendGridConfigured(): boolean {
    const hasApiKey = !!process.env.SENDGRID_API_KEY;
    const hasFromEmail = !!process.env.SENDGRID_FROM_EMAIL;

    if (!hasApiKey) {
      logger.debug('Site-wide SendGrid: SENDGRID_API_KEY not found in environment');
    }
    if (!hasFromEmail) {
      logger.debug('Site-wide SendGrid: SENDGRID_FROM_EMAIL not found in environment');
    }

    return hasApiKey && hasFromEmail;
  }

  /**
   * Get site-wide SendGrid config from environment variables
   */
  private getSiteWideSendGridConfig(): EmailIntegrationConfig | null {
    if (!this.isSiteWideSendGridConfigured()) {
      return null;
    }

    return {
      type: 'email',
      provider: 'sendgrid',
      enabled: true,
      credentials: {
        apiKey: process.env.SENDGRID_API_KEY!,
      },
      settings: {
        fromEmail: process.env.SENDGRID_FROM_EMAIL!,
        fromName: process.env.SENDGRID_FROM_NAME || 'Circuit Sage',
        replyTo: process.env.SENDGRID_REPLY_TO || process.env.SENDGRID_FROM_EMAIL!,
      },
    };
  }

  /**
   * Check if email integration is configured and enabled
   */
  async isEmailConfigured(companyId: string): Promise<boolean> {
    try {
      const integration = await credentialService.getIntegration(companyId, 'email');
      return integration !== null && integration.enabled === true;
    } catch (error) {
      logger.error('Error checking email configuration:', error);
      return false;
    }
  }

  /**
   * Get email integration config
   */
  private async getEmailConfig(companyId: string): Promise<EmailIntegrationConfig | null> {
    const integration = await credentialService.getIntegration(companyId, 'email');
    if (!integration || integration.type !== 'email') {
      return null;
    }
    return integration as EmailIntegrationConfig;
  }

  /**
   * Send email using configured provider
   */
  private async sendEmailInternal(
    companyId: string,
    emailData: EmailData
  ): Promise<void> {
    const config = await this.getEmailConfig(companyId);
    if (!config) {
      throw new Error('Email integration not configured');
    }

    if (!config.enabled) {
      throw new Error('Email integration is disabled');
    }

    // Route to appropriate adapter based on provider
    if (config.provider === 'sendgrid') {
      await sendGridAdapter.sendEmail(config, emailData);
    } else {
      throw new Error(`Email provider ${config.provider} is not yet supported`);
    }
  }

  /**
   * Send ticket status update email to customer
   */
  async sendTicketStatusEmail(
    companyId: string,
    ticket: Ticket,
    customer: Customer
  ): Promise<void> {
    try {
      if (!(await this.isEmailConfigured(companyId))) {
        logger.debug('Email integration not configured, skipping ticket status email');
        return;
      }

      if (!customer.email) {
        logger.debug(`Customer ${customer.id} has no email address, skipping notification`);
        return;
      }

      const statusDisplayNames: Record<string, string> = {
        new: 'New',
        assigned: 'Assigned',
        in_progress: 'In Progress',
        on_hold: 'On Hold',
        completed: 'Completed',
        cancelled: 'Cancelled',
      };

      const statusDisplay = statusDisplayNames[ticket.status] || ticket.status;

      const subject = `Ticket ${ticket.ticketNumber} Status Update: ${statusDisplay}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Ticket Status Update</h2>
          <p>Hello ${customer.firstName},</p>
          <p>Your repair ticket has been updated:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
            <p><strong>Status:</strong> ${statusDisplay}</p>
            <p><strong>Device:</strong> ${ticket.deviceType}${ticket.deviceBrand ? ` - ${ticket.deviceBrand}` : ''}${ticket.deviceModel ? ` ${ticket.deviceModel}` : ''}</p>
            ${ticket.diagnosticNotes ? `<p><strong>Diagnostic Notes:</strong><br>${ticket.diagnosticNotes.replace(/\n/g, '<br>')}</p>` : ''}
            ${ticket.repairNotes ? `<p><strong>Repair Notes:</strong><br>${ticket.repairNotes.replace(/\n/g, '<br>')}</p>` : ''}
          </div>
          <p>If you have any questions, please contact us.</p>
          <p>Thank you for your business!</p>
        </div>
      `;

      const text = `
Ticket Status Update

Hello ${customer.firstName},

Your repair ticket has been updated:

Ticket Number: ${ticket.ticketNumber}
Status: ${statusDisplay}
Device: ${ticket.deviceType}${ticket.deviceBrand ? ` - ${ticket.deviceBrand}` : ''}${ticket.deviceModel ? ` ${ticket.deviceModel}` : ''}
${ticket.diagnosticNotes ? `\nDiagnostic Notes:\n${ticket.diagnosticNotes}\n` : ''}
${ticket.repairNotes ? `\nRepair Notes:\n${ticket.repairNotes}\n` : ''}

If you have any questions, please contact us.

Thank you for your business!
      `;

      await this.sendEmailInternal(companyId, {
        to: customer.email,
        subject,
        text,
        html,
      });

      logger.info(`Ticket status email sent to ${customer.email} for ticket ${ticket.ticketNumber}`);
    } catch (error) {
      // Don't fail the ticket update if email fails
      logger.error(`Failed to send ticket status email for ticket ${ticket.ticketNumber}:`, error);
    }
  }

  /**
   * Send invoice email to customer
   */
  async sendInvoiceEmail(
    companyId: string,
    invoice: Invoice,
    customer: Customer
  ): Promise<void> {
    try {
      if (!(await this.isEmailConfigured(companyId))) {
        logger.debug('Email integration not configured, skipping invoice email');
        return;
      }

      if (!customer.email) {
        logger.debug(`Customer ${customer.id} has no email address, skipping invoice email`);
        return;
      }

      const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.status === 'paid' ? 'Payment Confirmation' : 'Payment Due'}`;

      const statusText = invoice.status === 'paid'
        ? 'This invoice has been paid. Thank you!'
        : 'Please review the invoice below and submit payment.';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice ${invoice.invoiceNumber}</h2>
          <p>Hello ${customer.firstName},</p>
          <p>${statusText}</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
            <p><strong>Subtotal:</strong> $${invoice.subtotal.toFixed(2)}</p>
            ${invoice.taxAmount > 0 ? `<p><strong>Tax:</strong> $${invoice.taxAmount.toFixed(2)}</p>` : ''}
            <p><strong>Total Amount:</strong> $${invoice.totalAmount.toFixed(2)}</p>
            ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ''}
            ${invoice.paidDate ? `<p><strong>Paid Date:</strong> ${new Date(invoice.paidDate).toLocaleDateString()}</p>` : ''}
            ${invoice.notes ? `<p><strong>Notes:</strong><br>${invoice.notes.replace(/\n/g, '<br>')}</p>` : ''}
          </div>
          <p>If you have any questions about this invoice, please contact us.</p>
          <p>Thank you for your business!</p>
        </div>
      `;

      const text = `
Invoice ${invoice.invoiceNumber}

Hello ${customer.firstName},

${statusText}

Invoice Number: ${invoice.invoiceNumber}
Status: ${invoice.status}
Subtotal: $${invoice.subtotal.toFixed(2)}
${invoice.taxAmount > 0 ? `Tax: $${invoice.taxAmount.toFixed(2)}\n` : ''}
Total Amount: $${invoice.totalAmount.toFixed(2)}
${invoice.dueDate ? `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n` : ''}
${invoice.paidDate ? `Paid Date: ${new Date(invoice.paidDate).toLocaleDateString()}\n` : ''}
${invoice.notes ? `\nNotes:\n${invoice.notes}\n` : ''}

If you have any questions about this invoice, please contact us.

Thank you for your business!
      `;

      await this.sendEmailInternal(companyId, {
        to: customer.email,
        subject,
        text,
        html,
      });

      logger.info(`Invoice email sent to ${customer.email} for invoice ${invoice.invoiceNumber}`);
    } catch (error) {
      // Don't fail the invoice operation if email fails
      logger.error(`Failed to send invoice email for invoice ${invoice.invoiceNumber}:`, error);
    }
  }

  /**
   * Send invitation email to user
   * Uses site-wide SendGrid if configured, otherwise falls back to company-specific integration
   */
  async sendInvitationEmail(
    companyId: string,
    invitation: {
      email: string;
      token: string;
      role: string;
      expiresAt: Date | null;
    },
    companyName: string
  ): Promise<void> {
    try {
      // Debug: Log environment variable status
      logger.debug(`Checking SendGrid config - API Key present: ${!!process.env.SENDGRID_API_KEY}, From Email present: ${!!process.env.SENDGRID_FROM_EMAIL}`);
      // Get frontend URL from environment
      // Try FRONTEND_URL first, then derive from ALLOWED_ORIGINS, fallback to localhost for dev
      let frontendUrl = process.env.FRONTEND_URL;
      if (!frontendUrl && process.env.ALLOWED_ORIGINS) {
        // Extract first origin from ALLOWED_ORIGINS (comma-separated)
        const firstOrigin = process.env.ALLOWED_ORIGINS.split(',')[0].trim();
        frontendUrl = firstOrigin;
      }
      if (!frontendUrl) {
        frontendUrl = process.env.NODE_ENV === 'production'
          ? 'https://yourdomain.com' // Should be set in production
          : 'http://localhost:3000'; // Default for development
      }
      const invitationLink = `${frontendUrl}/register?token=${invitation.token}`;

      // Format expiration date
      const expirationText = invitation.expiresAt
        ? new Date(invitation.expiresAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '7 days';

      const roleDisplayNames: Record<string, string> = {
        admin: 'Administrator',
        technician: 'Technician',
        frontdesk: 'Front Desk',
      };
      const roleDisplay = roleDisplayNames[invitation.role] || invitation.role;

      const subject = `You've been invited to join ${companyName}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You've been invited!</h2>
          <p>Hello,</p>
          <p>You've been invited to join <strong>${companyName}</strong> as a <strong>${roleDisplay}</strong>.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Role:</strong> ${roleDisplay}</p>
            <p><strong>Expires:</strong> ${expirationText}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Accept Invitation</a>
          </div>
          <p style="color: #666; font-size: 12px;">Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${invitationLink}</p>
          <p style="margin-top: 30px; color: #666;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `;

      const text = `
You've been invited!

Hello,

You've been invited to join ${companyName} as a ${roleDisplay}.

Role: ${roleDisplay}
Expires: ${expirationText}

Accept your invitation by clicking the link below:
${invitationLink}

If you didn't expect this invitation, you can safely ignore this email.
      `;

      const emailData: EmailData = {
        to: invitation.email,
        subject,
        text,
        html,
      };

      // Try site-wide SendGrid first (for invitations)
      const siteWideConfig = this.getSiteWideSendGridConfig();
      if (siteWideConfig) {
        try {
          logger.info(`Attempting to send invitation email via site-wide SendGrid to ${invitation.email}`);
          await sendGridAdapter.sendEmail(siteWideConfig, emailData);
          logger.info(`✅ Invitation email sent via site-wide SendGrid to ${invitation.email} for company ${companyId}`);
          return;
        } catch (error) {
          logger.error(`❌ Site-wide SendGrid failed for invitation email to ${invitation.email}:`, error);
          // Log full error details for debugging
          if (error instanceof Error) {
            logger.error(`Error message: ${error.message}`);
            const errorResponse = (error as { response?: { body?: unknown } }).response;
            if (errorResponse?.body) {
              logger.error(`SendGrid error details:`, JSON.stringify(errorResponse.body, null, 2));
            }
          }
          logger.warn(`Falling back to company integration...`);
          // Fall through to company-specific integration
        }
      } else {
        logger.warn('⚠️ Site-wide SendGrid not configured (SENDGRID_API_KEY or SENDGRID_FROM_EMAIL missing)');
      }

      // Fall back to company-specific integration
      if (!(await this.isEmailConfigured(companyId))) {
        logger.debug('Email integration not configured, skipping invitation email');
        return;
      }

      await this.sendEmailInternal(companyId, emailData);
      logger.info(`Invitation email sent via company integration to ${invitation.email} for company ${companyId}`);
    } catch (error) {
      // Don't fail the invitation creation if email fails
      logger.error(`Failed to send invitation email to ${invitation.email}:`, error);
    }
  }

  /**
   * Send password reset email to user
   * Uses site-wide SendGrid if configured, otherwise falls back to company-specific integration
   */
  async sendPasswordResetEmail(
    userId: string,
    userEmail: string,
    resetToken: string,
    userName?: string
  ): Promise<void> {
    try {
      // Get user's company ID to determine which email config to use
      const user = await db
        .selectFrom("users")
        .select("company_id")
        .where("id", "=", userId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      const companyId = user?.company_id as string | undefined;

      // Get frontend URL from environment
      let frontendUrl = process.env.FRONTEND_URL;
      if (!frontendUrl && process.env.ALLOWED_ORIGINS) {
        const firstOrigin = process.env.ALLOWED_ORIGINS.split(',')[0].trim();
        frontendUrl = firstOrigin;
      }
      if (!frontendUrl) {
        frontendUrl = process.env.NODE_ENV === 'production'
          ? 'https://yourdomain.com'
          : 'http://localhost:3000';
      }
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      const subject = 'Reset your password';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello${userName ? ` ${userName}` : ''},</p>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 12px;">Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${resetLink}</p>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            <strong>This link will expire in 1 hour.</strong>
          </p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
        </div>
      `;

      const text = `
Password Reset Request

Hello${userName ? ` ${userName}` : ''},

We received a request to reset your password. Click the link below to reset it:

${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
      `;

      const emailData: EmailData = {
        to: userEmail,
        subject,
        text,
        html,
      };

      // Try site-wide SendGrid first (for password resets)
      const siteWideConfig = this.getSiteWideSendGridConfig();
      if (siteWideConfig) {
        try {
          logger.info(`Attempting to send password reset email via site-wide SendGrid to ${userEmail}`);
          await sendGridAdapter.sendEmail(siteWideConfig, emailData);
          logger.info(`✅ Password reset email sent via site-wide SendGrid to ${userEmail}`);
          return;
        } catch (error) {
          logger.error(`❌ Site-wide SendGrid failed for password reset email to ${userEmail}:`, error);
          if (error instanceof Error) {
            logger.error(`Error message: ${error.message}`);
            const errorResponse = (error as { response?: { body?: unknown } }).response;
            if (errorResponse?.body) {
              logger.error(`SendGrid error details:`, JSON.stringify(errorResponse.body, null, 2));
            }
          }
          logger.warn(`Falling back to company integration...`);
        }
      } else {
        logger.warn('⚠️ Site-wide SendGrid not configured (SENDGRID_API_KEY or SENDGRID_FROM_EMAIL missing)');
      }

      // Fall back to company-specific integration if company ID is available
      if (companyId && (await this.isEmailConfigured(companyId))) {
        await this.sendEmailInternal(companyId, emailData);
        logger.info(`Password reset email sent via company integration to ${userEmail}`);
      } else {
        logger.warn(`Cannot send password reset email - no email integration configured for user ${userId}`);
      }
    } catch (error) {
      // Don't fail the password reset request if email fails
      logger.error(`Failed to send password reset email to ${userEmail}:`, error);
    }
  }
}

export default new EmailService();
