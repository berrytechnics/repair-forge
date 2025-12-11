// Patch module system before Jest loads to fix strip-ansi compatibility
const Module = require('module')
const originalRequire = Module.prototype.require
Module.prototype.require = function (id, ...args) {
  if (id === 'strip-ansi') {
    try {
      return require('strip-ansi-cjs')
    } catch {
      return originalRequire.apply(this, [id, ...args])
    }
  }
  return originalRequire.apply(this, [id, ...args])
}

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFiles: ['<rootDir>/src/__tests__/setup-before.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Map strip-ansi to CommonJS version for Jest's internal dependencies
    '^strip-ansi$': require.resolve('strip-ansi-cjs'),
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/e2e/**',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/e2e/',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
