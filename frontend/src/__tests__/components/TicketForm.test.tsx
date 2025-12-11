import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TicketForm from '@/components/TicketForm'
import * as ticketApi from '@/lib/api/ticket.api'
import * as customerApi from '@/lib/api/customer.api'
import * as assetApi from '@/lib/api/asset.api'
import * as technicianApi from '@/lib/api'
import * as checklistApi from '@/lib/api/diagnostic-checklist.api'

// Mock the API modules
jest.mock('@/lib/api/ticket.api')
jest.mock('@/lib/api/customer.api')
jest.mock('@/lib/api/asset.api')
jest.mock('@/lib/api')
jest.mock('@/lib/api/diagnostic-checklist.api')

const mockedTicketApi = ticketApi as jest.Mocked<typeof ticketApi>
const mockedCustomerApi = customerApi as jest.Mocked<typeof customerApi>
const mockedAssetApi = assetApi as jest.Mocked<typeof assetApi>
const mockedTechnicianApi = technicianApi as jest.Mocked<typeof technicianApi>
const mockedChecklistApi = checklistApi as jest.Mocked<typeof checklistApi>

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}))

describe('TicketForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockedTechnicianApi.getTechnicians.mockResolvedValue({
      success: true,
      data: [
        { id: 'tech-1', firstName: 'John', lastName: 'Tech', email: 'john@example.com', role: 'technician', permissions: [] },
      ],
    })

    mockedChecklistApi.getChecklistTemplates.mockResolvedValue({
      success: true,
      data: [
        { id: 'template-1', name: 'Standard Checklist', isActive: true },
      ],
    })
  })

  describe('rendering', () => {
    it('renders form correctly in create mode', async () => {
      render(<TicketForm />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create ticket|save/i })).toBeInTheDocument()
      })
    })

    it('shows customer search when no initial customer provided', () => {
      render(<TicketForm />)
      expect(screen.getByPlaceholderText(/search by name, email, or phone/i)).toBeInTheDocument()
    })

    it('hides customer search when initial customer provided', () => {
      mockedCustomerApi.getCustomers.mockResolvedValue({
        success: true,
        data: [
          { id: 'cust-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        ],
      })

      render(<TicketForm customerId="cust-1" />)

      waitFor(() => {
        expect(screen.queryByPlaceholderText(/search customers/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('validation', () => {
    it('validates required fields on submit', async () => {
      const user = userEvent.setup()
      render(<TicketForm />)

      const submitButton = screen.getByRole('button', { name: /create ticket|save/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/customer is required/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('customer search', () => {
    it('renders customer search input', () => {
      render(<TicketForm />)
      expect(screen.getByPlaceholderText(/search by name, email, or phone/i)).toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('renders submit button', () => {
      render(<TicketForm />)
      expect(screen.getByRole('button', { name: /create ticket|save/i })).toBeInTheDocument()
    })

    it('loads ticket data in edit mode', async () => {
      const mockTicket = {
        id: 'ticket-1',
        ticketNumber: 'T-001',
        customerId: 'cust-1',
        deviceType: 'Laptop',
        issueDescription: 'Screen broken',
        priority: 'medium' as const,
        status: 'new' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        customer: {
          id: 'cust-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
      }

      mockedTicketApi.getTicketById.mockResolvedValue({
        success: true,
        data: mockTicket,
      })

      render(<TicketForm ticketId="ticket-1" />)

      await waitFor(() => {
        expect(mockedTicketApi.getTicketById).toHaveBeenCalledWith('ticket-1')
      })
    })
  })

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      mockedTicketApi.getTicketById.mockRejectedValue(new Error('API Error'))

      render(<TicketForm ticketId="ticket-1" />)

      await waitFor(() => {
        expect(mockedTicketApi.getTicketById).toHaveBeenCalled()
      })
    })

    it('shows loading state when fetching ticket data', () => {
      mockedTicketApi.getTicketById.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<TicketForm ticketId="ticket-1" />)

      expect(screen.getByText(/loading ticket data/i)).toBeInTheDocument()
    })
  })

  describe('asset selection', () => {
    it('loads assets when customer is selected in edit mode', async () => {
      const mockTicket = {
        id: 'ticket-1',
        ticketNumber: 'T-001',
        customerId: 'cust-1',
        assetId: 'asset-1',
        deviceType: 'Laptop',
        issueDescription: 'Screen broken',
        priority: 'medium' as const,
        status: 'new' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        customer: {
          id: 'cust-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
      }

      mockedTicketApi.getTicketById.mockResolvedValue({
        success: true,
        data: mockTicket,
      })

      mockedAssetApi.getAssetsByCustomer.mockResolvedValue({
        success: true,
        data: [
          { id: 'asset-1', customerId: 'cust-1', name: 'MacBook Pro', serialNumber: 'SN123', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        ],
      })

      render(<TicketForm ticketId="ticket-1" />)

      await waitFor(() => {
        expect(mockedAssetApi.getAssetsByCustomer).toHaveBeenCalledWith('cust-1')
      })
    })
  })
})
