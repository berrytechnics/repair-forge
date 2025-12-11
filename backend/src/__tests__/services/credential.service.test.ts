import credentialService from '../../services/credential.service.js';
import { createTestCompany } from '../helpers/seed.helper.js';
import { cleanupTestData } from '../helpers/db.helper.js';

describe('CredentialService', () => {
  let testCompanyId: string;

  beforeEach(async () => {
    testCompanyId = await createTestCompany();
  });

  afterEach(async () => {
    try {
      await cleanupTestData({ companyIds: [testCompanyId] });
    } catch (error) {
      // Log but don't fail the test suite if cleanup has issues
      console.error('Error during cleanup:', error);
    }
  });

  describe('saveIntegration and getIntegration', () => {
    it('should save and retrieve email integration configuration', async () => {
      const config = {
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

      const saved = await credentialService.saveIntegration(
        testCompanyId,
        'email',
        config
      );

      expect(saved.type).toBe('email');
      expect(saved.provider).toBe('sendgrid');
      expect(saved.enabled).toBe(true);
      expect(saved.credentials.apiKey).toBeTruthy();
      expect(saved.credentials.apiKey).not.toBe('SG.test123456789'); // Should be encrypted
      expect(saved.settings?.fromEmail).toBe('noreply@test.com');

      const retrieved = await credentialService.getIntegration(testCompanyId, 'email');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.type).toBe('email');
      expect(retrieved?.provider).toBe('sendgrid');
      expect(retrieved?.enabled).toBe(true);
      expect(retrieved?.credentials.apiKey).toBeTruthy();
      expect(retrieved?.credentials.apiKey).not.toBe('SG.test123456789'); // Should be encrypted
    });

    it('should update existing integration configuration', async () => {
      // Create initial config
      await credentialService.saveIntegration(testCompanyId, 'email', {
        provider: 'sendgrid',
        enabled: true,
        credentials: { apiKey: 'SG.old-key' },
        settings: { fromEmail: 'old@test.com' },
      });

      // Update config
      const updated = await credentialService.saveIntegration(testCompanyId, 'email', {
        provider: 'sendgrid',
        enabled: false,
        credentials: { apiKey: 'SG.new-key' },
        settings: { fromEmail: 'new@test.com' },
      });

      expect(updated.enabled).toBe(false);
      expect(updated.settings?.fromEmail).toBe('new@test.com');

      const retrieved = await credentialService.getIntegration(testCompanyId, 'email');
      expect(retrieved?.enabled).toBe(false);
      expect(retrieved?.settings?.fromEmail).toBe('new@test.com');
    });
  });

  describe('getDecryptedCredentials', () => {
    it('should decrypt credentials when needed', async () => {
      const apiKey = 'SG.test123456789';
      await credentialService.saveIntegration(testCompanyId, 'email', {
        provider: 'sendgrid',
        enabled: true,
        credentials: { apiKey },
        settings: {},
      });

      const decrypted = await credentialService.getDecryptedCredentials(
        testCompanyId,
        'email'
      );

      expect(decrypted.apiKey).toBe(apiKey);
    });

    it('should throw error if integration not found', async () => {
      await expect(
        credentialService.getDecryptedCredentials(testCompanyId, 'email')
      ).rejects.toThrow('Integration email not found');
    });

    it('should throw error if integration is disabled', async () => {
      await credentialService.saveIntegration(testCompanyId, 'email', {
        provider: 'sendgrid',
        enabled: false,
        credentials: { apiKey: 'SG.test' },
        settings: {},
      });

      await expect(
        credentialService.getDecryptedCredentials(testCompanyId, 'email')
      ).rejects.toThrow('Integration email is disabled');
    });
  });

  describe('deleteIntegration', () => {
    it('should delete integration configuration', async () => {
      await credentialService.saveIntegration(testCompanyId, 'email', {
        provider: 'sendgrid',
        enabled: true,
        credentials: { apiKey: 'SG.test' },
        settings: {},
      });

      await credentialService.deleteIntegration(testCompanyId, 'email');

      const retrieved = await credentialService.getIntegration(testCompanyId, 'email');
      expect(retrieved).toBeNull();
    });
  });

  describe('markIntegrationTested', () => {
    it('should update last tested timestamp and clear error on success', async () => {
      await credentialService.saveIntegration(testCompanyId, 'email', {
        provider: 'sendgrid',
        enabled: true,
        credentials: { apiKey: 'SG.test' },
        settings: {},
      });

      await credentialService.markIntegrationTested(testCompanyId, 'email', true);

      const integration = await credentialService.getIntegration(testCompanyId, 'email');
      expect(integration?.lastTested).toBeTruthy();
      expect(integration?.lastError).toBeUndefined();
    });

    it('should update last tested timestamp and set error on failure', async () => {
      await credentialService.saveIntegration(testCompanyId, 'email', {
        provider: 'sendgrid',
        enabled: true,
        credentials: { apiKey: 'SG.test' },
        settings: {},
      });

      const errorMessage = 'Invalid API key';
      await credentialService.markIntegrationTested(
        testCompanyId,
        'email',
        false,
        errorMessage
      );

      const integration = await credentialService.getIntegration(testCompanyId, 'email');
      expect(integration?.lastTested).toBeTruthy();
      expect(integration?.lastError).toBe(errorMessage);
    });
  });
});
