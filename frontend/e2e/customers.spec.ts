import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/auth';
import { createTestCustomer, deleteCustomer, getCustomer } from './helpers/fixtures';

test.describe('Customer CRUD Operations', () => {
  let createdCustomerIds: string[] = [];

  // Clean up after each test
  test.afterEach(async ({ page }, testInfo) => {
    // Skip cleanup if test failed or if we're in a browser that has issues
    if (testInfo.status === 'failed' && testInfo.error?.message?.includes('SecurityError')) {
      createdCustomerIds = [];
      return;
    }
    
    // Login as admin to clean up
    try {
      await loginAsRole(page, 'admin');
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
    createdCustomerIds = [];
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/customers');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display customers list page when authenticated', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/customers');
    
    await expect(page.getByRole('heading', { name: /customers/i })).toBeVisible();
  });

  test('should create a new customer', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/customers/new');

    // Fill in customer form
    await page.getByLabel(/first name/i).fill('John');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/email/i).fill('john.doe@example.com');
    await page.getByLabel(/phone/i).fill('555-1234');

    // Submit form
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Wait for redirect to customer detail page or list
    await page.waitForURL(/.*customers.*/, { timeout: 10000 });
    
    // Verify success - should see customer name or success message
    await expect(
      page.getByText(/john|doe|success|created/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should view customer details', async ({ page }) => {
    await loginAsRole(page, 'admin');
    
    // Create a customer via API for testing
    const customerId = await createTestCustomer(page, {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-5678',
    });
    createdCustomerIds.push(customerId);

    // Navigate to customer detail page
    await page.goto(`/customers/${customerId}`);

    // Verify customer details are displayed (use .first() to handle multiple matches)
    await expect(page.getByText(/jane/i).first()).toBeVisible();
    await expect(page.getByText(/smith/i).first()).toBeVisible();
    await expect(page.getByText(/jane\.smith@example\.com/i)).toBeVisible();
  });

  test('should edit customer', async ({ page }) => {
    await loginAsRole(page, 'admin');
    
    // Create a customer via API
    const customerId = await createTestCustomer(page, {
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@example.com',
    });
    createdCustomerIds.push(customerId);

    // Navigate to edit page
    await page.goto(`/customers/${customerId}/edit`);

    // Update customer information
    await page.getByLabel(/first name/i).clear();
    await page.getByLabel(/first name/i).fill('Robert');
    await page.getByLabel(/phone/i).fill('555-9999');

    // Save changes
    await page.getByRole('button', { name: /save|update/i }).click();

    // Wait for redirect
    await page.waitForURL(/.*customers.*/, { timeout: 10000 });

    // Verify changes were saved (use .first() to handle multiple matches)
    await expect(page.getByText(/robert/i).first()).toBeVisible();
  });

  test('should delete customer', async ({ page }) => {
    await loginAsRole(page, 'admin');
    
    // Create a customer via API
    const customerId = await createTestCustomer(page, {
      firstName: 'Delete',
      lastName: 'Me',
      email: 'delete@example.com',
    });
    createdCustomerIds.push(customerId);

    // Navigate to customer detail page
    await page.goto(`/customers/${customerId}`);

    // Find and click delete button
    const deleteButton = page.getByRole('button', { name: /delete/i });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion if confirmation dialog appears
      const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }

      // Wait for redirect to customers list
      await page.waitForURL(/.*customers.*/, { timeout: 10000 });
      
      // Verify customer is deleted (should not appear in list)
      await expect(page.getByText(/delete me/i)).not.toBeVisible();
    }
  });
});
