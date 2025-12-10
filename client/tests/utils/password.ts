import { expect, type Locator, type Page } from "@playwright/test";
import { VALID_REGISTRATION } from "capital/mocks/user";

/**
 * Default secure test password that meets the application's complexity requirements
 */
export const DEFAULT_TEST_PASSWORD = VALID_REGISTRATION.password;

/**
 * Gets the password visibility toggle icon for a specific password field by test ID
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @returns {Locator} Password visibility toggle icon locator
 */
export function getPasswordToggleButton(page: Page, testId: string): Locator {
   // Parent element will contain the password input and the visibility toggle icon as children nodes
   return page.getByTestId(testId).locator("..").locator("svg");
}

/**
 * Toggles password visibility by clicking the eye icon
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 */
export async function togglePasswordVisibility(page: Page, testId: string): Promise<void> {
   await getPasswordToggleButton(page, testId).click();
}

/**
 * Asserts that a password input has the expected type attribute
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @param {"password" | "text"} expectedType - Expected input type
 */
export async function expectPasswordInputType(
   page: Page,
   testId: string,
   expectedType: "password" | "text"
): Promise<void> {
   await expect(page.getByTestId(testId)).toHaveAttribute("type", expectedType);
}

/**
 * Asserts that a password input contains the expected value
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @param {string} expectedValue - Expected password value
 */
export async function expectPasswordInputValue(
   page: Page,
   testId: string,
   expectedValue: string
): Promise<void> {
   await expect(page.getByTestId(testId)).toHaveValue(expectedValue);
}

/**
 * Asserts password visibility toggle functionality
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @param {string} [testPassword] - Test password to fill the password field with (defaults to `DEFAULT_TEST_PASSWORD`)
 */
export async function assertPasswordVisibilityToggle(
   page: Page,
   testId: string,
   testPassword: string = DEFAULT_TEST_PASSWORD
): Promise<void> {
   await page.getByTestId(testId).fill(testPassword);
   await expect(page.getByTestId(testId)).toHaveValue(testPassword);

   // Initially the password field should be hidden (type="password")
   await expectPasswordInputType(page, testId, "password");
   await expectPasswordInputValue(page, testId, testPassword);

   // Toggle the password field to show the password (type="text")
   await togglePasswordVisibility(page, testId);
   await expectPasswordInputType(page, testId, "text");
   await expectPasswordInputValue(page, testId, testPassword);

   // Toggle the password field to hide the password (type="password")
   await togglePasswordVisibility(page, testId);
   await expectPasswordInputType(page, testId, "password");
   await expectPasswordInputValue(page, testId, testPassword);
}