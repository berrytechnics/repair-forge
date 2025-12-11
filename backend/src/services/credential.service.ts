// src/services/credential.service.ts
import companyService from './company.service.js';
import { encryptCredentials, decryptCredentials } from '../utils/encryption.js';
import { NotFoundError, BadRequestError } from '../config/errors.js';
import { IntegrationConfig, IntegrationType } from '../config/integrations.js';

export interface IntegrationCredentials {
  [key: string]: string; // e.g., { apiKey: 'plaintext_value', secret: 'plaintext_value' }
}

export interface SaveIntegrationDto {
  provider: string;
  enabled: boolean;
  credentials: IntegrationCredentials; // Plaintext credentials
  settings?: Record<string, unknown>;
}

/**
 * Credential management service for storing and retrieving encrypted API keys
 * All credentials are stored encrypted in companies.settings.integrations
 */
export class CredentialService {
  /**
   * Get integration configuration for a company
   * Returns config with encrypted credentials (never decrypted)
   */
  async getIntegration(
    companyId: string,
    type: IntegrationType
  ): Promise<IntegrationConfig | null> {
    const company = await companyService.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const integrations = (company.settings?.integrations as Record<string, IntegrationConfig>) || {};
    return integrations[type] || null;
  }

  /**
   * Save integration configuration with encrypted credentials
   */
  async saveIntegration(
    companyId: string,
    type: IntegrationType,
    data: SaveIntegrationDto
  ): Promise<IntegrationConfig> {
    const company = await companyService.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Encrypt credentials before storing
    const encryptedCredentials = encryptCredentials(data.credentials);

    // Merge with existing integrations
    const existingIntegrations = (company.settings?.integrations as Record<string, IntegrationConfig>) || {};
    const now = new Date().toISOString();

    const updatedIntegrations = {
      ...existingIntegrations,
      [type]: {
        type,
        provider: data.provider,
        enabled: data.enabled ?? true,
        credentials: encryptedCredentials, // Store encrypted
        settings: data.settings || {},
        updatedAt: now,
        createdAt: existingIntegrations[type]?.createdAt || now,
      },
    };

    // Update company settings
    await companyService.update(companyId, {
      settings: {
        ...company.settings,
        integrations: updatedIntegrations,
      },
    });

    return updatedIntegrations[type];
  }

  /**
   * Get decrypted credentials for use (only when needed for API calls)
   * This should be called sparingly and credentials should not be logged
   */
  async getDecryptedCredentials(
    companyId: string,
    type: IntegrationType
  ): Promise<Record<string, string>> {
    const integration = await this.getIntegration(companyId, type);
    if (!integration) {
      throw new NotFoundError(`Integration ${type} not found`);
    }

    if (!integration.enabled) {
      throw new BadRequestError(`Integration ${type} is disabled`);
    }

    // Decrypt credentials only when needed
    return decryptCredentials(integration.credentials);
  }

  /**
   * Delete integration configuration
   */
  async deleteIntegration(companyId: string, type: IntegrationType): Promise<void> {
    const company = await companyService.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const integrations = (company.settings?.integrations as Record<string, IntegrationConfig>) || {};
    delete integrations[type];

    await companyService.update(companyId, {
      settings: {
        ...company.settings,
        integrations,
      },
    });
  }

  /**
   * Update integration metadata without touching credentials
   */
  async updateIntegrationMetadata(
    companyId: string,
    type: IntegrationType,
    metadata: Partial<IntegrationConfig>
  ): Promise<IntegrationConfig> {
    const integration = await this.getIntegration(companyId, type);
    if (!integration) {
      throw new NotFoundError(`Integration ${type} not found`);
    }

    // Merge metadata but preserve existing credentials
    const updated = {
      ...integration,
      ...metadata,
      credentials: integration.credentials, // Preserve encrypted credentials
      updatedAt: new Date().toISOString(),
    };

    const company = await companyService.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const integrations = (company.settings?.integrations as Record<string, IntegrationConfig>) || {};
    integrations[type] = updated;

    await companyService.update(companyId, {
      settings: {
        ...company.settings,
        integrations,
      },
    });

    return updated;
  }

  /**
   * Update last tested timestamp and clear error
   */
  async markIntegrationTested(
    companyId: string,
    type: IntegrationType,
    success: boolean,
    error?: string
  ): Promise<void> {
    await this.updateIntegrationMetadata(companyId, type, {
      lastTested: new Date().toISOString(),
      lastError: success ? undefined : error,
    });
  }
}

export default new CredentialService();
