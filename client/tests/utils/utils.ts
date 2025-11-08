import { expect, type Page } from "@playwright/test";

/**
 * Asserts that a component is visible and optionally verifies its text content and label
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - Data test ID of the component
 * @param {string} [text] - Optional text content to verify
 * @param {string} [label] - Optional label text to verify
 */
export async function assertComponentVisibility(
   page: Page,
   testId: string,
   text?: string,
   label?: string
): Promise<void> {
   const locator = page.getByTestId(testId);
   await expect(locator).toBeVisible();

   if (text !== undefined) {
      await expect(locator).toHaveText(text);
   }

   if (label !== undefined) {
      await expect(page.getByLabel(label).first()).toBeVisible();
   }
}

/**
 * Closes a modal by clicking the backdrop or pressing Escape key
 *
 * @param {Page} page - Playwright page instance
 */
export async function closeModal(page: Page): Promise<void> {
   // Try pressing Escape key first (standard modal close behavior)
   await page.keyboard.press("Escape");

   // Wait a moment for modal to close
   await page.waitForTimeout(200);

   // If modal is still open, try clicking the backdrop
   const backdrop = page.locator(".MuiBackdrop-root");
   if (await backdrop.isVisible().catch(() => false)) {
      await backdrop.click({ force: true });
   }
}

