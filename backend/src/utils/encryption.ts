import crypto from 'crypto';
import logger from '../config/logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000;

/**
 * Get encryption key from environment variable
 * In production, consider using a key management service (AWS KMS, HashiCorp Vault, etc.)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Derive a consistent key from the environment variable
  // Using PBKDF2 for key derivation with a fixed salt
  return crypto.pbkdf2Sync(
    key,
    'repair-tix-salt', // Fixed salt for key derivation
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypt sensitive data (API keys, secrets)
 * Returns format: iv:tag:encrypted
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Combine IV + tag + encrypted data
  // Format: iv:tag:encrypted
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 * Expects format: iv:tag:encrypted
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty string');
  }

  const key = getEncryptionKey();

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected format: iv:tag:encrypted');
  }

  const [ivHex, tagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt an object of credentials
 */
export function encryptCredentials(credentials: Record<string, string>): Record<string, string> {
  const encrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(credentials)) {
    // Skip undefined/null values
    if (value === undefined || value === null) {
      continue;
    }
    // Preserve empty strings as-is (they don't contain sensitive data)
    if (value === '') {
      encrypted[key] = '';
    } else if (value && value.trim() !== '') {
      encrypted[key] = encrypt(value);
    }
  }

  return encrypted;
}

/**
 * Decrypt an object of credentials
 */
export function decryptCredentials(encrypted: Record<string, string>): Record<string, string> {
  const decrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(encrypted)) {
    // Skip undefined/null values
    if (value === undefined || value === null) {
      continue;
    }
    // Empty strings are stored as-is (not encrypted)
    if (value === '') {
      decrypted[key] = '';
    } else if (value && value.trim() !== '') {
      try {
        // Check if it looks like encrypted data (has colons separating iv:tag:encrypted)
        const parts = value.split(':');
        if (parts.length === 3) {
          // Looks encrypted, try to decrypt
          decrypted[key] = decrypt(value);
        } else {
          // Doesn't look encrypted, might be plaintext (for testing or legacy data)
          decrypted[key] = value;
        }
      } catch (error) {
        // If decryption fails, check if it looks encrypted
        const parts = value.split(':');
        if (parts.length === 3) {
          // It looked encrypted but failed - this is a real error
          // Log it but continue with other credentials
          logger?.warn?.(`Failed to decrypt credential ${key}, skipping: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Skip this credential rather than failing entirely
          continue;
        } else {
          // Doesn't look encrypted, use as plaintext
          decrypted[key] = value;
        }
      }
    }
  }

  return decrypted;
}
