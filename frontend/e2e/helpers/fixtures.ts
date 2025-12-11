/**
 * Test fixtures and data setup helpers for E2E tests
 * Provides functions to set up test data via API calls
 */

import { Page } from '@playwright/test';
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Make an authenticated API request
 */
async function apiRequest(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any
): Promise<any> {
  const token = await getAuthToken(page);
  if (!token) {
    throw new Error('Not authenticated. Call loginAsUser or loginAsRole first.');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} - ${result.error?.message || result.message || 'Unknown error'}`
    );
  }

  return result;
}

/**
 * Create a test customer via API
 */
export async function createTestCustomer(
  page: Page,
  customerData: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    notes?: string;
  }
): Promise<string> {
  const response = await apiRequest(page, 'POST', '/api/customers', customerData);
  return response.data.id;
}

/**
 * Create a test ticket via API
 */
export async function createTestTicket(
  page: Page,
  ticketData: {
    customerId: string;
    locationId?: string;
    deviceType?: string;
    deviceBrand?: string;
    deviceModel?: string;
    serialNumber?: string;
    issueDescription?: string;
    status?: string;
    priority?: string;
    assetId?: string;
  }
): Promise<string> {
  const response = await apiRequest(page, 'POST', '/api/tickets', ticketData);
  return response.data.id;
}

/**
 * Create a test invoice via API
 */
export async function createTestInvoice(
  page: Page,
  invoiceData: {
    customerId: string;
    locationId?: string;
    ticketId?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxable?: boolean;
      type?: 'part' | 'service' | 'other';
    }>;
    notes?: string;
  }
): Promise<string> {
  // Create invoice first (without items - backend doesn't accept items in create)
  const invoicePayload: any = {
    customerId: invoiceData.customerId,
    status: 'draft',
  };

  if (invoiceData.ticketId) {
    invoicePayload.ticketId = invoiceData.ticketId;
  }
  if (invoiceData.notes) {
    invoicePayload.notes = invoiceData.notes;
  }

  const response = await apiRequest(page, 'POST', '/api/invoices', invoicePayload);
  const invoiceId = response.data.id;

  // Add items separately if provided
  if (invoiceData.items && invoiceData.items.length > 0) {
    for (const item of invoiceData.items) {
      await apiRequest(page, 'POST', `/api/invoices/${invoiceId}/items`, {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        type: item.type || 'service',
        // Note: taxable is handled by backend based on item type, not passed directly
      });
    }
  }

  return invoiceId;
}

/**
 * Create a test location via API
 */
export async function createTestLocation(
  page: Page,
  locationData: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
    email?: string;
  }
): Promise<string> {
  const response = await apiRequest(page, 'POST', '/api/locations', locationData);
  return response.data.id;
}

/**
 * Create a test asset via API
 */
export async function createTestAsset(
  page: Page,
  assetData: {
    customerId: string;
    deviceType: string;
    deviceBrand?: string;
    deviceModel?: string;
    serialNumber?: string;
    notes?: string;
  }
): Promise<string> {
  const response = await apiRequest(page, 'POST', '/api/assets', assetData);
  return response.data.id;
}

/**
 * Get a customer by ID via API
 */
export async function getCustomer(page: Page, customerId: string): Promise<any> {
  const response = await apiRequest(page, 'GET', `/api/customers/${customerId}`);
  return response.data;
}

/**
 * Get a ticket by ID via API
 */
export async function getTicket(page: Page, ticketId: string): Promise<any> {
  const response = await apiRequest(page, 'GET', `/api/tickets/${ticketId}`);
  return response.data;
}

/**
 * Get an invoice by ID via API
 */
export async function getInvoice(page: Page, invoiceId: string): Promise<any> {
  const response = await apiRequest(page, 'GET', `/api/invoices/${invoiceId}`);
  return response.data;
}

/**
 * Delete a customer via API (for cleanup)
 */
export async function deleteCustomer(page: Page, customerId: string): Promise<void> {
  await apiRequest(page, 'DELETE', `/api/customers/${customerId}`);
}

/**
 * Delete a ticket via API (for cleanup)
 */
export async function deleteTicket(page: Page, ticketId: string): Promise<void> {
  await apiRequest(page, 'DELETE', `/api/tickets/${ticketId}`);
}

/**
 * Delete an invoice via API (for cleanup)
 */
export async function deleteInvoice(page: Page, invoiceId: string): Promise<void> {
  await apiRequest(page, 'DELETE', `/api/invoices/${invoiceId}`);
}

/**
 * Clean up test data
 * Call this in afterEach hooks to clean up created test data
 */
export async function cleanupTestData(
  page: Page,
  data: {
    customerIds?: string[];
    ticketIds?: string[];
    invoiceIds?: string[];
  }
): Promise<void> {
  // Delete in reverse order of dependencies
  if (data.invoiceIds) {
    for (const id of data.invoiceIds) {
      try {
        await deleteInvoice(page, id);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  }

  if (data.ticketIds) {
    for (const id of data.ticketIds) {
      try {
        await deleteTicket(page, id);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  }

  if (data.customerIds) {
    for (const id of data.customerIds) {
      try {
        await deleteCustomer(page, id);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  }
}
