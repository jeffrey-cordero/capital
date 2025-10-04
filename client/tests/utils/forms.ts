/**
 * Form handling test utilities for authentication and validation testing
 *
 * This module provides constants and helper functions for testing form interactions
 * including form submission, validation error checking, and field management
 */

import { expect, type Page } from "@playwright/test";
import { type LoginPayload, type RegisterPayload } from "capital/user";

const ERROR_INDICATOR_SELECTOR = "p.Mui-error";

/**
 * Valid registration test data with secure password that meets all requirements
 *
 * Note: username and email fields should be set dynamically in tests to ensure uniqueness
 */
export const VALID_REGISTRATION: RegisterPayload = {
   // Will be set dynamically for each test
   username: "",
   email: "",
   // Static test data
   birthday: "1990-01-01",
   name: "Test User",
   password: "Password1!",
   verifyPassword: "Password1!"
};

/**
 * Valid login test data matching registration password
 *
 * Note: username field should be set dynamically in tests to match registered user
 */
export const VALID_LOGIN: LoginPayload = {
   // Will be set dynamically for each test
   username: "",
   // Static test data
   password: "Password1!"
};

/**
 * Form data type for dynamic form filling
 * Maps field names to their string values
 */
type FormData = Record<string, string>;

/**
 * Fills form fields with provided data and submits the form
 *
 * This function iterates through the provided data object and fills each field
 * that has a non-null/undefined value, then triggers form submission
 *
 * @param {Page} page - Playwright page instance
 * @param {FormData} data - Object containing test ids as keys and values to fill in the form
 * @returns {Promise<void>}
 */
export const submitForm = async(page: Page, data: FormData): Promise<void> => {
   // Fill all form fields with provided data
   for (const [testId, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
         await page.getByTestId(testId).fill(value);
      }
   }

   // Submit the form
   await page.locator('button[type="submit"]').click();
};

/**
 * Waits for validation error indicators to appear on the form
 *
 * Checks for the presence of MUI error helper text elements
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<void>}
 */
export const waitForErrorIndicators = async(page: Page): Promise<void> => {
   await expect(page.locator(ERROR_INDICATOR_SELECTOR).first()).toBeVisible();
};

/**
 * Validates that a specific field displays the expected error message
 *
 * Locates the FormHelperText element within the FormControl and verifies
 * it contains the expected validation error message
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test id of the form field
 * @param {string} expectedMessage - The expected error message text
 * @returns {Promise<void>}
 */
export const validateFieldErrorMessage = async(
   page: Page,
   testId: string,
   expectedMessage: string
): Promise<void> => {
   const errorElement = page.locator(`.MuiFormControl-root:has([data-testid="${testId}"]) ${ERROR_INDICATOR_SELECTOR}`);
   await expect(errorElement).toContainText(expectedMessage);
};

/**
 * Expects a validation error for a specific field with the given message
 *
 * Combines waiting for error indicators and validating the specific field error message
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test id of the form field
 * @param {string} expectedMessage - The expected error message text
 * @returns {Promise<void>}
 */
export const expectValidationError = async(
   page: Page,
   testId: string,
   expectedMessage: string
): Promise<void> => {
   await waitForErrorIndicators(page);
   await validateFieldErrorMessage(page, testId, expectedMessage);
};

/**
 * Clears all form fields to reset form state
 *
 * Useful for resetting forms between test cases or validation checks
 *
 * @param {Page} page - Playwright page instance
 * @param {string[]} testIds - Array of test ids to clear
 * @returns {Promise<void>}
 */
export const clearFormFields = async(page: Page, testIds: string[]): Promise<void> => {
   for (const testId of testIds) {
      await page.getByTestId(testId).clear();
   }
};