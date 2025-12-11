import { jest } from '@jest/globals';
import { EmailIntegrationConfig } from '../../../config/integrations.js';

// Use manual mock - jest.mock will automatically use __mocks__/@sendgrid/mail.js
jest.mock('@sendgrid/mail');

import sendGridAdapter from '../../../integrations/email/sendgrid.adapter.js';

// Type definition for global mocks
interface SendGridMailMocks {
  setApiKey: jest.Mock;
  send: jest.Mock;
}

declare global {
  // eslint-disable-next-line no-var
  var __sendgridMailMocks: SendGridMailMocks | undefined;
}

// Access the mocks for use in tests
const mockSetApiKey = () => global.__sendgridMailMocks?.setApiKey || jest.fn();
const mockSend = () => global.__sendgridMailMocks?.send || jest.fn();

// Mock fetch for testConnection
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('SendGridAdapter', () => {
  const mockConfig: EmailIntegrationConfig = {
    type: 'email',
    provider: 'sendgrid',
    enabled: true,
    credentials: {
      apiKey: 'SG.test123456789',
    },
    settings: {
      fromEmail: 'noreply@test.com',
      fromName: 'Test Company',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to ensure they're fresh
    mockSetApiKey().mockReset();
    mockSend().mockReset();
  });

  describe('testConnection', () => {
    it('should return success for valid API key', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const result = await sendGridAdapter.testConnection(mockConfig);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sendgrid.com/v3/user/profile',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockConfig.credentials.apiKey}`,
          }),
        })
      );
    });

    it('should return error for invalid API key (401)', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const result = await sendGridAdapter.testConnection(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should return error when API key is missing', async () => {
      const configWithoutKey: EmailIntegrationConfig = {
        ...mockConfig,
        credentials: {},
      };

      const result = await sendGridAdapter.testConnection(configWithoutKey);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key not found');
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      const result = await sendGridAdapter.testConnection(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('sendEmail', () => {
    it('should throw error for missing API key', async () => {
      const configWithoutKey: EmailIntegrationConfig = {
        ...mockConfig,
        credentials: {},
      };

      await expect(
        sendGridAdapter.sendEmail(configWithoutKey, {
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test',
        })
      ).rejects.toThrow('SendGrid API key not found');
    });

    it('should throw error for missing from email', async () => {
      const configWithoutFrom: EmailIntegrationConfig = {
        ...mockConfig,
        settings: {} as EmailIntegrationConfig['settings'],
      };

      await expect(
        sendGridAdapter.sendEmail(configWithoutFrom, {
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test',
        })
      ).rejects.toThrow('From email address is required');
    });

    it('should handle SendGrid API errors', async () => {
      const error = new Error('Unauthorized');
      error.message = 'Unauthorized';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockSend() as any).mockRejectedValueOnce(error);

      await expect(
        sendGridAdapter.sendEmail(mockConfig, {
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test',
        })
      ).rejects.toThrow('Invalid SendGrid API key');
    });
  });
});
