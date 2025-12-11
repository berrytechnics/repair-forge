import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerForm from '@/components/CustomerForm'
import * as customerApi from '@/lib/api/customer.api'

// Mock the API module
jest.mock('@/lib/api/customer.api')
const mockedCustomerApi = customerApi as jest.Mocked<typeof customerApi>

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}))

describe('CustomerForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders form fields correctly', () => {
      render(<CustomerForm />)

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    })

    it('shows "Add New Customer" heading in create mode', () => {
      render(<CustomerForm />)
      expect(screen.getByText(/add new customer/i)).toBeInTheDocument()
    })

    it('shows "Edit Customer" heading in update mode', async () => {
      const mockCustomer = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      mockedCustomerApi.getCustomerById.mockResolvedValue({
        success: true,
        data: mockCustomer,
      })

      render(<CustomerForm customerId="123" />)

      await waitFor(() => {
        expect(screen.getByText(/edit customer/i)).toBeInTheDocument()
      })
    })
  })

  describe('validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<CustomerForm />)

      const submitButton = screen.getByRole('button', { name: /create customer|save/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      const { container } = render(<CustomerForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'John')

      const lastNameInput = screen.getByLabelText(/last name/i)
      await user.type(lastNameInput, 'Doe')

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
      expect(mockedCustomerApi.createCustomer).not.toHaveBeenCalled()
    })

    it('validates phone format', async () => {
      const user = userEvent.setup()
      render(<CustomerForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'John')

      const lastNameInput = screen.getByLabelText(/last name/i)
      await user.type(lastNameInput, 'Doe')

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'john@example.com')

      const phoneInput = screen.getByLabelText(/phone/i)
      await user.type(phoneInput, '123') // Too short

      const submitButton = screen.getByRole('button', { name: /create customer|save/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/valid phone number/i)).toBeInTheDocument()
      })
    })

    it('clears errors when field is corrected', async () => {
      const user = userEvent.setup()
      render(<CustomerForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const submitButton = screen.getByRole('button', { name: /create customer|save/i })

      // Submit empty form
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
      })

      // Fix the field
      await user.type(firstNameInput, 'John')

      await waitFor(() => {
        expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('loading state', () => {
    it('shows loading state when fetching customer data', () => {
      mockedCustomerApi.getCustomerById.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<CustomerForm customerId="123" />)

      expect(screen.getByText(/loading customer data/i)).toBeInTheDocument()
    })
  })

  describe('submit error handling', () => {
    it('displays submit error on API failure', async () => {
      const user = userEvent.setup()
      mockedCustomerApi.createCustomer.mockRejectedValue(new Error('API Error'))

      render(<CustomerForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'John')

      const lastNameInput = screen.getByLabelText(/last name/i)
      await user.type(lastNameInput, 'Doe')

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'john@example.com')

      const submitButton = screen.getByRole('button', { name: /create customer|save/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/API Error/i)).toBeInTheDocument()
      })
    })
  })

  describe('form submission', () => {
    it('calls createCustomer API on submit in create mode', async () => {
      const user = userEvent.setup()
      const mockResponse = {
        success: true,
        data: { id: '123', firstName: 'John', lastName: 'Doe', email: 'john@example.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      }
      mockedCustomerApi.createCustomer.mockResolvedValue(mockResponse)

      render(<CustomerForm />)

      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')

      const submitButton = screen.getByRole('button', { name: /create customer|save/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockedCustomerApi.createCustomer).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          notes: '',
        })
      })
    })
  })
})
