import { login, register, logout, getCurrentUser, restoreTokenFromStorage } from '@/lib/api'
import * as apiModule from '@/lib/api'

// Mock axios
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios')
  return {
    ...actualAxios,
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
  }
})

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
})

describe('Auth API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    sessionStorageMock.getItem.mockReturnValue(null)
  })

  describe('login', () => {
    it('stores tokens in localStorage when rememberMe is true', async () => {
      const mockApi = require('@/lib/api').default
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user-1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'admin',
              permissions: [],
            },
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-456',
          },
        },
      }

      mockApi.post = jest.fn().mockResolvedValue(mockResponse)

      const credentials = { email: 'test@example.com', password: 'password123' }
      await login(credentials, true)

      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'access-token-123')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token-456')
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('accessToken')
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('refreshToken')
    })

    it('stores tokens in sessionStorage when rememberMe is false', async () => {
      const mockApi = require('@/lib/api').default
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user-1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'admin',
              permissions: [],
            },
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-456',
          },
        },
      }

      mockApi.post = jest.fn().mockResolvedValue(mockResponse)

      const credentials = { email: 'test@example.com', password: 'password123' }
      await login(credentials, false)

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'access-token-123')
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token-456')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken')
    })

    it('clears impersonation state on login', async () => {
      const mockApi = require('@/lib/api').default
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user-1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'admin',
              permissions: [],
            },
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-456',
          },
        },
      }

      mockApi.post = jest.fn().mockResolvedValue(mockResponse)

      const credentials = { email: 'test@example.com', password: 'password123' }
      await login(credentials, true)

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('impersonateCompanyId')
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('impersonateCompanyId')
    })

    it('throws error when login fails', async () => {
      const mockApi = require('@/lib/api').default
      const mockResponse = {
        data: {
          success: false,
          error: {
            message: 'Invalid credentials',
          },
        },
      }

      mockApi.post = jest.fn().mockResolvedValue(mockResponse)

      const credentials = { email: 'test@example.com', password: 'wrong' }
      
      await expect(login(credentials)).rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    it('stores tokens in localStorage when rememberMe is true', async () => {
      const mockApi = require('@/lib/api').default
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user-1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'admin',
              permissions: [],
            },
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-456',
          },
        },
      }

      mockApi.post = jest.fn().mockResolvedValue(mockResponse)

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      }
      await register(userData, true)

      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'access-token-123')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token-456')
    })

    it('clears impersonation state on register', async () => {
      const mockApi = require('@/lib/api').default
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user-1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'admin',
              permissions: [],
            },
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-456',
          },
        },
      }

      mockApi.post = jest.fn().mockResolvedValue(mockResponse)

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      }
      await register(userData, true)

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('impersonateCompanyId')
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('impersonateCompanyId')
    })
  })

  describe('logout', () => {
    it('clears tokens from both storage types', () => {
      logout()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken')
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('accessToken')
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('refreshToken')
    })

    it('clears impersonation state', () => {
      logout()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('impersonateCompanyId')
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('impersonateCompanyId')
    })
  })

  describe('getCurrentUser', () => {
    it('returns user data on success', async () => {
      const mockApi = require('@/lib/api').default
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        permissions: ['customers.read'],
      }

      const mockResponse = {
        data: {
          success: true,
          data: mockUser,
        },
      }

      mockApi.get = jest.fn().mockResolvedValue(mockResponse)

      const user = await getCurrentUser()

      expect(user).toEqual(mockUser)
    })

    it('throws error when request fails', async () => {
      const mockApi = require('@/lib/api').default
      const mockResponse = {
        data: {
          success: false,
          error: {
            message: 'Unauthorized',
          },
        },
      }

      mockApi.get = jest.fn().mockResolvedValue(mockResponse)

      await expect(getCurrentUser()).rejects.toThrow('Unauthorized')
    })
  })

  describe('restoreTokenFromStorage', () => {
    it('restores token from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('stored-token-123')
      
      restoreTokenFromStorage()

      expect(localStorageMock.getItem).toHaveBeenCalledWith('accessToken')
    })

    it('restores token from sessionStorage if localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)
      sessionStorageMock.getItem.mockReturnValue('session-token-456')
      
      restoreTokenFromStorage()

      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('accessToken')
    })

    it('does nothing if no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      sessionStorageMock.getItem.mockReturnValue(null)
      
      restoreTokenFromStorage()

      // Should not throw or cause errors
      expect(localStorageMock.getItem).toHaveBeenCalled()
    })
  })
})




