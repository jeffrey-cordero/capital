import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Default secure test password that meets complexity requirements, includes uppercase, lowercase, numbers, and special characters
 */
export const DEFAULT_TEST_PASSWORD = "TestPassword123!";

/**
 * Gets the password input element by test ID
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @returns {Locator} Password input locator by test ID
 */
export const getPasswordInput = (page: Page, testId: string): Locator => {
   return page.getByTestId(testId);
};

/**
 * Gets the password visibility toggle icon for a specific password field, locates
 * the SVG eye icon that toggles password visibility within the input's parent
 * container
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @returns {Locator} Toggle icon locator
 */
export const getPasswordToggleButton = (page: Page, testId: string): Locator => {
   return page.getByTestId(testId).locator("..").locator("svg");
};

/**
 * Retrieves the current input type attribute of a password field
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @returns {Promise<string | null>} Promise resolving to the input type ("password" or "text")
 */
export const getPasswordInputType = async(page: Page, testId: string): Promise<string | null> => {
   return await getPasswordInput(page, testId).getAttribute("type");
};

/**
 * Fills a password field with the specified value
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @param {string} password - The password value to enter
 * @returns {Promise<void>}
 */
export const fillPasswordField = async(page: Page, testId: string, password: string): Promise<void> => {
   await getPasswordInput(page, testId).fill(password);
};

/**
 * Clears a password field completely
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @returns {Promise<void>}
 */
export const clearPasswordField = async(page: Page, testId: string): Promise<void> => {
   await getPasswordInput(page, testId).clear();
};

/**
 * Toggles password visibility by clicking the eye icon
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @returns {Promise<void>}
 */
export const togglePasswordVisibility = async(page: Page, testId: string): Promise<void> => {
   await getPasswordToggleButton(page, testId).click();
};

/**
 * Asserts that a password input has the expected type attribute
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @param {"password" | "text"} expectedType - Expected input type ("password" for hidden, "text" for visible)
 * @returns {Promise<void>}
 */
export const expectPasswordInputType = async(
   page: Page,
   testId: string,
   expectedType: "password" | "text"
): Promise<void> => {
   await expect(getPasswordInput(page, testId)).toHaveAttribute("type", expectedType);
};

/**
 * Asserts that a password input contains the expected value
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @param {string} expectedValue - Expected password value
 * @returns {Promise<void>}
 */
export const expectPasswordInputValue = async(
   page: Page,
   testId: string,
   expectedValue: string
): Promise<void> => {
   await expect(getPasswordInput(page, testId)).toHaveValue(expectedValue);
};

/**
 * Comprehensive test for password visibility toggle functionality, tests the
 * complete flow: fill password, verify hidden, toggle to visible, verify visible,
 * toggle back to hidden
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the password field
 * @param {string} [testPassword=DEFAULT_TEST_PASSWORD] - Password to use for testing
 * @returns {Promise<void>}
 */
export const testPasswordVisibilityToggle = async(
   page: Page,
   testId: string,
   testPassword: string = DEFAULT_TEST_PASSWORD
): Promise<void> => {
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
};