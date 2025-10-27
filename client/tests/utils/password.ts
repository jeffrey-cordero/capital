import { expect, type Locator, type Page } from "@playwright/test";
import { VALID_REGISTRATION } from "capital/mocks/user";

/**
 * Default secure test password that meets complexity requirements
 */
export const DEFAULT_TEST_PASSWORD = VALID_REGISTRATION.password;

/**
 * Gets the password input element by test ID
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @returns {Locator} Password input locator by test ID
 */
function getPasswordInput(page: Page, testId: string): Locator {
   return page.getByTestId(testId);
}

/**
 * Gets the password visibility toggle icon for a specific password field
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @returns {Locator} Toggle icon locator
 */
export function getPasswordToggleButton(page: Page, testId: string): Locator {
   return page.getByTestId(testId).locator("..").locator("svg");
}

/**
 * Fills a password field with the specified value
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @param {string} password - The password value to enter
 */
export async function fillPasswordField(page: Page, testId: string, password: string): Promise<void> {
   await getPasswordInput(page, testId).fill(password);
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
   await expect(getPasswordInput(page, testId)).toHaveAttribute("type", expectedType);
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
   await expect(getPasswordInput(page, testId)).toHaveValue(expectedValue);
}

/**
 * Asserts password visibility toggle functionality
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @param {string} [testPassword=DEFAULT_TEST_PASSWORD] - Password to use for testing
 */
export async function assertPasswordVisibilityToggle(
   page: Page,
   testId: string,
   testPassword: string = DEFAULT_TEST_PASSWORD
): Promise<void> {
   // Fill the password field with test password
   await fillPasswordField(page, testId, testPassword);

   // Initially password should be hidden (type="password")
   await expectPasswordInputType(page, testId, "password");
   await expectPasswordInputValue(page, testId, testPassword);

   // Toggle to show password (type="text")
   await togglePasswordVisibility(page, testId);
   await expectPasswordInputType(page, testId, "text");
   await expectPasswordInputValue(page, testId, testPassword);

   // Toggle back to hide password (type="password")
   await togglePasswordVisibility(page, testId);
   await expectPasswordInputType(page, testId, "password");
   await expectPasswordInputValue(page, testId, testPassword);
}