import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../app.js';
import credentialService from '../../services/credential.service.js';
import { createTestUsersWithRoles } from '../helpers/auth.helper.js';
import { cleanupTestData } from '../helpers/db.helper.js';
import { createTestCompany } from '../helpers/seed.helper.js';

// Create mock functions - must be defined before jest.mock() hoisting
const mockTestConnectionFn = jest.fn();
const mockSendEmailFn = jest.fn();

// Type definition for global mocks
interface SendGridAdapterMocks {
  testConnection: jest.Mock;
  sendEmail: jest.Mock;
}

declare global {
  // eslint-disable-next-line no-var
  var __sendgridAdapterMocks: SendGridAdapterMocks | undefined;
}

// Store mocks globally so they're accessible
global.__sendgridAdapterMocks = {
  testConnection: mockTestConnectionFn,
  sendEmail: mockSendEmailFn,
};

// Mock SendGrid adapter
jest.mock('../../integrations/email/sendgrid.adapter.js', () => {
  // Access the mocks from global
  const mocks = global.__sendgridAdapterMocks;
  if (!mocks) {
    throw new Error('SendGrid adapter mocks not initialized');
  }
  return {
    __esModule: true,
    default: {
      testConnection: mocks.testConnection,
      sendEmail: mocks.sendEmail,
    },
    testConnection: mocks.testConnection,
    sendEmail: mocks.sendEmail,
  };
});

// Mock fetch for SendGrid API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Integration Routes Integration Tests', () => {
  let testCompanyId: string;
  let testUserIds: string[] = [];
  let adminToken: string;
  let technicianToken: string;

  beforeEach(async () => {
    testCompanyId = await createTestCompany();
    const users = await createTestUsersWithRoles(testCompanyId);
    testUserIds.push(users.admin.userId, users.technician.userId);
    adminToken = users.admin.token;
    technicianToken = users.technician.token;
  });

  afterEach(async () => {
    await cleanupTestData({
      companyIds: [testCompanyId],
      userIds: testUserIds,
    });
    testUserIds = [];
    jest.clearAllMocks();
    // Reset mock implementations
    mockTestConnectionFn.mockReset();
    mockSendEmailFn.mockReset();
  });

  describe('GET /api/integrations/:type', () => {
    it('should return 404 if integration not configured', async () => {
      const response = await request(app)
        .get('/api/integrations/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Integration not found');
    });

    it('should return integration config with masked credentials', async () => {
      // Create integration
      await credentialService.saveIntegration(testCompanyId, 'email', {
        provider: 'sendgrid',
        enabled: true,
        credentials: { apiKey: 'SG.test123456789' },
        settings: { fromEmail: 'noreply@test.com' },
      });

      const response = await request(app)
        .get('/api/integrations/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('email');
      expect(response.body.data.provider).toBe('sendgrid');
      expect(response.body.data.enabled).toBe(true);
      // Credentials should be masked
      expect(response.body.data.credentials.apiKey).toContain('****');
      expect(response.body.data.credentials.apiKey).not.toBe('SG.test123456789');
    });

    it('should require admin access', async () => {
      const response = await request(app)
        .get('/api/integrations/email')
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(403);

      expect(response.body.error.message).toContain('Access denied');
    });
  });

  describe('POST /api/integrations/:type', () => {
    it('should save email integration configuration', async () => {
      const response = await request(app)
        .post('/api/integrations/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          provider: 'sendgrid',
          enabled: true,
          credentials: {
            apiKey: 'SG.test123456789',
          },
          settings: {
            fromEmail: 'noreply@test.com',
            fromName: 'Test Company',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('email');
      expect(response.body.data.provider).toBe('sendgrid');
      expect(response.body.data.credentials.apiKey).toContain('****'); // Masked
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/integrations/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          provider: 'sendgrid',
          // Missing credentials
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.errors).toBeTruthy();
    });

    it('should require admin access', async () => {
      await request(app)
        .post('/api/integrations/email')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({
          provider: 'sendgrid',
          credentials: { apiKey: 'SG.test' },
          settings: { fromEmail: 'test@test.com' },
        })
        .expect(403);
    });
  });

  describe('POST /api/integrations/:type/test', () => {
    beforeEach(async () => {
      // Clear all mocks before each test
      jest.clearAllMocks();
      mockTestConnectionFn.mockReset();

      await credentialService.saveIntegration(testCompanyId, 'email', {
        provider: 'sendgrid',
        enabled: true,
        credentials: { apiKey: 'SG.test123456789' },
        settings: { fromEmail: 'noreply@test.com' },
      });
    });

    it('should return 404 if integration not configured', async () => {
      await credentialService.deleteIntegration(testCompanyId, 'email');

      const response = await request(app)
        .post('/api/integrations/email/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error.message).toContain('not configured');
    });
  });

  describe('DELETE /api/integrations/:type', () => {
    beforeEach(async () => {
      await credentialService.saveIntegration(testCompanyId, 'email', {
        provider: 'sendgrid',
        enabled: true,
        credentials: { apiKey: 'SG.test123456789' },
        settings: {},
      });
    });

    it('should delete integration configuration', async () => {
      const response = await request(app)
        .delete('/api/integrations/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('deleted successfully');

      // Verify it's deleted
      await request(app)
        .get('/api/integrations/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should require admin access', async () => {
      await request(app)
        .delete('/api/integrations/email')
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(403);
    });
  });
});
