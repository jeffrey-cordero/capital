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
   // Merge the provided options with the default options
   const opts: FormSubmitOptions = { ...DEFAULT_FORM_OPTIONS, ...options };

   // Fill all form fields with the provided data
   for (const [testId, value] of Object.entries(data)) {
      // Skip undefined and null values
      if (value !== undefined && value !== null) {
         const element: Locator = page.getByTestId(testId);
         const tagName: string = await element.evaluate(el => el.tagName.toLowerCase());

         // Check if it's a MUI Select component (the test ID is on the Select component itself)
         // MUI Select has data-testid on the Select element which has MuiSelect-root class
         const isMuiSelect = await element.evaluate(el => {
            return el.classList.contains("MuiSelect-root") ||
                   (el.tagName.toLowerCase() === "div" && el.querySelector("input[role='combobox']") !== null);
         });

         // Handle different input types (select, input, checkbox, radio, date, etc.)
         if (isMuiSelect || tagName === "select") {
            // For MUI Select, click to open dropdown then select option
            if (isMuiSelect) {
               await element.click();
               await page.waitForTimeout(200); // Wait for dropdown to open
               await page.getByRole("option", { name: value.toString() }).click();
               await page.waitForTimeout(100); // Wait for selection to complete
            } else {
               await element.selectOption(value);
            }
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

   // Determine submit button selector based on buttonType or default
   let submitButtonSelector = opts.submitButtonSelector || DEFAULT_FORM_OPTIONS.submitButtonSelector as string;
   if (opts.buttonType) {
      submitButtonSelector = "[data-testid=\"account-submit\"]";
      // Wait for button to be visible (Collapse animation)
      await page.locator(submitButtonSelector).waitFor({ state: "visible", timeout: opts.timeout });
   }

   // Create a promise for form submission
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