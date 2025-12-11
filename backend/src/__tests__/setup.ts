// Test setup file
// This runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_ci_only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-minimum-32-characters-long-for-testing';

// Ensure database connection variables are set for tests
// These should match GitHub Actions test database configuration
if (!process.env.DB_HOST) {
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
}
if (!process.env.DB_PORT) {
  process.env.DB_PORT = process.env.DB_PORT || '5433';
}
if (!process.env.DB_USER) {
  process.env.DB_USER = process.env.DB_USER || 'test_user';
}
if (!process.env.DB_PASSWORD) {
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';
}
if (!process.env.DB_NAME) {
  process.env.DB_NAME = process.env.DB_NAME || 'test_db';
}

// Suppress console logs during tests (optional)
// Uncomment if you want to silence logs during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Export empty object to make this a proper ES module
export {};
