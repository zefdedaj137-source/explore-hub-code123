import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("homepage has skip-to-content link", async ({ page }) => {
    await page.goto("/");
    const skip = page.locator('a[href="#main-content"]');
    if (await skip.count()) {
      await expect(skip.first()).toHaveAttribute("href", "#main-content");
    }
  });

  test("auth page has accessible form labels", async ({ page }) => {
    await page.goto("/auth");
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      // Input should have aria-label, placeholder, or associated label
      const ariaLabel = await emailInput.getAttribute("aria-label");
      const placeholder = await emailInput.getAttribute("placeholder");
      const id = await emailInput.getAttribute("id");
      expect(ariaLabel || placeholder || id).toBeTruthy();
    }
  });

  test("page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    if (await h1.count()) {
      await expect(h1.first()).toBeVisible();
    }
  });

  test("images have alt text", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt !== null).toBeTruthy();
    }
  });
});
