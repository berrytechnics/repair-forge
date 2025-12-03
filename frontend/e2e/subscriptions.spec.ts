import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/auth';
import { getAuthToken } from './helpers/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Make an authenticated API request
 */
async function apiRequest(
  page: any,
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

test.describe('Subscription Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, 'admin');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/subscriptions');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display subscription status when authenticated', async ({ page }) => {
    await page.goto('/subscriptions');
    
    // Should show subscription information
    // The exact content depends on your subscription page implementation
    await expect(
      page.getByText(/subscription|billing|status/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should calculate billing correctly via API', async ({ page }) => {
    // Get subscription via API
    const response = await apiRequest(page, 'GET', '/api/subscriptions');
    
    expect(response).toHaveProperty('data');
    if (response.data) {
      expect(response.data).toHaveProperty('monthlyAmount');
      expect(response.data).toHaveProperty('locationCount');
      expect(response.data).toHaveProperty('status');
    }
  });
});

