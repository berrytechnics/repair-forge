import { encrypt, decrypt, encryptCredentials, decryptCredentials } from '../../utils/encryption.js';

// Mock environment variable
const originalEnv = process.env.ENCRYPTION_KEY;

describe('Encryption Utilities', () => {
  beforeAll(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = 'test-encryption-key-minimum-32-characters-long-for-testing';
  });

  afterAll(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'test-api-key-12345';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');
    });

    it('should produce different encrypted values for same input (due to random IV)', () => {
      const plaintext = 'test-api-key-12345';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty string', () => {
      expect(() => encrypt('')).toThrow();
      expect(() => decrypt('')).toThrow();
    });

    it('should handle long strings', () => {
      const longString = 'a'.repeat(1000);
      const encrypted = encrypt(longString);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(longString);
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(specialChars);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(specialChars);
    });

    it('should throw error for invalid encrypted format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted data format');
    });
  });

  describe('encryptCredentials and decryptCredentials', () => {
    it('should encrypt and decrypt credentials object', () => {
      const credentials = {
        apiKey: 'SG.test123456789',
        secret: 'secret-key-12345',
      };

      const encrypted = encryptCredentials(credentials);
      const decrypted = decryptCredentials(encrypted);

      expect(decrypted.apiKey).toBe(credentials.apiKey);
      expect(decrypted.secret).toBe(credentials.secret);
      expect(encrypted.apiKey).not.toBe(credentials.apiKey);
      expect(encrypted.secret).not.toBe(credentials.secret);
    });

    it('should handle empty credentials object', () => {
      const credentials = {};
      const encrypted = encryptCredentials(credentials);
      const decrypted = decryptCredentials(encrypted);

      expect(Object.keys(decrypted)).toHaveLength(0);
    });

    it('should handle credentials with empty values', () => {
      const credentials = {
        apiKey: 'SG.test123456789',
        secret: '',
      };

      const encrypted = encryptCredentials(credentials);
      const decrypted = decryptCredentials(encrypted);

      expect(decrypted.apiKey).toBe(credentials.apiKey);
      expect(decrypted.secret).toBe('');
    });

    it('should skip invalid encrypted credentials and continue with valid ones', () => {
      // Use a format that looks encrypted (has colons) but will fail to decrypt
      // This simulates corrupted or invalid encrypted data
      const invalidEncrypted = {
        apiKey: 'invalid:encrypted:format', // Looks encrypted but will fail to decrypt
        secret: 'valid:format:here', // This will also fail unless it's actually valid encrypted data
      };

      // decryptCredentials now logs a warning and skips invalid credentials instead of throwing
      // This is more resilient - allows partial decryption
      const result = decryptCredentials(invalidEncrypted);

      // Invalid encrypted credentials should be skipped (not in result)
      // Since both will fail, both should be skipped
      expect(result.apiKey).toBeUndefined();
      expect(result.secret).toBeUndefined();
    });

    it('should handle plaintext credentials (non-encrypted format)', () => {
      // Credentials that don't look encrypted (no colons) are treated as plaintext
      const plaintextCredentials = {
        apiKey: 'plaintext-key',
        secret: 'plaintext-secret',
      };

      const result = decryptCredentials(plaintextCredentials);

      // Plaintext credentials should be returned as-is
      expect(result.apiKey).toBe('plaintext-key');
      expect(result.secret).toBe('plaintext-secret');
    });
  });
});
