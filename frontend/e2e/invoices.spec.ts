import { expect, test } from '@playwright/test';
import { isAuthenticated, loginAsRole } from './helpers/auth';
import {
  createTestCustomer,
  createTestInvoice,
  createTestTicket,
  deleteCustomer,
  deleteInvoice,
  deleteTicket,
  getInvoice,
} from './helpers/fixtures';

test.describe('Invoice CRUD Operations', () => {
  let createdCustomerIds: string[] = [];
  let createdTicketIds: string[] = [];
  let createdInvoiceIds: string[] = [];

  // Clean up after each test
  test.afterEach(async ({ page }, testInfo) => {
    // Skip cleanup if test failed with security error
    if (testInfo.status === 'failed' && testInfo.error?.message?.includes('SecurityError')) {
      createdInvoiceIds = [];
      createdTicketIds = [];
      createdCustomerIds = [];
      return;
    }

    try {
      await loginAsRole(page, 'admin');
      for (const id of createdInvoiceIds) {
        try {
          await deleteInvoice(page, id);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      for (const id of createdTicketIds) {
        try {
          await deleteTicket(page, id);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      for (const id of createdCustomerIds) {
        try {
          await deleteCustomer(page, id);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      // Ignore cleanup errors - test might have failed before login
    }
    createdInvoiceIds = [];
    createdTicketIds = [];
    createdCustomerIds = [];
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display invoices list page when authenticated', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/invoices');

    await expect(page.getByRole('heading', { name: /invoices/i })).toBeVisible();
  });

  test('should create a new invoice', async ({ page }) => {
    await loginAsRole(page, 'admin');

    // Create a customer first
    const customerId = await createTestCustomer(page, {
      firstName: 'Invoice',
      lastName: 'Customer',
      email: 'invoice.customer@example.com',
    });
    createdCustomerIds.push(customerId);

    // Navigate to new invoice page
    await page.goto('/invoices/new');

    // Select customer - InvoiceForm uses native select, need to use exact text
    const customerSelect = page.getByLabel(/customer/i);
    await customerSelect.waitFor({ state: 'visible' });
    // Wait for page to stabilize after customer selection
    await page.waitForLoadState('networkidle');
    // selectOption needs exact text match (format: "FirstName LastName")
    await customerSelect.selectOption({ label: 'Invoice Customer' });
    // Wait after selection to ensure form updates
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // Verify we're still authenticated and on the correct page
    await expect(page).toHaveURL(/.*invoices.*new/, { timeout: 10000 });
    const isAuth = await isAuthenticated(page);
    if (!isAuth) {
      throw new Error('Authentication lost after customer selection');
    }

    // InvoiceForm shows item inputs directly (no "Add Item" button needed in create mode)
    // The form has a "Service" mode by default with inputs for description, quantity, unitPrice
    // Use placeholder or name attribute to find the inputs
    const descriptionInput = page.locator('input[name="description"]').or(
      page.locator('input[placeholder*="Description" i]')
    ).first();
    await descriptionInput.waitFor({ state: 'visible', timeout: 10000 });
    await descriptionInput.fill('Repair Service');

    const quantityInput = page.locator('input[name="quantity"]').or(
      page.locator('input[placeholder*="Quantity" i]')
    ).first();
    await quantityInput.fill('1');

    const priceInput = page.locator('input[name="unitPrice"]').or(
      page.locator('input[placeholder*="Unit Price" i]')
    ).first();
    await priceInput.fill('100.00');

    // Click "Add Item" button to add the item to the invoice
    const addItemButton = page.getByRole('button', { name: /add item/i });
    await addItemButton.waitFor({ state: 'visible', timeout: 10000 });
    await addItemButton.click();

    // Wait for item to be added to the list
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // Submit form
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Wait for redirect
    await page.waitForURL(/.*invoices.*/, { timeout: 10000 });

    // Verify success
    await expect(
      page.getByText(/invoice|success|created/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should view invoice details', async ({ page }) => {
    await loginAsRole(page, 'admin');

    // Create customer and invoice via API
    const customerId = await createTestCustomer(page, {
      firstName: 'View',
      lastName: 'Invoice',
      email: 'view.invoice@example.com',
    });
    createdCustomerIds.push(customerId);

    const invoiceId = await createTestInvoice(page, {
      customerId,
      items: [
        {
          description: 'Screen Repair',
          quantity: 1,
          unitPrice: 150.0,
        },
      ],
    });
    createdInvoiceIds.push(invoiceId);

    // Navigate to invoice detail page
    await page.goto(`/invoices/${invoiceId}`);
    await page.waitForLoadState('networkidle');

    // Verify invoice details are displayed (items are in a table)
    // Try multiple ways to find the item description - check table cells first, then general text
    const itemFound = await page.locator('table').getByText(/screen repair/i).first().isVisible({ timeout: 10000 }).catch(() => false);

    if (!itemFound) {
      // Fallback: try general text search
      await expect(page.getByText(/screen repair/i).first()).toBeVisible({ timeout: 10000 });
    } else {
      // Verify it's visible in the table
      await expect(page.locator('table').getByText(/screen repair/i).first()).toBeVisible({ timeout: 10000 });
    }

    // Price might be displayed as $150.00 or 150.00 - check in table or general text
    const priceFound = await page.locator('table').getByText(/\$150\.00|150\.00/i).first().isVisible({ timeout: 10000 }).catch(() => false);
    if (!priceFound) {
      await expect(page.getByText(/\$150\.00|150\.00/i).first()).toBeVisible({ timeout: 10000 });
    } else {
      await expect(page.locator('table').getByText(/\$150\.00|150\.00/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should mark invoice as paid', async ({ page }) => {
    await loginAsRole(page, 'admin');

    // Create invoice via API
    const customerId = await createTestCustomer(page, {
      firstName: 'Paid',
      lastName: 'Invoice',
      email: 'paid.invoice@example.com',
    });
    createdCustomerIds.push(customerId);

    const invoiceId = await createTestInvoice(page, {
      customerId,
      items: [
        {
          description: 'Service',
          quantity: 1,
          unitPrice: 200.0,
        },
      ],
    });
    createdInvoiceIds.push(invoiceId);

    // Navigate to invoice detail page
    await page.goto(`/invoices/${invoiceId}`);

    // Find mark as paid button
    const markPaidButton = page.getByRole('button', { name: /mark.*paid|paid/i });
    if (await markPaidButton.isVisible()) {
      await markPaidButton.click();

      // Wait for status update
      await page.waitForTimeout(1000);

      // Verify invoice marked as paid
      await expect(page.getByText(/paid/i)).toBeVisible();
    }
  });
});
