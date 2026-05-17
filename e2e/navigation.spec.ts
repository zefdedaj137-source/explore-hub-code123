import { test, expect } from "@playwright/test";

test.describe("Navigation & Routing", () => {
  test("public pages load without auth", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Shqiponja/i);

    await page.goto("/terms");
    await expect(page.locator("body")).not.toBeEmpty();

    await page.goto("/privacy");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("protected routes redirect to auth", async ({ page }) => {
    await page.goto("/discover");
    // Should redirect to auth page
    await page.waitForURL(/\/(auth|$)/);
    expect(page.url()).toMatch(/\/(auth|$)/);
  });

  test("settings redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL(/\/(auth|$)/);
    expect(page.url()).toMatch(/\/(auth|$)/);
  });

  test("matches redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/matches");
    await page.waitForURL(/\/(auth|$)/);
    expect(page.url()).toMatch(/\/(auth|$)/);
  });

  test("404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.locator("body")).toContainText(/not found|404|go.*home/i);
  });
});
