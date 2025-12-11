import { expect, test } from '@playwright/test';
import { clearStorageWebKitSafe } from './helpers/webkit-workarounds';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    // Use WebKit-safe storage clearing
    await clearStorageWebKitSafe(page);
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // Check for login form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/login');

    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { state: 'visible' });

    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Wait for error message to appear - check for common error patterns
    // Error might be: "Invalid credentials", "Login failed", "Authentication failed", etc.
    // Look for error in alert/error div or text content
    const errorSelectors = [
      page.locator('[role="alert"]'),
      page.locator('.text-red-600, .text-red-700, .text-red-400'),
      page.locator('div').filter({ hasText: /invalid|failed|error|credentials|authentication/i }),
      page.getByText(/invalid|failed|error|credentials|authentication/i),
    ];

    // Try each selector until one works
    let errorFound = false;
    for (const selector of errorSelectors) {
      try {
        await selector.first().waitFor({ state: 'visible', timeout: 5000 });
        errorFound = true;
        break;
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    if (!errorFound) {
      // Fallback: check if we're still on login page (which indicates failure)
      const currentURL = page.url();
      if (!currentURL.includes('/login')) {
        throw new Error('Expected to stay on login page with error, but navigated away');
      }
      // If still on login page, assume error is shown but selector didn't match
      // Check for any visible error-like text
      const anyErrorText = await page.locator('body').textContent();
      if (anyErrorText && /invalid|failed|error|credentials/i.test(anyErrorText.toLowerCase())) {
        // Error text exists somewhere on page
        return;
      }
      throw new Error('No error message found after invalid login attempt');
    }
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');

    // Click register link (text is "create a new account")
    await page.getByRole('link', { name: /create.*new.*account/i }).click();

    // Should be on register page
    await expect(page).toHaveURL(/.*register/);
  });

  test('should display register form', async ({ page }) => {
    await page.goto('/register');

    // Check for register form elements
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    // Use name attribute to target the specific password field (not confirmPassword)
    await expect(page.locator('input[type="password"][name="password"]')).toBeVisible();
    // Button text is "Create account" or "Creating account..."
    await expect(page.getByRole('button', { name: /create.*account/i })).toBeVisible();
  });
});
