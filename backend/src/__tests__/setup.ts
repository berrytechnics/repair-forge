// Test setup file
// This runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';

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

