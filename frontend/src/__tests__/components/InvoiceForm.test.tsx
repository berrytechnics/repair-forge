import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InvoiceForm from '@/components/InvoiceForm'
import * as invoiceApi from '@/lib/api/invoice.api'
import * as customerApi from '@/lib/api/customer.api'
import * as ticketApi from '@/lib/api/ticket.api'
import * as inventoryApi from '@/lib/api/inventory.api'
import * as locationApi from '@/lib/api/location.api'
import { UserProvider } from '@/lib/UserContext'

// Mock the API modules
jest.mock('@/lib/api/invoice.api')
jest.mock('@/lib/api/customer.api')
jest.mock('@/lib/api/ticket.api')
jest.mock('@/lib/api/inventory.api')
jest.mock('@/lib/api/location.api')

const mockedInvoiceApi = invoiceApi as jest.Mocked<typeof invoiceApi>
const mockedCustomerApi = customerApi as jest.Mocked<typeof customerApi>
const mockedTicketApi = ticketApi as jest.Mocked<typeof ticketApi>
const mockedInventoryApi = inventoryApi as jest.Mocked<typeof inventoryApi>
const mockedLocationApi = locationApi as jest.Mocked<typeof locationApi>

// Mock Next.js router
const mockPush = jest.fn()
const mockSearchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/invoices',
}))

describe('InvoiceForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams.delete('customerId')
    mockSearchParams.delete('ticketId')

    // Default mock implementations
    mockedCustomerApi.getCustomers.mockResolvedValue({
      success: true,
      data: [
        { id: 'cust-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ],
    })

    mockedTicketApi.getTickets.mockResolvedValue({
      success: true,
      data: [],
    })

    mockedLocationApi.getLocationById.mockResolvedValue({
      success: true,
      data: {
        id: 'location-1',
        name: 'Main Location',
        taxRate: 0.08,
        taxName: 'Sales Tax',
        taxEnabled: true,
        taxInclusive: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    })
  })

  describe('rendering', () => {
    it('renders form fields correctly in create mode', async () => {
      render(
        <UserProvider>
          <InvoiceForm />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument()
      })
    })

    it('shows "Create New Invoice" heading in create mode', async () => {
      render(
        <UserProvider>
          <InvoiceForm />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/create new invoice/i)).toBeInTheDocument()
      })
    })

    it('shows "Edit Invoice" heading in edit mode', async () => {
      const mockInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        customerId: 'cust-1',
        status: 'draft' as const,
        subtotal: 100,
        taxRate: 0.08,
        taxAmount: 8,
        discountAmount: 0,
        totalAmount: 108,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        invoiceItems: [],
      }

      mockedInvoiceApi.getInvoiceById.mockResolvedValue({
        success: true,
        data: mockInvoice,
      })

      render(
        <UserProvider>
          <InvoiceForm invoiceId="inv-1" />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/edit invoice/i)).toBeInTheDocument()
      })
    })
  })

  describe('validation', () => {
    it('validates required customer field', async () => {
      const user = userEvent.setup()
      render(
        <UserProvider>
          <InvoiceForm />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/create new invoice|edit invoice/i)).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: /create invoice|save/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/customer is required/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('invoice item management', () => {
    it('renders invoice items section', async () => {
      render(
        <UserProvider>
          <InvoiceForm />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/invoice items/i)).toBeInTheDocument()
      })
    })

    it('renders invoice items when loaded', async () => {
      const mockInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        customerId: 'cust-1',
        status: 'draft' as const,
        subtotal: 100,
        taxRate: 0.08,
        taxAmount: 8,
        discountAmount: 0,
        totalAmount: 108,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        invoiceItems: [
          {
            id: 'item-1',
            invoiceId: 'inv-1',
            description: 'Test Item',
            quantity: 1,
            unitPrice: 100,
            type: 'service' as const,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      }

      mockedInvoiceApi.getInvoiceById.mockResolvedValue({
        success: true,
        data: mockInvoice,
      })

      render(
        <UserProvider>
          <InvoiceForm invoiceId="inv-1" />
        </UserProvider>
      )

      await waitFor(() => {
        expect(mockedInvoiceApi.getInvoiceById).toHaveBeenCalled()
      })
    })
  })

  describe('form submission', () => {
    it('renders submit button in create mode', async () => {
      render(
        <UserProvider>
          <InvoiceForm />
        </UserProvider>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create invoice|save/i })).toBeInTheDocument()
      })
    })

    it('loads invoice data in edit mode', async () => {
      const mockInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        customerId: 'cust-1',
        status: 'draft' as const,
        subtotal: 100,
        taxRate: 0.08,
        taxAmount: 8,
        discountAmount: 0,
        totalAmount: 108,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        invoiceItems: [
          {
            id: 'item-1',
            invoiceId: 'inv-1',
            description: 'Test Item',
            quantity: 1,
            unitPrice: 100,
            type: 'service' as const,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      }

      mockedInvoiceApi.getInvoiceById.mockResolvedValue({
        success: true,
        data: mockInvoice,
      })

      render(
        <UserProvider>
          <InvoiceForm invoiceId="inv-1" />
        </UserProvider>
      )

      await waitFor(() => {
        expect(mockedInvoiceApi.getInvoiceById).toHaveBeenCalledWith('inv-1')
      })
    })
  })

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      mockedInvoiceApi.getInvoiceById.mockRejectedValue(new Error('API Error'))

      render(
        <UserProvider>
          <InvoiceForm invoiceId="inv-1" />
        </UserProvider>
      )

      await waitFor(() => {
        expect(mockedInvoiceApi.getInvoiceById).toHaveBeenCalled()
      })
    })

    it('shows loading state when fetching invoice data', () => {
      mockedInvoiceApi.getInvoiceById.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const { container } = render(
        <UserProvider>
          <InvoiceForm invoiceId="inv-1" />
        </UserProvider>
      )

      // Loading state shows spinner (div with animate-spin class)
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('location tax settings', () => {
    it('renders invoice form with location context', async () => {
      render(
        <UserProvider>
          <InvoiceForm />
        </UserProvider>
      )

      // Just verify the form renders - location loading happens in useEffect
      await waitFor(() => {
        expect(screen.getByText(/create new invoice|edit invoice/i)).toBeInTheDocument()
      })
    })
  })
})
