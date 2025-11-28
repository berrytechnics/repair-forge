// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Workaround for Jest/Node 23 compatibility issue with strip-ansi
// This is a known issue: https://github.com/jestjs/jest/issues/14305
// Tests work correctly in CI (Node 22) and will be fixed in future Jest versions
if (typeof process !== 'undefined' && process.version.startsWith('v23')) {
  // Suppress the error for Node 23 - tests will work in CI with Node 22
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    if (args[0]?.includes?.('stripAnsi is not a function')) {
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
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock window.localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock as Storage

// Mock window.sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock as Storage

