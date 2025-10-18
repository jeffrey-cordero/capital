import { expect, type Page } from "@playwright/test";

const ERROR_INDICATOR_SELECTOR = "p.Mui-error";

/**
 * Form data type for dynamic form filling, maps field names
 * to their string values
 */
type FormData = Record<string, string>;

/**
 * Form submission options
 */
export interface FormSubmitOptions {
  /** Whether to wait for navigation after form submission */
  waitForNavigation?: boolean;

  /** CSS selector for the submit button */
  submitButtonSelector?: string;

  /** Whether to wait for network requests to complete */
  waitForLoadState?: boolean;

  /** Custom timeout for form submission in milliseconds */
  timeout?: number;

  /** Whether to handle validation errors automatically */
  handleValidationErrors?: boolean;
}

/**
 * Default form submission options
 */
const DEFAULT_FORM_OPTIONS: FormSubmitOptions = {
   waitForNavigation: false,
   submitButtonSelector: "button[type=\"submit\"]",
   waitForLoadState: true,
   timeout: 30000,
   handleValidationErrors: false
};

/**
 * Fills form fields with provided data and submits the form, iterates through
 * the provided data object and fills each field that has a non-null/undefined
 * value, then triggers form submission with configurable options for navigation
 * and error handling
 *
 * @param {Page} page - Playwright page instance
 * @param {FormData} data - Object containing test ids as keys and values to fill in the form
 * @param {FormSubmitOptions} options - Options for form submission behavior
 * @returns {Promise<void>}
 */
export const submitForm = async(
   page: Page,
   data: FormData,
   options: FormSubmitOptions = DEFAULT_FORM_OPTIONS
): Promise<void> => {
   // Merge with default options
   const opts = { ...DEFAULT_FORM_OPTIONS, ...options };

   // Fill all form fields with provided data
   for (const [testId, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
      // Handle different input types
         const element = page.getByTestId(testId);
         const tagName = await element.evaluate(el => el.tagName.toLowerCase());

         if (tagName === "select") {
            await element.selectOption(value);
         } else if (tagName === "input") {
            const inputType = await element.evaluate(el => (el as HTMLInputElement).type);

            if (inputType === "checkbox") {
               if (value === "true" || value.toLowerCase() === "true") {
                  await element.check();
               } else {
                  await element.uncheck();
               }
            } else if (inputType === "radio") {
               await element.check();
            } else if (inputType === "date") {
               // Ensure date format is YYYY-MM-DD
               await element.fill(value.toString());
            } else {
               await element.fill(value.toString());
            }
         } else {
            await element.fill(value.toString());
         }
      }
   }

   // Create a promise for form submission
   const submitButtonSelector = opts.submitButtonSelector || DEFAULT_FORM_OPTIONS.submitButtonSelector as string;
   const submitPromise = page.locator(submitButtonSelector).click({
      timeout: opts.timeout
   });

   // Handle different waiting strategies
   if (opts.waitForNavigation) {
      // Use the modern approach with waitForURL instead of deprecated waitForNavigation
      await submitPromise;
      await page.waitForLoadState("networkidle", { timeout: opts.timeout });
   } else {
      // Just wait for the click
      await submitPromise;

      // Optionally wait for network requests to complete
      if (opts.waitForLoadState) {
         await page.waitForLoadState("networkidle", { timeout: opts.timeout });
      }
   }

   // Optionally handle validation errors
   if (opts.handleValidationErrors) {
      const hasErrors = await page.locator(ERROR_INDICATOR_SELECTOR).count() > 0;

      if (hasErrors) {
      // Collect all validation errors
         const errors = await page.locator(ERROR_INDICATOR_SELECTOR).allInnerTexts();
         console.warn("Form validation errors:", errors);
      }
   }
};

/**
 * Waits for validation error indicators to appear on the form, checks for the
 * presence of MUI error helper text elements
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<void>}
 */
export const waitForErrorIndicators = async(page: Page): Promise<void> => {
   await expect(page.locator(ERROR_INDICATOR_SELECTOR).first()).toBeVisible();
};

/**
 * Validates that a specific field displays the expected error message, locates
 * the FormHelperText element within the FormControl and verifies it contains
 * the expected validation error message
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
 * Expects a validation error for a specific field with the given message,
 * combines waiting for error indicators and validating the specific field
 * error message
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
 * Clears all form fields to reset form state, useful for resetting forms
 * between test cases or validation checks
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