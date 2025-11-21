import { expect, type Page } from "@playwright/test";

/**
 * Asserts that a component is visible and optionally verifies its text content
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - Data test ID of the component to verify is visible
 * @param {string} [text=""] - Optional text content to verify. If not provided, only visibility is checked
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
 * @param {string} [dataTestId] - Optional specific modal test ID to verify is closed (defaults to generic "modal")
 */
export async function assertModalIsClosed(page: Page, dataTestId?: string): Promise<void> {
   await page.waitForSelector(`[data-testid="${dataTestId || "modal"}"]`, { state: "detached" });
}

/**
 * Asserts that a component is hidden from view
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - Data test ID of the component to verify is hidden
 */
export async function assertComponentIsHidden(
   page: Page,
   testId: string
): Promise<void> {
   await expect(page.getByTestId(testId)).toBeHidden();
}

/**
 * Closes a modal by pressing Escape
 *
 * @param {Page} page - Playwright page instance
 * @param {boolean} [force=false] - If true, confirms warning modal when unsaved changes are present
 * @param {string} [dataTestId] - Optional specific modal test ID to close (defaults to waiting for any modal)
 */
export async function closeModal(page: Page, force: boolean = false, dataTestId?: string): Promise<void> {
   // Press Escape to close the modal
   await page.keyboard.press("Escape");

   // Wait for any warning modal to appear if there are unsaved changes
   const warningModal = page.getByTestId("warning-modal");
   const isWarningVisible = await warningModal.isVisible().catch(() => false);

   if (isWarningVisible) {
      // Warning modal appeared - click confirm to close with unsaved changes warning
      await page.getByTestId("warning-modal-confirm").click();
   } else if (force) {
      // Force close was requested but no warning appeared
      await assertComponentIsVisible(page, "warning-modal");
      await assertComponentIsVisible(page, "warning-modal-content", "Are you sure you want to exit? Any unsaved changes will be lost.");
      await page.getByTestId("warning-modal-confirm").click();
   }

   await assertModalIsClosed(page, dataTestId);
}