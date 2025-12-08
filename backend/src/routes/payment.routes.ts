// src/routes/payment.routes.ts
import express, { Request, Response } from 'express';
import { NotFoundError, BadRequestError } from '../config/errors.js';
import { validateRequest } from '../middlewares/auth.middleware.js';
import { requireTenantContext } from '../middlewares/tenant.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { body, param } from 'express-validator';
import paymentService from '../integrations/payment/payment.service.js';
import invoiceService from '../services/invoice.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import logger from '../config/logger.js';
import { db } from '../config/connection.js';

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

/**
 * Validation rules for processing payment
 */
const processPaymentValidation = [
  body('invoiceId')
    .exists()
    .withMessage('Invoice ID is required')
    .trim()
    .notEmpty()
    .withMessage('Invoice ID is required')
    .isUUID()
    .withMessage('Invoice ID must be a valid UUID'),
  body('paymentMethod')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Payment method must be between 1 and 100 characters'),
  body('sourceId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Source ID (card nonce) must be between 1 and 200 characters'),
  body('idempotencyKey')
    .optional()
    .trim()
    .isLength({ max: 45 })
    .withMessage('Idempotency key must not exceed 45 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
];

/**
 * Validation rules for refund
 */
const refundPaymentValidation = [
  body('transactionId')
    .exists()
    .withMessage('Transaction ID is required')
    .trim()
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
];

/**
 * Validation rules for creating terminal checkout
 */
const createTerminalCheckoutValidation = [
  body('invoiceId')
    .exists()
    .withMessage('Invoice ID is required')
    .trim()
    .notEmpty()
    .withMessage('Invoice ID is required')
    .isUUID()
    .withMessage('Invoice ID must be a valid UUID'),
  body('deviceId')
    .exists()
    .withMessage('Device ID is required')
    .trim()
    .notEmpty()
    .withMessage('Device ID is required'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
];

/**
 * Validation rules for webhook provider
 */
const webhookProviderValidation = [
  param('provider')
    .exists()
    .withMessage('Provider is required')
    .trim()
    .isIn(['square'])
    .withMessage('Provider must be square'),
];

// POST /api/payments/process - Process payment for an invoice
router.post(
  '/process',
  requirePermission('payments.process'),
  validate(processPaymentValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { invoiceId, paymentMethod, amount } = req.body;

    // Check if payment integration is configured
    if (!(await paymentService.isPaymentConfigured(companyId))) {
      throw new BadRequestError('Payment integration is not configured. Please configure a payment provider in settings.');
    }

    // Get invoice
    const invoice = await invoiceService.findById(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestError('Invoice is already paid');
    }

    // Get currency from company settings
    const currency = await paymentService.getCurrency(companyId);

    // Use provided amount or invoice total
    const paymentAmount = amount || invoice.totalAmount;

    // Validate customerId is present
    if (!invoice.customerId) {
      throw new BadRequestError('Invoice must have a customer to process payment');
    }

    // Process payment
    try {
      const result = await paymentService.processPayment(companyId, {
        amount: paymentAmount,
        currency,
        invoiceId,
        customerId: invoice.customerId,
        paymentMethod: paymentMethod || 'card',
        sourceId: req.body.sourceId, // Card nonce/token from payment provider SDK
        idempotencyKey: req.body.idempotencyKey, // Optional idempotency key
        description: `Payment for invoice ${invoice.invoiceNumber}`,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      // Mark invoice as paid
      await invoiceService.markInvoiceAsPaid(
        invoiceId,
        {
          paymentMethod: result.paymentMethod,
          paymentReference: result.transactionId,
        },
        companyId
      );

      res.json({
        success: true,
        data: {
          transactionId: result.transactionId,
          status: result.status,
          amount: result.amount,
          currency: result.currency,
        },
      });
    } catch (error) {
      logger.error('Payment processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      throw new BadRequestError(`Payment failed: ${errorMessage}`);
    }
  })
);

// POST /api/payments/refund - Refund a payment
router.post(
  '/refund',
  requirePermission('payments.refund'),
  validate(refundPaymentValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { transactionId, amount, reason } = req.body;

    // Check if payment integration is configured
    if (!(await paymentService.isPaymentConfigured(companyId))) {
      throw new BadRequestError('Payment integration is not configured');
    }

    // Process refund
    try {
      const result = await paymentService.refundPayment(companyId, {
        transactionId,
        amount,
        reason,
      });

      // Record refund on invoice if refund was successful
      if (result.status === 'succeeded' || result.status === 'pending') {
        try {
          await invoiceService.recordRefund(
            transactionId,
            result.amount,
            companyId,
            result.refundId
          );
          logger.info(`Refund recorded on invoice for transaction ${transactionId}`, {
            refundId: result.refundId,
            amount: result.amount,
            companyId,
          });
        } catch (invoiceError) {
          // Log error but don't fail the refund - the refund was processed successfully
          logger.error('Failed to record refund on invoice:', invoiceError);
          logger.warn(`Refund ${result.refundId} processed but not recorded on invoice for transaction ${transactionId}`);
        }
      }

      res.json({
        success: true,
        data: {
          refundId: result.refundId,
          status: result.status,
          amount: result.amount,
          currency: result.currency,
          transactionId: result.transactionId,
        },
      });
    } catch (error) {
      logger.error('Refund processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Refund processing failed';
      throw new BadRequestError(`Refund failed: ${errorMessage}`);
    }
  })
);

// POST /api/payments/terminal/checkout - Create terminal checkout for in-person payments
router.post(
  '/terminal/checkout',
  requirePermission('payments.process'),
  validate(createTerminalCheckoutValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { invoiceId, deviceId, amount } = req.body;

    // Check if payment integration is configured
    if (!(await paymentService.isPaymentConfigured(companyId))) {
      throw new BadRequestError('Payment integration is not configured. Please configure a payment provider in settings.');
    }

    // Get invoice
    const invoice = await invoiceService.findById(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestError('Invoice is already paid');
    }

    // Get currency from company settings
    const currency = await paymentService.getCurrency(companyId);

    // Use provided amount or invoice total
    const checkoutAmount = amount || invoice.totalAmount;

    // Validate customerId is present
    if (!invoice.customerId) {
      throw new BadRequestError('Invoice must have a customer to process payment');
    }

    // Create terminal checkout
    try {
      const result = await paymentService.createTerminalCheckout(companyId, {
        amount: checkoutAmount,
        currency,
        invoiceId,
        customerId: invoice.customerId,
        deviceId,
        description: `Payment for invoice ${invoice.invoiceNumber}`,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      res.json({
        success: true,
        data: {
          checkoutId: result.checkoutId,
          status: result.status,
          deviceId: result.deviceId,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      logger.error('Terminal checkout creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terminal checkout creation failed';
      throw new BadRequestError(`Terminal checkout failed: ${errorMessage}`);
    }
  })
);

// GET /api/payments/terminal/checkout/:checkoutId - Get terminal checkout status
router.get(
  '/terminal/checkout/:checkoutId',
  requirePermission('payments.process'),
  validate([
    param('checkoutId')
      .exists()
      .withMessage('Checkout ID is required')
      .trim()
      .notEmpty()
      .withMessage('Checkout ID is required'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { checkoutId } = req.params;

    // Check if payment integration is configured
    if (!(await paymentService.isPaymentConfigured(companyId))) {
      throw new BadRequestError('Payment integration is not configured');
    }

    try {
      const result = await paymentService.getTerminalCheckoutStatus(companyId, checkoutId);

      res.json({
        success: true,
        data: {
          checkoutId: result.checkoutId,
          status: result.status,
          deviceId: result.deviceId,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      logger.error('Terminal checkout status error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get terminal checkout status';
      throw new BadRequestError(`Failed to get checkout status: ${errorMessage}`);
    }
  })
);

// POST /api/payments/webhook/:provider - Handle webhook callbacks from providers
router.post(
  '/webhook/:provider',
  validate(webhookProviderValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;

    // Webhooks don't require authentication (they're called by payment providers)
    // But we should verify the webhook signature for security
    // TODO: Implement webhook signature verification for each provider

    logger.info(`Webhook received from ${provider}`, {
      provider,
      body: req.body,
      headers: req.headers,
    });

    try {
      // Extract invoice ID from webhook payload (provider-specific)
      let invoiceId: string | undefined;
      let transactionId: string | undefined;
      let status: string | undefined;

      // Square webhook structure
      const data = req.body.data;
      
      // Handle payment webhooks
      if (data?.object?.payment) {
        transactionId = data.object.payment.id;
        const referenceId = data.object.payment.reference_id;
        if (referenceId) {
          invoiceId = referenceId;
        }
        status = data.object.payment.status === 'COMPLETED' ? 'paid' : undefined;
      }
      
      // Handle terminal checkout webhooks
      if (data?.object?.terminalCheckout) {
        const checkout = data.object.terminalCheckout;
        
        // If checkout is completed, get the payment IDs
        if (checkout.status === 'COMPLETED' && checkout.payment_ids && checkout.payment_ids.length > 0) {
          transactionId = checkout.payment_ids[0];
          const referenceId = checkout.reference_id;
          if (referenceId) {
            invoiceId = referenceId;
          }
          status = 'paid';
        }
      }

      // Update invoice status if we found an invoice ID and status
      if (invoiceId && status === 'paid') {
        try {
          // Find invoice by ID to get company ID
          const invoiceRow = await db
            .selectFrom('invoices')
            .select(['id', 'company_id'])
            .where('id', '=', invoiceId)
            .where('deleted_at', 'is', null)
            .executeTakeFirst();

          if (invoiceRow) {
            // Mark invoice as paid
            await invoiceService.markInvoiceAsPaid(
              invoiceId,
              {
                paymentMethod: provider,
                paymentReference: transactionId,
              },
              invoiceRow.company_id as string
            );
            logger.info(`Invoice ${invoiceId} marked as paid via ${provider} webhook`);
          }
        } catch (error) {
          logger.error(`Error updating invoice ${invoiceId} from webhook:`, error);
        }
      }

      // Return 200 OK to acknowledge receipt
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error(`Error processing webhook from ${provider}:`, error);
      // Still return 200 to prevent webhook retries for our errors
      res.status(200).json({ received: true, error: 'Processing failed' });
    }
  })
);

export default router;

