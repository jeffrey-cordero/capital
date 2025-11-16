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
 * @param {string} [value=""] - Expected value in the input field
 * @param {boolean} [enabledState=true] - Expected enabled state
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
   const labelLocator = input.locator("..").locator("..").locator("label").filter({ hasText: labelText });

   await expect(input).toBeVisible();
   await expect(labelLocator).toBeVisible();
   await expect(input).toHaveValue(value);
   await expect(input).toBeEnabled({ enabled: enabledState });
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
 * @param {boolean} [force=false] - If true, confirms warning modal when unsaved changes are present
 * @returns {Promise<void>}
 */
export async function closeModal(page: Page, force: boolean = false): Promise<void> {
   await page.keyboard.press("Escape");

   if (force) {
      await assertComponentIsVisible(page, "warning-modal");
      await assertComponentIsVisible(page, "warning-modal-content", "Are you sure you want to exit? Any unsaved changes will be lost.");
      await page.getByTestId("warning-modal-confirm").click();
   }

   await assertModalIsClosed(page);
}