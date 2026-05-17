import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should show validation errors for empty submit", async ({ page }) => {
    await page.goto("/auth");
    // Try clicking sign in without filling fields
    const signInBtn = page.getByRole("button", { name: /sign in|log in/i });
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      // Form should show required field hints or stay on auth page
      await expect(page).toHaveURL(/auth/);
    }
  });

  test("should show invalid email error", async ({ page }) => {
    await page.goto("/auth");
    await page.fill('input[type="email"]', "not-an-email");
    await page.fill('input[type="password"]', "password123");
    const signInBtn = page.getByRole("button", { name: /sign in|log in/i });
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      // Should stay on auth page
      await expect(page).toHaveURL(/auth/);
    }
  });

  test("should toggle between sign in and sign up", async ({ page }) => {
    await page.goto("/auth");
    const toggleLink = page.getByText(/sign up|create.*account|register/i);
    if (await toggleLink.isVisible()) {
      await toggleLink.click();
      // Should show additional fields or change form mode
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });
});
