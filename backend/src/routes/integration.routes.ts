import express, { Request, Response } from 'express';
import { NotFoundError } from '../config/errors.js';
import { validateRequest } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/rbac.middleware.js';
import { requireTenantContext } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import credentialService from '../services/credential.service.js';
import sendGridAdapter from '../integrations/email/sendgrid.adapter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  saveEmailIntegrationValidation,
  savePaymentIntegrationValidation,
  integrationTypeValidation,
  testIntegrationValidation,
} from '../validators/integration.validator.js';
import { IntegrationType, EmailIntegrationConfig, PaymentIntegrationConfig, PaymentProvider } from '../config/integrations.js';
import squareAdapter from '../integrations/payment/square.adapter.js';
import { decryptCredentials } from '../utils/encryption.js';

const router = express.Router();

// All routes require authentication, tenant context, and admin access
router.use(validateRequest);
router.use(requireTenantContext);
router.use(requireAdmin());

/**
 * Mask credentials in API responses
 * Shows first 4 and last 4 characters, masks the middle
 */
function maskCredentials(credentials: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (value && value.length > 8) {
      const start = value.substring(0, 4);
      const end = value.substring(value.length - 4);
      const middle = '*'.repeat(Math.max(4, value.length - 8));
      masked[key] = `${start}${middle}${end}`;
    } else if (value) {
      masked[key] = '****';
    } else {
      masked[key] = '';
    }
  }
  return masked;
}

// GET /api/integrations/:type - Get integration config (credentials masked)
router.get(
  '/:type',
  validate(integrationTypeValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { type } = req.params;

    const integration = await credentialService.getIntegration(companyId, type as IntegrationType);

    if (!integration) {
      res.status(404).json({
        success: false,
        error: { message: 'Integration not found' },
      });
      return;
    }

    // Return config with masked credentials
    // For Square payment integration, include applicationId and locationId (needed for SDK initialization, less sensitive than access token)
    const responseData: Record<string, unknown> = {
      ...integration,
      credentials: maskCredentials(integration.credentials),
    };

    if (type === 'payment' && integration.type === 'payment') {
      const paymentConfig = integration as PaymentIntegrationConfig;
      if (paymentConfig.provider === 'square') {
        // Decrypt credentials to get applicationId and locationId for Square SDK initialization
        const decryptedCredentials = decryptCredentials(integration.credentials);
        if (decryptedCredentials.applicationId) {
          responseData.applicationId = decryptedCredentials.applicationId;
        }
        if (decryptedCredentials.locationId) {
          responseData.locationId = decryptedCredentials.locationId;
        }
      }
    }

    res.json({
      success: true,
      data: responseData,
    });
  })
);

// POST /api/integrations/:type - Save/update integration config
router.post(
  '/:type',
  validate([
    ...integrationTypeValidation,
    ...saveEmailIntegrationValidation,
    ...savePaymentIntegrationValidation,
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { type } = req.params;
    const { provider, enabled, credentials, settings } = req.body;

    // Validate type-specific requirements
    if (type === 'email' && !credentials?.apiKey) {
      res.status(400).json({
        success: false,
        error: { message: 'API key is required for email integration' },
      });
      return;
    }

    if (type === 'payment') {
      // Validate payment provider-specific credentials
      if (!credentials?.accessToken || !credentials?.applicationId || !credentials?.locationId) {
        res.status(400).json({
          success: false,
          error: { message: 'Access token, application ID, and location ID are required for Square' },
        });
        return;
      }

      // For payment integrations, require a successful test connection before saving
      // Check if skipTest flag is provided (for updates where credentials haven't changed)
      const skipTest = req.body.skipTest === true;

      if (!skipTest) {
        // Create a temporary config to test
        const tempConfig: PaymentIntegrationConfig = {
          type: 'payment',
          provider: provider as PaymentProvider,
          enabled: enabled ?? true,
          credentials,
          settings,
        };

        // Test connection based on provider
        let testResult;
        if (provider === 'square') {
          testResult = await squareAdapter.testConnection(tempConfig);
        } else {
          res.status(400).json({
            success: false,
            error: { message: `Payment provider ${provider} is not supported` },
          });
          return;
        }

        if (!testResult.success) {
          res.status(400).json({
            success: false,
            error: {
              message: `Connection test failed. Please verify your credentials and try again.`,
              details: testResult.error
            },
          });
          return;
        }
      }
    }

    const config = await credentialService.saveIntegration(companyId, type as IntegrationType, {
      provider,
      enabled: enabled ?? true,
      credentials, // Will be encrypted
      settings,
    });

    res.json({
      success: true,
      data: {
        ...config,
        credentials: maskCredentials(config.credentials),
      },
    });
  })
);

// POST /api/integrations/:type/test - Test integration connection
router.post(
  '/:type/test',
  validate(testIntegrationValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { type } = req.params;

    const integration = await credentialService.getIntegration(companyId, type as IntegrationType);

    if (!integration) {
      throw new NotFoundError(`Integration ${type} not configured`);
    }

    if (!integration.enabled) {
      res.status(400).json({
        success: false,
        error: { message: `Integration ${type} is disabled` },
      });
      return;
    }

    // Test connection based on type and provider
    let testResult;
    if (type === 'email' && integration.provider === 'sendgrid') {
      testResult = await sendGridAdapter.testConnection(integration as EmailIntegrationConfig);
    } else if (type === 'payment') {
      const paymentConfig = integration as PaymentIntegrationConfig;
      if (paymentConfig.provider === 'square') {
        testResult = await squareAdapter.testConnection(paymentConfig);
      } else {
        res.status(400).json({
          success: false,
          error: { message: `Payment provider ${paymentConfig.provider} is not supported` },
        });
        return;
      }
    } else {
      res.status(400).json({
        success: false,
        error: { message: `Testing not yet supported for ${type} integration with provider ${integration.provider}` },
      });
      return;
    }

    // Update last tested timestamp
    await credentialService.markIntegrationTested(
      companyId,
      type as IntegrationType,
      testResult.success,
      testResult.error
    );

    if (testResult.success) {
      res.json({
        success: true,
        data: { message: 'Connection test successful' },
      });
    } else {
      res.status(400).json({
        success: false,
        error: { message: testResult.error || 'Connection test failed' },
      });
    }
  })
);

// DELETE /api/integrations/:type - Delete integration
router.delete(
  '/:type',
  validate(integrationTypeValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { type } = req.params;

    const integration = await credentialService.getIntegration(companyId, type as IntegrationType);

    if (!integration) {
      throw new NotFoundError(`Integration ${type} not found`);
    }

    await credentialService.deleteIntegration(companyId, type as IntegrationType);

    res.json({
      success: true,
      data: { message: `Integration ${type} deleted successfully` },
    });
  })
);

export default router;
