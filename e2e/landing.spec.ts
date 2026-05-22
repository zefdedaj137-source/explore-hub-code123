import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Shqiponja/);
    
    // Check for key elements — brand logo image and hero headline
    await expect(page.locator('img[alt="Albanian Eagle"]').first()).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should still be accessible — brand logo and headline visible on mobile
    await expect(page.locator('img[alt="Albanian Eagle"]').first()).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/');
    
    // Check meta description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description?.length).toBeGreaterThan(50);
  });
});
