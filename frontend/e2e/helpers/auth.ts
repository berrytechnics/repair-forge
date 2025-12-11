/**
 * Authentication helpers for Playwright E2E tests
 * Provides reusable functions for authenticating users in tests
 */

import { Page } from '@playwright/test';
import { clearStorageWebKitSafe, isWebKit } from './webkit-workarounds';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Login credentials for test users
 * These should match the test users created in the backend test setup
 */
export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'testpassword123',
  },
  manager: {
    email: 'manager@test.com',
    password: 'testpassword123',
  },
  technician: {
    email: 'technician@test.com',
    password: 'testpassword123',
  },
  frontdesk: {
    email: 'frontdesk@test.com',
    password: 'testpassword123',
  },
} as const;

/**
 * Login as a user via the UI
 * Navigates to login page, fills form, and submits
 */
export async function loginAsUser(
  page: Page,
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<void> {
  // Clear any existing auth state
  await page.context().clearCookies();

  // Navigate to login page first (needed for WebKit to allow storage access)
  await page.goto('/login');

  // Clear storage using WebKit-safe method
  await clearStorageWebKitSafe(page);

  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"]', { state: 'visible' });

  // Fill in credentials
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Set remember me checkbox if needed
  const rememberMeCheckbox = page.getByLabel(/remember me/i);
  const isChecked = await rememberMeCheckbox.isChecked();
  if (rememberMe !== isChecked) {
    await rememberMeCheckbox.click();
  }

  // Submit form (button text is "Sign in" or "Signing in...")
  const loginButton = page.getByRole('button', { name: /sign in|login/i });
  await loginButton.click();

  // Wait for navigation after login (should go to dashboard or settings)
  // Check if we're already on the target URL first
  const currentURL = page.url();
  const isAlreadyOnTarget = /^\/(dashboard|settings)/.test(new URL(currentURL).pathname);

  if (!isAlreadyOnTarget) {
    // Wait for navigation to dashboard or settings
    try {
      await page.waitForURL(/^\/(dashboard|settings)/, { timeout: 15000 });
    } catch (error) {
      // Check if there's an error message on the page
      const errorMessage = page.locator('text=/error|invalid|failed/i').first();
      if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        const errorText = await errorMessage.textContent();
        throw new Error(`Login failed: ${errorText || 'Unknown error'}`);
      }
      // Check if we're still on login page
      const finalURL = page.url();
      if (finalURL.includes('/login')) {
        throw new Error(`Login failed: Still on login page after ${15000}ms`);
      }
      // If we're on dashboard/settings, that's fine - navigation might have happened instantly
      if (/^\/(dashboard|settings)/.test(new URL(finalURL).pathname)) {
        // Success - we're on the right page
      } else {
        throw new Error(`Login timeout: Expected redirect to dashboard/settings but stayed on ${finalURL}`);
      }
    }
  }

  // Verify we're logged in by checking for user-specific content
  // Dashboard or settings page should be visible
  await page.waitForLoadState('networkidle');
}

/**
 * Login as a specific role using predefined test credentials
 */
export async function loginAsRole(
  page: Page,
  role: 'admin' | 'manager' | 'technician' | 'frontdesk'
): Promise<void> {
  const credentials = TEST_USERS[role];
  await loginAsUser(page, credentials.email, credentials.password);
}

/**
 * Logout by clearing auth state
 * Note: This clears storage but doesn't navigate - you may need to navigate manually
 */
export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies();
  // Use WebKit-safe storage clearing
  await clearStorageWebKitSafe(page);
}

/**
 * Check if user is authenticated by checking for auth token in storage
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return !!(
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken')
    );
  });
}

/**
 * Register a new user via the UI
 * Useful for testing registration flow
 */
export async function registerUser(
  page: Page,
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyName?: string;
  }
): Promise<void> {
  // Navigate to register page
  await page.goto('/register');

  // Wait for register form
  await page.waitForSelector('input[type="email"]', { state: 'visible' });

  // Fill in form fields
  await page.getByLabel(/first name/i).fill(userData.firstName);
  await page.getByLabel(/last name/i).fill(userData.lastName);
  await page.getByLabel(/email/i).fill(userData.email);
  await page.getByLabel(/password/i).fill(userData.password);

  // Fill company name if provided
  if (userData.companyName) {
    const companyNameInput = page.getByLabel(/company name/i);
    if (await companyNameInput.isVisible()) {
      await companyNameInput.fill(userData.companyName);
    }
  }

  // Submit form
  await page.getByRole('button', { name: /register|sign up/i }).click();

  // Wait for navigation after registration
  await page.waitForURL(/^\/(dashboard|settings)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Get auth token from storage (useful for API calls in tests)
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  // WebKit-safe token retrieval
  try {
    return await page.evaluate(() => {
      try {
        return (
          localStorage.getItem('accessToken') ||
          sessionStorage.getItem('accessToken') ||
          null
        );
      } catch (e) {
        // WebKit may block storage access
        return null;
      }
    });
  } catch (e) {
    // If evaluation fails (WebKit security), return null
    if (isWebKit(page)) {
      return null;
    }
    throw e;
  }
}
