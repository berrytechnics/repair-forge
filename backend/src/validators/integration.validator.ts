import { body, param } from 'express-validator';
import { EMAIL_PROVIDERS, PAYMENT_PROVIDERS } from '../config/integrations.js';

/**
 * Validation rules for saving email integration
 */
export const saveEmailIntegrationValidation = [
  body('provider')
    .if((value, { req }) => req.params?.type === 'email')
    .exists()
    .withMessage('Provider is required')
    .trim()
    .notEmpty()
    .withMessage('Provider is required')
    .isIn(Object.keys(EMAIL_PROVIDERS))
    .withMessage(`Provider must be one of: ${Object.keys(EMAIL_PROVIDERS).join(', ')}`),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('credentials')
    .if((value, { req }) => req.params?.type === 'email')
    .exists()
    .withMessage('Credentials are required')
    .isObject()
    .withMessage('Credentials must be an object'),
  body('credentials.apiKey')
    .if((value, { req }) => req.params?.type === 'email')
    .exists()
    .withMessage('API key is required')
    .trim()
    .notEmpty()
    .withMessage('API key is required')
    .isLength({ min: 10 })
    .withMessage('API key must be at least 10 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  body('settings.fromEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('From email must be a valid email address')
    .isLength({ max: 255 })
    .withMessage('From email must not exceed 255 characters'),
  body('settings.fromName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('From name must not exceed 100 characters'),
  body('settings.replyTo')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Reply-to email must be a valid email address')
    .isLength({ max: 255 })
    .withMessage('Reply-to email must not exceed 255 characters'),
];

/**
 * Validation rules for integration type parameter
 */
export const integrationTypeValidation = [
  param('type')
    .exists()
    .withMessage('Integration type is required')
    .trim()
    .notEmpty()
    .withMessage('Integration type is required')
    .isIn(['email', 'payment', 'sms'])
    .withMessage('Integration type must be one of: email, payment, sms'),
];

/**
 * Validation rules for saving payment integration
 */
export const savePaymentIntegrationValidation = [
  body('provider')
    .if((value, { req }) => req.params?.type === 'payment')
    .exists()
    .withMessage('Provider is required')
    .trim()
    .notEmpty()
    .withMessage('Provider is required')
    .isIn(Object.keys(PAYMENT_PROVIDERS))
    .withMessage(`Provider must be one of: ${Object.keys(PAYMENT_PROVIDERS).join(', ')}`),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('credentials')
    .if((value, { req }) => req.params?.type === 'payment')
    .exists()
    .withMessage('Credentials are required')
    .isObject()
    .withMessage('Credentials must be an object'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  body('settings.testMode')
    .optional()
    .isBoolean()
    .withMessage('Test mode must be a boolean'),
  body('settings.webhookUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Webhook URL must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('Webhook URL must not exceed 500 characters'),
  // Square credentials validation
  body('credentials.accessToken')
    .if((value, { req }) => req.params?.type === 'payment' && req.body?.provider === 'square')
    .exists()
    .withMessage('Access token is required for Square')
    .trim()
    .notEmpty()
    .withMessage('Access token is required')
    .isLength({ min: 10 })
    .withMessage('Access token must be at least 10 characters'),
  body('credentials.applicationId')
    .if((value, { req }) => req.params?.type === 'payment' && req.body?.provider === 'square')
    .exists()
    .withMessage('Application ID is required for Square')
    .trim()
    .notEmpty()
    .withMessage('Application ID is required'),
  body('credentials.locationId')
    .if((value, { req }) => req.params?.type === 'payment' && req.body?.provider === 'square')
    .exists()
    .withMessage('Location ID is required for Square')
    .trim()
    .notEmpty()
    .withMessage('Location ID is required'),
];

/**
 * Validation rules for testing integration
 */
export const testIntegrationValidation = [
  ...integrationTypeValidation,
];
