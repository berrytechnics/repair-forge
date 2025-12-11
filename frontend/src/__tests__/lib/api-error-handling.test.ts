import { getErrorMessage } from '@/lib/api'
import { AxiosError } from 'axios'

describe('API Error Handling', () => {
  describe('getErrorMessage', () => {
    it('extracts error message from API response format', () => {
      const apiError = {
        response: {
          data: {
            success: false,
            error: {
              message: 'Validation failed',
            },
          },
        },
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('Validation failed')
    })

    it('combines validation errors from API response', () => {
      const apiError = {
        response: {
          data: {
            success: false,
            error: {
              message: 'Validation failed',
              errors: {
                email: 'Invalid email',
                password: 'Password too short',
              },
            },
          },
        },
      } as AxiosError

      const errorMessage = getErrorMessage(apiError)
      expect(errorMessage).toContain('Invalid email')
      expect(errorMessage).toContain('Password too short')
    })

    it('handles HTTP 400 status code', () => {
      const apiError = {
        response: {
          status: 400,
          data: {},
        },
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('Invalid request. Please check your input and try again.')
    })

    it('handles HTTP 401 status code', () => {
      const apiError = {
        response: {
          status: 401,
          data: {},
        },
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('You are not authorized. Please log in again.')
    })

    it('handles HTTP 403 status code', () => {
      const apiError = {
        response: {
          status: 403,
          data: {},
        },
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe("You don't have permission to perform this action.")
    })

    it('handles HTTP 404 status code', () => {
      const apiError = {
        response: {
          status: 404,
          data: {},
        },
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('The requested resource was not found.')
    })

    it('handles HTTP 409 status code', () => {
      const apiError = {
        response: {
          status: 409,
          data: {},
        },
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('A conflict occurred. The resource may have been modified.')
    })

    it('handles HTTP 422 status code', () => {
      const apiError = {
        response: {
          status: 422,
          data: {},
        },
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('Validation failed. Please check your input.')
    })

    it('handles HTTP 500 status code', () => {
      const apiError = {
        response: {
          status: 500,
          data: {},
        },
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('Server error. Please try again later.')
    })

    it('handles HTTP 503 status code', () => {
      const apiError = {
        response: {
          status: 503,
          data: {},
        },
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('Service temporarily unavailable. Please try again later.')
    })

    it('handles network timeout errors', () => {
      // AxiosError with code but no response (response property exists but is undefined)
      const apiError = {
        code: 'ECONNABORTED',
        message: 'timeout',
        response: undefined,
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('Request timeout. Please try again.')
    })

    it('handles network connection errors', () => {
      const apiError = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
        response: undefined,
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('Network error. Please check your connection and try again.')
    })

    it('handles regular Error objects', () => {
      const error = new Error('Something went wrong')
      expect(getErrorMessage(error)).toBe('Something went wrong')
    })

    it('handles unknown error types', () => {
      const unknownError = { someProperty: 'value' }
      expect(getErrorMessage(unknownError)).toBe('An unexpected error occurred. Please try again.')
    })

    it('handles errors with message but no response', () => {
      const apiError = {
        message: 'Request failed',
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('An unexpected error occurred. Please try again.')
    })

    it('prioritizes API error message over status code', () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            success: false,
            error: {
              message: 'Custom error message',
            },
          },
        },
      } as AxiosError

      expect(getErrorMessage(apiError)).toBe('Custom error message')
    })
  })
})
