import { render, screen, waitFor } from '@testing-library/react'
import { UserProvider, useUser } from '@/lib/UserContext'
import { getCurrentUser } from '@/lib/api'
import { getCurrentUserLocations } from '@/lib/api/location.api'

// Mock the API modules
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  getCurrentUser: jest.fn(),
}))

jest.mock('@/lib/api/location.api', () => ({
  ...jest.requireActual('@/lib/api/location.api'),
  getCurrentUserLocations: jest.fn(),
}))

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockedGetCurrentUserLocations = getCurrentUserLocations as jest.MockedFunction<typeof getCurrentUserLocations>

// Mock Next.js router
const mockPathname = '/dashboard'
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

// Test component that uses the context
const TestComponent = () => {
  const { user, isLoading, hasPermission, hasAnyPermission, hasAllPermissions } = useUser()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div data-testid="user">{user ? `${user.firstName} ${user.lastName}` : 'No user'}</div>
      <div data-testid="has-permission">{hasPermission('customers.read') ? 'true' : 'false'}</div>
      <div data-testid="has-any-permission">
        {hasAnyPermission(['customers.read', 'tickets.read']) ? 'true' : 'false'}
      </div>
      <div data-testid="has-all-permissions">
        {hasAllPermissions(['customers.read', 'tickets.read']) ? 'true' : 'false'}
      </div>
    </div>
  )
}

describe('UserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Recreate localStorage mocks after clearing (clearAllMocks removes the jest.fn() instances)
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue(null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(global, 'sessionStorage', {
      value: {
        getItem: jest.fn().mockReturnValue(null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      },
      writable: true,
      configurable: true,
    })
  })

  describe('when user is authenticated', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin' as const,
      permissions: ['customers.read', 'customers.create', 'tickets.read'],
      currentLocationId: 'location-123',
    }

    const mockLocations = [
      { id: 'location-123', name: 'Main Location' },
      { id: 'location-456', name: 'Secondary Location' },
    ]

    it('provides user data when authenticated', async () => {
      ;(global.localStorage.getItem as jest.Mock).mockReturnValue('mock-token')
      mockedGetCurrentUser.mockResolvedValue(mockUser)
      mockedGetCurrentUserLocations.mockResolvedValue({
        success: true,
        data: mockLocations,
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      expect(screen.getByTestId('user')).toHaveTextContent('Test User')
    })

    it('hasPermission returns true when user has permission', async () => {
      ;(global.localStorage.getItem as jest.Mock).mockReturnValue('mock-token')
      mockedGetCurrentUser.mockResolvedValue(mockUser)
      mockedGetCurrentUserLocations.mockResolvedValue({
        success: true,
        data: mockLocations,
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('has-permission')).toHaveTextContent('true')
      })
    })

    it('hasPermission returns false when user does not have permission', async () => {
      ;(global.localStorage.getItem as jest.Mock).mockReturnValue('mock-token')
      mockedGetCurrentUser.mockResolvedValue(mockUser)
      mockedGetCurrentUserLocations.mockResolvedValue({
        success: true,
        data: mockLocations,
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('has-permission')).toHaveTextContent('true')
      })

      // Test with a permission the user doesn't have
      const TestComponentNoPermission = () => {
        const { hasPermission } = useUser()
        return (
          <div data-testid="no-permission">
            {hasPermission('invoices.delete') ? 'true' : 'false'}
          </div>
        )
      }

      render(
        <UserProvider>
          <TestComponentNoPermission />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('no-permission')).toHaveTextContent('false')
      })
    })

    it('hasAnyPermission returns true when user has at least one permission', async () => {
      ;(global.localStorage.getItem as jest.Mock).mockReturnValue('mock-token')
      mockedGetCurrentUser.mockResolvedValue(mockUser)
      mockedGetCurrentUserLocations.mockResolvedValue({
        success: true,
        data: mockLocations,
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('has-any-permission')).toHaveTextContent('true')
      })
    })

    it('hasAllPermissions returns true when user has all permissions', async () => {
      ;(global.localStorage.getItem as jest.Mock).mockReturnValue('mock-token')
      mockedGetCurrentUser.mockResolvedValue(mockUser)
      mockedGetCurrentUserLocations.mockResolvedValue({
        success: true,
        data: mockLocations,
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('has-all-permissions')).toHaveTextContent('true')
      })
    })

    it('hasAllPermissions returns false when user is missing a permission', async () => {
      const userWithoutAllPermissions = {
        ...mockUser,
        permissions: ['customers.read'],
      }

      ;(global.localStorage.getItem as jest.Mock).mockReturnValue('mock-token')
      mockedGetCurrentUser.mockResolvedValue(userWithoutAllPermissions)
      mockedGetCurrentUserLocations.mockResolvedValue({
        success: true,
        data: mockLocations,
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('has-all-permissions')).toHaveTextContent('false')
      })
    })
  })

  describe('when user is not authenticated', () => {
    it('provides null user when no token exists', async () => {
      ;(global.localStorage.getItem as jest.Mock).mockReturnValue(null)
      ;(global.sessionStorage.getItem as jest.Mock).mockReturnValue(null)

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      expect(screen.getByTestId('user')).toHaveTextContent('No user')
    })

    it('handles loading state correctly', () => {
      ;(global.localStorage.getItem as jest.Mock).mockReturnValue('mock-token')
      mockedGetCurrentUser.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })
})
