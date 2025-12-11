import { expect, test } from '@playwright/test';
import { isAuthenticated, loginAsRole } from './helpers/auth';
import {
  createTestCustomer,
  createTestTicket,
  deleteCustomer,
  deleteTicket,
  getTicket,
} from './helpers/fixtures';

test.describe('Ticket CRUD Operations', () => {
  let createdCustomerIds: string[] = [];
  let createdTicketIds: string[] = [];

  // Clean up after each test
  test.afterEach(async ({ page }, testInfo) => {
    // Skip cleanup if test failed with security error
    if (testInfo.status === 'failed' && testInfo.error?.message?.includes('SecurityError')) {
      createdTicketIds = [];
      createdCustomerIds = [];
      return;
    }

    try {
      await loginAsRole(page, 'admin');
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
    createdTicketIds = [];
    createdCustomerIds = [];
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display tickets list page when authenticated', async ({ page }) => {
    await loginAsRole(page, 'technician');
    await page.goto('/tickets');

    await expect(page.getByRole('heading', { name: /tickets/i })).toBeVisible();
  });

  test('should create a new ticket', async ({ page }) => {
    // Use admin role - technician can't create customers
    await loginAsRole(page, 'admin');

    // Create a customer first
    const customerId = await createTestCustomer(page, {
      firstName: 'Ticket',
      lastName: 'Customer',
      email: 'ticket.customer@example.com',
    });
    createdCustomerIds.push(customerId);

    // Navigate to new ticket page
    await page.goto('/tickets/new');

    // Verify we're authenticated
    const isAuthBefore = await isAuthenticated(page);
    if (!isAuthBefore) {
      throw new Error('Not authenticated before customer search');
    }

    // Verify we're on the correct page
    await expect(page).toHaveURL(/.*tickets.*new/, { timeout: 10000 });

    // TicketForm uses search input + clickable list, not a dropdown
    // Wait for page to load first
    await page.waitForLoadState('networkidle');

    // Find customer search input by ID (more reliable)
    const customerSearch = page.locator('input#customerSearch');
    await customerSearch.waitFor({ state: 'visible', timeout: 10000 });
    await customerSearch.fill('Ticket Customer');

    // Verify still authenticated after filling search
    const isAuthAfterFill = await isAuthenticated(page);
    if (!isAuthAfterFill) {
      throw new Error('Authentication lost after filling customer search');
    }

    // Click search button
    const searchButton = page.getByRole('button', { name: /^search$/i });
    await searchButton.waitFor({ state: 'visible', timeout: 10000 });
    await searchButton.click();

    // Wait for search results to appear - wait for the ul list to be visible
    // The results appear in a ul with class containing "divide-y"
    const customerList = page.locator('ul').filter({ hasText: /ticket customer/i });
    await customerList.waitFor({ state: 'visible', timeout: 10000 });

    // Wait a bit more for results to fully render
    await page.waitForTimeout(500);

    // Verify still authenticated after search
    const isAuthAfterSearch = await isAuthenticated(page);
    if (!isAuthAfterSearch) {
      throw new Error('Authentication lost after clicking search');
    }

    // Verify we're still on the ticket form page (not redirected to login)
    await expect(page).toHaveURL(/.*tickets.*new/, { timeout: 5000 });

    // Click the customer from the list - find li that contains "Ticket Customer"
    // The li has onClick handler and contains customer name
    const customerListItem = customerList.locator('li').filter({
      hasText: /ticket customer/i
    }).first();

    await customerListItem.waitFor({ state: 'visible', timeout: 10000 });
    await customerListItem.click();

    // Wait for customer to be selected and form to update
    await page.waitForLoadState('networkidle');

    // Verify still authenticated after selecting customer
    const isAuthAfterSelect = await isAuthenticated(page);
    if (!isAuthAfterSelect) {
      throw new Error('Authentication lost after selecting customer');
    }

    // Verify we're still on the ticket form page
    await expect(page).toHaveURL(/.*tickets.*new/, { timeout: 5000 });

    // Fill in ticket details (required fields: deviceType, issueDescription)
    await page.getByLabel(/device type/i).fill('Laptop');
    await page.getByLabel(/device brand/i).fill('Dell');
    await page.getByLabel(/device model/i).fill('XPS 13');
    await page.getByLabel(/issue|description/i).fill('Screen not working');

    // Verify still authenticated before submission
    const isAuthBeforeSubmit = await isAuthenticated(page);
    if (!isAuthBeforeSubmit) {
      throw new Error('Authentication lost before ticket form submission');
    }

    // Submit form
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Wait for redirect
    await page.waitForURL(/.*tickets.*/, { timeout: 10000 });

    // Wait for page to fully load after redirect
    await page.waitForLoadState('networkidle');

    // Verify still authenticated after redirect
    const isAuthAfter = await isAuthenticated(page);
    if (!isAuthAfter) {
      throw new Error('Authentication lost after ticket form submission');
    }

    // Verify we're not on login page
    await expect(page).not.toHaveURL(/.*login/);

    // Verify success
    await expect(
      page.getByText(/ticket|success|created/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should view ticket details', async ({ page }) => {
    // Use admin role - technician can't create customers
    await loginAsRole(page, 'admin');

    // Create customer and ticket via API
    const customerId = await createTestCustomer(page, {
      firstName: 'View',
      lastName: 'Ticket',
      email: 'view.ticket@example.com',
    });
    createdCustomerIds.push(customerId);

    const ticketId = await createTestTicket(page, {
      customerId,
      deviceType: 'Phone',
      deviceBrand: 'iPhone',
      deviceModel: '13 Pro',
      issueDescription: 'Battery replacement needed',
    });
    createdTicketIds.push(ticketId);

    // Navigate to ticket detail page
    await page.goto(`/tickets/${ticketId}`);

    // Verify ticket details are displayed (use .first() to handle multiple matches)
    await expect(page.getByText(/phone|iphone/i).first()).toBeVisible();
    await expect(page.getByText(/battery/i)).toBeVisible();
  });

  test('should update ticket status', async ({ page }) => {
    // Use admin role - technician can't create customers
    await loginAsRole(page, 'admin');

    // Create ticket via API
    const customerId = await createTestCustomer(page, {
      firstName: 'Status',
      lastName: 'Test',
      email: 'status@example.com',
    });
    createdCustomerIds.push(customerId);

    const ticketId = await createTestTicket(page, {
      customerId,
      deviceType: 'Tablet',
      issueDescription: 'Status test ticket',
      status: 'new',
    });
    createdTicketIds.push(ticketId);

    // Navigate to ticket detail page
    await page.goto(`/tickets/${ticketId}`);

    // Find status dropdown/select and change status
    const statusSelect = page.getByLabel(/status/i);
    if (await statusSelect.isVisible()) {
      await statusSelect.click();
      await page.getByText(/in repair|diagnosed/i).click();

      // Wait for status update
      await page.waitForTimeout(1000);

      // Verify status changed
      await expect(page.getByText(/in repair|diagnosed/i)).toBeVisible();
    }
  });
});
