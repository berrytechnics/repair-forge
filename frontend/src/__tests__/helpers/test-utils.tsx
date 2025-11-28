import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { UserProvider } from '@/lib/UserContext'
import { ThemeProvider } from '@/lib/ThemeContext'

// Mock user for testing
export const mockUser = (overrides?: Partial<Record<string, unknown>>) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin' as const,
  permissions: ['customers.read', 'customers.create', 'tickets.read'],
  currentLocationId: 'test-location-id',
  ...overrides,
})

// Mock location for testing
export const mockLocation = (overrides?: Partial<Record<string, unknown>>) => ({
  id: 'test-location-id',
  name: 'Test Location',
  ...overrides,
})

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

