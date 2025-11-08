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
 * @param {boolean} [force] - If true, verifies and confirms warning modal when unsaved changes are present
 */
export async function closeModal(page: Page, force: boolean = false): Promise<void> {
   // Try pressing Escape key first (standard modal close behavior)
   await page.keyboard.press("Escape");

   // If force is true, check for warning modal and confirm it
   if (force) {
      await assertComponentVisibility(page, "warning-modal");
      await assertComponentVisibility(page, "warning-modal-content", "Are you sure you want to exit? Any unsaved changes will be lost.");
      await page.getByTestId("warning-modal-confirm").click();
   }

   await page.waitForSelector('[data-testid="modal"]', { state: "detached" });
}