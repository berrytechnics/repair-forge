/**
 * WebKit-specific workarounds for Playwright E2E tests
 * Safari/WebKit has stricter security policies that require special handling
 */

import { Page } from '@playwright/test';

/**
 * Clear storage in a WebKit-compatible way
 * WebKit requires navigation before storage access is allowed
 */
export async function clearStorageWebKitSafe(page: Page): Promise<void> {
  // First, ensure we're on a page (WebKit needs page context)
  const currentURL = page.url();
  if (!currentURL || currentURL === 'about:blank') {
    // Navigate to base URL first
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  }

  // Try to clear storage
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // WebKit may still block this in some contexts
        console.warn('Storage clear blocked:', e);
      }
    });
  } catch (e) {
    // If direct evaluation fails, use addInitScript for next navigation
    await page.addInitScript(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore errors - storage will be naturally cleared on navigation
      }
    });
  }
}

/**
 * Wait for storage to be accessible (WebKit-specific)
 * Sometimes WebKit needs a moment after navigation
 */
export async function waitForStorageAccess(page: Page, timeout = 5000): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      await page.evaluate(() => {
        // Try to access storage
        const testKey = '__webkit_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
      });
      return; // Storage is accessible
    } catch (e) {
      // Storage not accessible yet, wait a bit
      await page.waitForTimeout(100);
    }
  }
  // If we get here, storage might not be accessible - that's okay, continue anyway
}

/**
 * Check if we're running in WebKit
 */
export function isWebKit(page: Page): boolean {
  // Check browser name from context
  const browserName = page.context().browser()?.browserType().name();
  return browserName === 'webkit';
}

/**
 * Execute a function with WebKit-specific error handling
 */
export async function webkitSafeExecute<T>(
  page: Page,
  fn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (isWebKit(page) && error?.message?.includes('SecurityError')) {
      // WebKit security error - return fallback if provided
      if (fallback !== undefined) {
        return fallback;
      }
      // Otherwise, wait and retry once
      await page.waitForTimeout(500);
      try {
        return await fn();
      } catch (retryError) {
        // If retry fails, throw original error
        throw error;
      }
    }
    throw error;
  }
}


