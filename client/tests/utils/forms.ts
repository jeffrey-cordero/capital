import { expect, type Locator, type Page } from "@playwright/test";

const ERROR_INDICATOR_SELECTOR = "p.Mui-error";

/**
 * Form submission options for customizing the submission behavior
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
}

/**
 * Default form submission options
 */
const DEFAULT_FORM_OPTIONS: FormSubmitOptions = {
   waitForNavigation: false,
   submitButtonSelector: "button[type=\"submit\"]",
   waitForLoadState: true,
   timeout: 30000
};

/**
 * Fills form fields with provided data and submits the form
 *
 * @param {Page} page - Playwright page instance
 * @param {Record<string, any>} data - Object containing test ids as keys and field values to fill in the form
 * @param {FormSubmitOptions} options - Options for form submission behavior
 */
export async function submitForm(
   page: Page,
   data: Record<string, any>,
   options: FormSubmitOptions = DEFAULT_FORM_OPTIONS
): Promise<void> {
   // Merge with default options
   const opts: FormSubmitOptions = { ...DEFAULT_FORM_OPTIONS, ...options };

   // Fill all form fields with the provided data
   for (const [testId, value] of Object.entries(data)) {
      // Skip undefined or null values
      if (value !== undefined && value !== null) {
         const element: Locator = page.getByTestId(testId);
         const tagName: string = await element.evaluate(el => el.tagName.toLowerCase());

         // Handle different input types (select, input, checkbox, radio, date, etc.)
         if (tagName === "select") {
            await element.selectOption(value);
         } else if (tagName === "input") {
            const inputType: string = await element.evaluate(el => (el as HTMLInputElement).type);

            if (inputType === "checkbox") {
               if (value === "true" || value.toLowerCase() === "true") {
                  await element.check();
               } else {
                  await element.uncheck();
               }
            } else if (inputType === "radio") {
               await element.check();
            } else if (inputType === "date") {
               // Ensure the date format is in the format `YYYY-MM-DD`
               await element.fill(new Date(value).toISOString().split("T")[0]);
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

   // Wait for the form submission to complete
   await submitPromise;

   // If applicable, wait for navigation or for all network requests to complete before returning
   if (opts.waitForNavigation) {
      await page.waitForURL(/.*/, { timeout: opts.timeout });
   } else if (opts.waitForLoadState) {
      await page.waitForLoadState("networkidle", { timeout: opts.timeout });
   }
}

/**
 * Asserts a validation error for a specific field with the given message is displayed
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test id of the form field
 * @param {string} expectedMessage - The expected error message text
 */
export async function assertValidationError(
   page: Page,
   testId: string,
   expectedMessage: string
): Promise<void> {
   // Assert the error indicator is visible
   await expect(page.locator(ERROR_INDICATOR_SELECTOR).first()).toBeVisible();

   // Assert the error message is displayed for the specific field
   const errorElement: Locator = page.locator(`.MuiFormControl-root:has([data-testid="${testId}"]) ${ERROR_INDICATOR_SELECTOR}`);
   await expect(errorElement).toContainText(expectedMessage);
}