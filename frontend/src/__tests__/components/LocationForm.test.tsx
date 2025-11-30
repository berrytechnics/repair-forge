import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationForm from '@/components/LocationForm'
import * as locationApi from '@/lib/api/location.api'

// Mock the API module
jest.mock('@/lib/api/location.api')
const mockedLocationApi = locationApi as jest.Mocked<typeof locationApi>

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}))

describe('LocationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders form fields correctly', () => {
      render(<LocationForm />)

      expect(screen.getByRole('textbox', { name: /^name\s/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('shows "Create Location" button in create mode', () => {
      render(<LocationForm />)
      expect(screen.getByRole('button', { name: /create location/i })).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('validates required name field', async () => {
      const user = userEvent.setup()
      render(<LocationForm />)

      const submitButton = screen.getByRole('button', { name: /create location|update location/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      const { container } = render(<LocationForm />)

      const nameInput = screen.getByRole('textbox', { name: /^name\s/i })
      await user.type(nameInput, 'Test Location')

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      await user.clear(emailInput)
      await user.type(emailInput, 'invalid-email')
      
      // Wait for state to update
      await waitFor(() => {
        expect(emailInput.value).toBe('invalid-email')
      })

      // Submit the form directly
      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      }, { timeout: 3000 })
      
      // Verify API was not called
      expect(mockedLocationApi.createLocation).not.toHaveBeenCalled()
    })

    it('validates phone format', async () => {
      const user = userEvent.setup()
      render(<LocationForm />)

      const nameInput = screen.getByRole('textbox', { name: /^name\s/i })
      await user.type(nameInput, 'Test Location')

      const phoneInput = screen.getByLabelText(/phone/i)
      await user.type(phoneInput, '123') // Too short

      const submitButton = screen.getByRole('button', { name: /create location|update location/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/valid phone number/i)).toBeInTheDocument()
      })
    })

    it('clears errors when field is corrected', async () => {
      const user = userEvent.setup()
      render(<LocationForm />)

      const nameInput = screen.getByRole('textbox', { name: /^name\s/i })
      const submitButton = screen.getByRole('button', { name: /create location|update location/i })

      // Submit empty form
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })

      // Fix the field
      await user.type(nameInput, 'Test Location')

      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('loading state', () => {
    it('shows loading state when fetching location data', () => {
      mockedLocationApi.getLocationById.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<LocationForm locationId="123" />)

      expect(screen.getByText(/loading location data/i)).toBeInTheDocument()
    })
  })

  describe('submit error handling', () => {
    it('displays submit error on API failure', async () => {
      const user = userEvent.setup()
      mockedLocationApi.createLocation.mockRejectedValue(new Error('API Error'))

      render(<LocationForm />)

      const nameInput = screen.getByRole('textbox', { name: /^name\s/i })
      await user.type(nameInput, 'Test Location')

      const submitButton = screen.getByRole('button', { name: /create location|update location/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/API Error/i)).toBeInTheDocument()
      })
    })
  })

  describe('form submission', () => {
    it('calls createLocation API on submit in create mode', async () => {
      const user = userEvent.setup()
      const mockResponse = {
        success: true,
        data: {
          id: '123',
          company_id: 'company-123',
          name: 'Test Location',
          is_active: true,
          taxRate: 0,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      }
      mockedLocationApi.createLocation.mockResolvedValue(mockResponse)

      render(<LocationForm />)

      await user.type(screen.getByRole('textbox', { name: /^name\s/i }), 'Test Location')

      const submitButton = screen.getByRole('button', { name: /create location|update location/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockedLocationApi.createLocation).toHaveBeenCalledWith(
          expect.objectContaining({
          name: 'Test Location',
          isActive: true,
            taxRate: 0,
            taxName: 'Sales Tax',
            taxEnabled: true,
            taxInclusive: false,
        })
        )
      })
    })
  })
})

