import { expect, type Page } from "@playwright/test";

/**
 * Asserts that a component is visible and optionally verifies its text content
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - Data test ID of the component to verify is visible
 * @param {string} [text=""] - Optional text content to verify. If not provided, only visibility is checked
 * @returns {Promise<void>}
 */
export async function assertComponentIsVisible(
   page: Page,
   testId: string,
   text: string = ""
): Promise<void> {
   const locator = page.getByTestId(testId);
   await expect(locator).toBeVisible();

   if (text) {
      await expect(locator).toHaveText(text);
   }
}

/**
 * Asserts that an input field is visible with expected label, value, and enabled state
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - Data test ID of the input element
 * @param {string} labelText - Expected label text for the input
 * @param {string} [value=""] - Expected value in the input field. Defaults to empty string
 * @param {boolean} [enabledState=true] - Expected enabled state (true for enabled, false for disabled). Defaults to true
 * @returns {Promise<void>}
 */
export async function assertInputVisibility(
   page: Page,
   testId: string,
   labelText: string,
   value: string = "",
   enabledState: boolean = true
): Promise<void> {
   const input = page.getByTestId(testId);

   // Verify input is visible
   await expect(input).toBeVisible();

   const labelLocator = input.locator("..").locator("..").locator("label").filter({ hasText: labelText });
   await expect(labelLocator).toBeVisible();

   // Verify value
   if (value) {
      await expect(input).toHaveValue(value);
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
 * @returns {Promise<void>}
 */
export async function assertModalIsClosed(page: Page): Promise<void> {
   await page.waitForSelector("[data-testid=\"modal\"]", { state: "detached" });
}

/**
 * Asserts that a component is hidden from view
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - Data test ID of the component to verify is hidden
 * @returns {Promise<void>}
 */
export async function assertComponentIsHidden(
   page: Page,
   testId: string
): Promise<void> {
   await expect(page.getByTestId(testId)).toBeHidden();
}

/**
 * Closes a modal by clicking the backdrop or pressing Escape key
 *
 * @param {Page} page - Playwright page instance
 * @param {boolean} [force=false] - If true, verifies and confirms warning modal when unsaved changes are present. Defaults to false
 * @returns {Promise<void>}
 */
export async function closeModal(page: Page, force: boolean = false): Promise<void> {
   // Try pressing Escape key first to mimic standard modal close behavior
   await page.keyboard.press("Escape");

   // If this is a forced close, confirm through the expected warning modal container
   if (force) {
      await assertComponentIsVisible(page, "warning-modal");
      await assertComponentIsVisible(page, "warning-modal-content", "Are you sure you want to exit? Any unsaved changes will be lost.");
      await page.getByTestId("warning-modal-confirm").click();
   }

   await assertModalIsClosed(page);
}