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

  /** Button type for identifying Create vs Update buttons */
  buttonType?: "Create" | "Update";

  /** Whether the form contains validation errors to avoid waiting for navigation or load state */
  containsErrors?: boolean;
}

/**
 * Default form submission options
 */
const DEFAULT_FORM_OPTIONS: FormSubmitOptions = {
   waitForNavigation: false,
   submitButtonSelector: "button[type=\"submit\"]",
   waitForLoadState: true,
   timeout: 30000,
   containsErrors: false
};

/**
 * Updates a MUI Select element with the specified value
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - Data test ID of the select element
 * @param {string} value - The value to select
 * @returns {Promise<void>}
 */
export async function updateSelectValue(page: Page, testId: string, value: string): Promise<void> {
   const element = page.getByTestId(testId);
   await element.click();
   await page.getByRole("option", { name: value }).click();
}

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
   const opts: FormSubmitOptions = { ...DEFAULT_FORM_OPTIONS, ...options };

   for (const [testId, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
         const element: Locator = page.getByTestId(testId);
         const tagName: string = await element.evaluate(el => el.tagName.toLowerCase());
         const isSelectElement: boolean = await element.evaluate(el => {
            return el.classList.contains("MuiSelect-root") ||
               (el.tagName.toLowerCase() === "div" && el.querySelector("input[role='combobox']") !== null);
         });

         if (isSelectElement) {
            await updateSelectValue(page, testId, value.toString());
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
               await element.fill(new Date(value).toISOString().split("T")[0]);
            } else {
               await element.fill(value.toString());
            }
         } else {
            await element.fill(value.toString());
         }
      }
   }

   const submitButtonSelector = opts.submitButtonSelector || DEFAULT_FORM_OPTIONS.submitButtonSelector as string;

   if (opts.buttonType) {
      // Wait for the submit button to be visible, typically due to an expected collapse animation
      await page.locator(submitButtonSelector).waitFor({ state: "visible", timeout: opts.timeout });
   }

   await page.locator(submitButtonSelector).click({
      timeout: opts.timeout
   });

   if (opts.containsErrors) {
      return;
   } else if (opts.waitForNavigation) {
      await page.waitForURL(/.*/, { timeout: opts.timeout });
   } else if (opts.buttonType === "Update") {
      // Wait for the update button to be hidden to imply a successful request
      await page.locator(submitButtonSelector).waitFor({ state: "hidden", timeout: opts.timeout });
   } else if (opts.waitForLoadState) {
      // Wait for all network requests to complete
      await page.waitForLoadState("networkidle", { timeout: opts.timeout });
   }
}

/**
 * Asserts validation errors for multiple fields
 *
 * @param {Page} page - Playwright page instance
 * @param {Record<string, string | string[]>} errors - Map of test ids to expected error message(s)
 */
export async function assertValidationErrors(
   page: Page,
   errors: Record<string, string | string[]>
): Promise<void> {
   // Ensure at least one error indicator is visible
   await expect(page.locator(ERROR_INDICATOR_SELECTOR).first()).toBeVisible();

   for (const [testId, expectedError] of Object.entries(errors)) {
      const errorElement: Locator = page.locator(`.MuiFormControl-root:has([data-testid="${testId}"]) ${ERROR_INDICATOR_SELECTOR}`);

      if (Array.isArray(expectedError)) {
         for (const message of expectedError) {
            await expect(errorElement).toContainText(message);
         }
      } else {
         await expect(errorElement).toContainText(expectedError);
      }
   }
}