import { expect, type Page } from "@playwright/test";

/**
 * Asserts that a component is visible and optionally verifies its text
 * content and label
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
 * Asserts that an input field is visible with expected label, value, and enabled state
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - Data test ID of the input element
 * @param {string} labelText - Expected label text for the input
 * @param {string} [defaultValue] - Expected default value in the input
 * @param {boolean} [enabledState] - Expected enabled state (true for enabled, false for disabled)
 */
export async function assertInputVisibility(
   page: Page,
   testId: string,
   labelText: string,
   defaultValue?: string,
   enabledState: boolean = true
): Promise<void> {
   const input = page.getByTestId(testId);

   // Verify input is visible
   await expect(input).toBeVisible();

   const labelLocator = input.locator("..").locator("..").locator("label").filter({ hasText: labelText });
   await expect(labelLocator).toBeVisible();

   // Verify default value if provided
   if (defaultValue !== undefined) {
      await expect(input).toHaveValue(defaultValue);
   }

   // Verify enabled state
   if (enabledState) {
      await expect(input).toBeEnabled();
   } else {
      await expect(input).toBeDisabled();
   }
}

/**
 * Asserts that the modal is closed by waiting for it to be detached from the DOM
 *
 * @param {Page} page - Playwright page instance
 */
export async function assertModalClosed(page: Page): Promise<void> {
   await page.waitForSelector("[data-testid=\"modal\"]", { state: "detached" });
}

/**
 * Closes a modal by clicking the backdrop or pressing Escape key
 *
 * @param {Page} page - Playwright page instance
 * @param {boolean} [force] - If true, verifies and confirms warning modal when unsaved changes are present
 */
export async function closeModal(page: Page, force: boolean = false): Promise<void> {
   // Try pressing Escape key first to mimic standard modal close behavior
   await page.keyboard.press("Escape");

   // If this is a forced close, confirm through the expected warning modal container
   if (force) {
      await assertComponentVisibility(page, "warning-modal");
      await assertComponentVisibility(page, "warning-modal-content", "Are you sure you want to exit? Any unsaved changes will be lost.");
      await page.getByTestId("warning-modal-confirm").click();
   }

   await assertModalClosed(page);
}