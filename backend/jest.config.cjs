module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        isolatedModules: true,
      },
    }],
  },
  // Add .js to moduleFileExtensions so Jest can resolve them
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  resolver: '<rootDir>/jest-resolver.cjs',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  globalTeardown: '<rootDir>/jest-teardown-wrapper.cjs',
  testTimeout: 30000, // Increased timeout for integration tests with real database
  // Skip tests if no test files found (for CI)
  passWithNoTests: true,
  // Force Jest to exit after tests complete to prevent hanging on open handles
  forceExit: true,
  // Inject Jest globals for ES modules
  injectGlobals: true,
  // Limit max workers to reduce database connection pool pressure
  // This helps prevent connection pool exhaustion during parallel test execution
  maxWorkers: process.env.CI ? 2 : '50%',
};

