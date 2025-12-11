// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Workaround for Jest/strip-ansi compatibility issue
// This is a known issue: https://github.com/jestjs/jest/issues/14305
// Ensure strip-ansi CommonJS version is available for Jest reporters
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stripAnsi = require('strip-ansi-cjs')
  // Make stripAnsi available globally for Jest's internal use
  if (typeof global !== 'undefined') {
    // @ts-expect-error - Adding to global for Jest compatibility
    global.stripAnsi = typeof stripAnsi === 'function' ? stripAnsi : stripAnsi.default || stripAnsi
  }
  // Also ensure it's available in the module cache for require('strip-ansi')
  if (typeof require !== 'undefined' && require.cache) {
    try {
      // @ts-expect-error - Modifying require cache for Jest compatibility
      require.cache[require.resolve('strip-ansi')] = {
        exports: stripAnsi,
      }
    } catch {
      // Ignore if module resolution fails
    }
  }
} catch {
  // If strip-ansi is not available, provide a no-op function
  if (typeof global !== 'undefined') {
    // @ts-expect-error - Adding to global for Jest compatibility
    global.stripAnsi = (str: string) => str
  }
}

// Suppress console.error for stripAnsi errors
if (typeof process !== 'undefined') {
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('stripAnsi is not a function')) {
      return
    }
    originalError(...args)
  }
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js Image component
import React from 'react'
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    // eslint-disable-next-line react/react-in-jsx-scope
    return React.createElement('img', props)
  },
}))

// Mock window.localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
global.localStorage = localStorageMock as unknown as Storage

// Mock window.sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
global.sessionStorage = sessionStorageMock as unknown as Storage
