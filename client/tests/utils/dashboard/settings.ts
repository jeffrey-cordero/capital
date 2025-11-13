import { expect, type Page, type Response } from "@playwright/test";
import { assertComponentVisibility } from "@tests/utils";
import { SETTINGS_ROUTE } from "@tests/utils/authentication";
import { assertValidationErrors, submitForm, updateSelectValue } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import type { UserDetails, UserUpdates } from "capital/user";
import { HTTP_STATUS } from "capital/server";

/**
 * Extended settings data type for form submission with partial user details
 */
export type SettingsFormData = Partial<UserDetails> & { theme?: "light" | "dark"; };

/**
 * Security form data type for updates with password change fields
 */
export type SecurityFormData = Partial<UserUpdates> & {
   password?: string;
   newPassword?: string;
   verifyPassword?: string;
};

/**
 * Options for performing and asserting settings operations
 */
export type PerformSettingsActionOptions = {
   page: Page;
   settingsData?: SettingsFormData;
   securityData?: SecurityFormData;
   expectedErrors?: Record<string, string>;
};

/**
 * Opens the settings page and asserts visibility
 *
 * @param {Page} page - Playwright page instance
 */
export async function openSettingsPage(page: Page): Promise<void> {
   await navigateToPath(page, SETTINGS_ROUTE);
   await page.waitForLoadState("networkidle");
   await assertComponentVisibility(page, "settings-details");
}

/**
 * Asserts the display of user details (name, birthday) by checking input field values
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<UserDetails>} expectedDetails - Expected details to verify
 */
export async function assertDetailsDisplay(page: Page, expectedDetails: Partial<UserDetails>): Promise<void> {
   if (expectedDetails.name) {
      const nameInput = page.getByTestId("details-name");
      await expect(nameInput).toHaveValue(expectedDetails.name);
   }

   if (expectedDetails.birthday) {
      const birthdayInput = page.getByTestId("details-birthday");
      await expect(birthdayInput).toHaveValue(expectedDetails.birthday.split("T")[0]);
   }
}

/**
 * Updates details (name, birthday) and optionally toggles theme
 *
 * @param {Page} page - Playwright page instance
 * @param {SettingsFormData} data - Details data to update
 * @param {Record<string, string>} [expectedErrors] - Expected validation errors
 */
export async function updateDetails(
   page: Page,
   data: SettingsFormData,
   expectedErrors?: Record<string, string>
): Promise<void> {
   const formData: Record<string, any> = {};

   if (data.name !== undefined) formData["details-name"] = data.name;
   if (data.birthday !== undefined) formData["details-birthday"] = data.birthday;

   // Handle theme toggle (non-form-based, client-side only)
   if (data.theme !== undefined) {
      await toggleTheme(page, data.theme);
   }

   // Only submit form if there are name/birthday changes
   if (Object.keys(formData).length > 0) {
      if (expectedErrors) {
         await submitForm(page, formData, {
            buttonType: "Update",
            containsErrors: true,
            submitButtonSelector: "[data-testid=\"details-submit\"]"
         });
         await assertValidationErrors(page, expectedErrors);
      } else {
         const responsePromise = page.waitForResponse((response: Response) => {
            return response.url().includes("/api/v1/users") && response.request().method() === "PUT";
         });

         await submitForm(page, formData, {
            buttonType: "Update",
            submitButtonSelector: "[data-testid=\"details-submit\"]"
         });

         const response = await responsePromise;
         expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);
         await assertComponentVisibility(page, "details-name");
      }
   }
}

/**
 * Toggles the theme between light and dark
 *
 * @param {Page} page - Playwright page instance
 * @param {?string} expectedTheme - Optional expected theme after toggle
 */
export async function toggleTheme(page: Page, expectedTheme?: "light" | "dark"): Promise<void> {
   const themeToggle = page.getByTestId("details-theme-toggle");
   await expect(themeToggle).toBeVisible();

   if (expectedTheme) {
      // Select the specific theme value
      const themeLabel = `${expectedTheme.charAt(0).toUpperCase()}${expectedTheme.slice(1)} Mode`;
      await updateSelectValue(page, "details-theme-toggle", themeLabel);
   } else {
      // Just toggle without checking the exact value
      await themeToggle.click();
   }

   // Wait for theme to apply
   await page.waitForTimeout(100);

   if (expectedTheme) {
      await assertThemeState(page, expectedTheme);
   }
}

/**
 * Asserts the current theme state via multiple verification methods
 *
 * @param {Page} page - Playwright page instance
 * @param {string} expectedTheme - Expected theme value ("light" or "dark")
 */
export async function assertThemeState(page: Page, expectedTheme: "light" | "dark"): Promise<void> {
   const expectedValue = expectedTheme === "dark" ? "true" : "false";

   // Verify via MUI body attribute (router attribute is verified via waitForFunction in performAndAssertThemeToggle)
   await expect(page.locator("body")).toHaveAttribute("data-dark", expectedValue);
}

/**
 * Cancels details form edits and reverts changes
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<UserDetails>} originalValues - Original values to verify revert to
 */
export async function cancelDetailsEdit(
   page: Page,
   originalValues: Partial<UserDetails>
): Promise<void> {
   const cancelButton = page.getByTestId("details-cancel");
   await expect(cancelButton).toBeVisible();
   await cancelButton.click();

   // Verify cancel button disappears
   await expect(cancelButton).toBeHidden();

   // Verify original values are shown
   if (originalValues.name) {
      const nameInput = page.getByTestId("details-name");
      await expect(nameInput).toHaveValue(originalValues.name);
   }

   if (originalValues.birthday) {
      const birthdayInput = page.getByTestId("details-birthday");
      await expect(birthdayInput).toHaveValue(originalValues.birthday);
   }
}

/**
 * Toggles a security field to enable editing
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Field name ("username", "email", or "password")
 */
export async function toggleSecurityField(page: Page, field: "username" | "email" | "password"): Promise<void> {
   const penIcon = page.getByTestId(`security-${field}-pen`);
   await expect(penIcon).toBeVisible();
   await penIcon.click();

   // Verify pen icon disappears
   await expect(penIcon).toBeHidden();

   // Verify input is enabled by checking it does NOT have disabled attribute
   const testId = field === "password" ? "security-current-password" : `security-${field}`;
   const input = page.getByTestId(testId);
   await expect(input).not.toHaveAttribute("disabled");

   // For password field, verify all 3 password inputs become visible
   if (field === "password") {
      await expect(page.getByTestId("security-current-password")).toBeVisible();
      await expect(page.getByTestId("security-new-password")).toBeVisible();
      await expect(page.getByTestId("security-verify-password")).toBeVisible();
   }

   // Verify cancel button becomes visible
   const cancelButton = page.getByTestId("security-cancel");
   await expect(cancelButton).toBeVisible();
}

/**
 * Asserts that a security field is disabled
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Field name to check
 */
export async function assertSecurityFieldDisabled(page: Page, field: "username" | "email" | "password"): Promise<void> {
   const testId = field === "password" ? "security-current-password" : `security-${field}`;
   const input = page.getByTestId(testId);
   await expect(input).toHaveAttribute("disabled");
}

/**
 * Asserts that a security field is enabled
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Field name to check
 */
export async function assertSecurityFieldEnabled(page: Page, field: "username" | "email" | "password"): Promise<void> {
   const testId = field === "password" ? "security-current-password" : `security-${field}`;
   const input = page.getByTestId(testId);
   await expect(input).not.toHaveAttribute("disabled");
}

/**
 * Asserts that all security fields (except optionally one) are disabled
 *
 * @param {Page} page - Playwright page instance
 * @param {string} [excludeField] - Optional field to exclude from disabled check
 */
export async function assertAllSecurityFieldsDisabled(page: Page, excludeField?: string): Promise<void> {
   const fields = ["username", "email", "current-password"];

   for (const field of fields) {
      if (excludeField && field === excludeField) continue;

      const input = page.getByTestId(`security-${field}`);
      await expect(input).toHaveAttribute("disabled");
   }
}

/**
 * Updates one or more security fields and submits the form
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<SecurityFormData>} fields - Fields to update
 * @param {Record<string, string>} [expectedErrors] - Expected validation errors
 */
export async function updateSecurityFields(
   page: Page,
   fields: Partial<SecurityFormData>,
   expectedErrors?: Record<string, string>
): Promise<void> {
   const formData: Record<string, any> = {};

   // Build form data object
   if (fields.username !== undefined) formData["security-username"] = fields.username;
   if (fields.email !== undefined) formData["security-email"] = fields.email;
   if (fields.password !== undefined) formData["security-current-password"] = fields.password;
   if (fields.newPassword !== undefined) formData["security-new-password"] = fields.newPassword;
   if (fields.verifyPassword !== undefined) formData["security-verify-password"] = fields.verifyPassword;

   if (expectedErrors) {
      await submitForm(page, formData, {
         buttonType: "Update",
         submitButtonSelector: "[data-testid=\"security-submit\"]",
         containsErrors: true
      });
      await assertValidationErrors(page, expectedErrors);
   } else {
      const responsePromise = page.waitForResponse((response: Response) => {
         return response.url().includes("/api/v1/users") && response.request().method() === "PUT";
      });

      await submitForm(page, formData, {
         buttonType: "Update",
         submitButtonSelector: "[data-testid=\"security-submit\"]"
      });

      const response = await responsePromise;
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);

      // Verify edit mode closes (cancel button disappears)
      await expect(page.getByTestId("security-cancel")).toBeHidden();

      // Verify all fields become disabled
      await assertAllSecurityFieldsDisabled(page);
   }
}

/**
 * Cancels security field edits and reverts changes
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<SecurityFormData>} originalValues - Original values to verify
 */
export async function cancelSecurityFieldEdit(
   page: Page,
   originalValues: Partial<SecurityFormData>
): Promise<void> {
   const cancelButton = page.getByTestId("security-cancel");
   await expect(cancelButton).toBeVisible();
   await cancelButton.click();

   // Verify cancel button disappears
   await expect(cancelButton).toBeHidden();

   // Verify original values are shown
   if (originalValues.username) {
      const usernameInput = page.getByTestId("security-username");
      await expect(usernameInput).toHaveValue(originalValues.username);
   }

   if (originalValues.email) {
      const emailInput = page.getByTestId("security-email");
      await expect(emailInput).toHaveValue(originalValues.email);
   }

   // Verify all pen icons are visible
   await expect(page.getByTestId("security-username-pen")).toBeVisible();
   await expect(page.getByTestId("security-email-pen")).toBeVisible();
   await expect(page.getByTestId("security-password-pen")).toBeVisible();

   // Verify all visible fields are disabled
   await assertAllSecurityFieldsDisabled(page);
}

/**
 * Asserts password field visibility state
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Password field ("current", "new", or "verify")
 * @param {boolean} expectedVisible - Expected visibility state
 */
export async function assertPasswordVisibilityToggle(
   page: Page,
   field: "current" | "new" | "verify",
   expectedVisible: boolean
): Promise<void> {
   const input = page.getByTestId(`security-${field}-password`);
   const inputType = await input.evaluate((el: HTMLInputElement) => el.type);

   if (expectedVisible) {
      expect(inputType).toBe("text");
   } else {
      expect(inputType).toBe("password");
   }
}

/**
 * Toggles password visibility for a specific password field
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Password field ("current", "new", or "verify")
 */
export async function togglePasswordVisibility(page: Page, field: "current" | "new" | "verify"): Promise<void> {
   const toggle = page.getByTestId(`security-${field}-password-visibility`);
   await expect(toggle).toBeVisible();
   await toggle.click();
}

/**
 * Downloads the export file and returns the parsed JSON
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<any>} Parsed export JSON data
 */
export async function performExport(page: Page): Promise<any> {
   const downloadPromise = page.waitForEvent("download");

   const exportButton = page.getByTestId("settings-export");
   await expect(exportButton).toBeVisible();
   await exportButton.click();

   const download = await downloadPromise;

   // Verify filename
   expect(download.suggestedFilename()).toBe("capital_export.json");

   // Save to temp and read
   const path = await download.path();
   const fs = await import("fs");
   const content = fs.readFileSync(path!, "utf-8");

   return JSON.parse(content);
}

/**
 * Asserts the structure of the exported JSON
 *
 * @param {any} exportedJSON - Parsed JSON data to validate
 * @param {number} expectedAccountCount - Expected number of accounts in export
 */
export async function assertExportStructure(
   exportedJSON: any,
   expectedAccountCount: number
): Promise<void> {
   // Verify timestamp
   expect(exportedJSON.timestamp).toBeDefined();
   expect(typeof exportedJSON.timestamp).toBe("string");

   // Verify settings object
   expect(exportedJSON.settings).toBeDefined();
   expect(typeof exportedJSON.settings).toBe("object");

   // Verify accounts array
   expect(exportedJSON.accounts).toBeDefined();
   expect(Array.isArray(exportedJSON.accounts)).toBe(true);
   expect(exportedJSON.accounts.length).toBe(expectedAccountCount);

   // Verify account_order is NOT included
   for (const account of exportedJSON.accounts) {
      expect(account.account_order).toBeUndefined();
   }

   // Verify accounts have expected fields
   for (const account of exportedJSON.accounts) {
      expect(account.account_id).toBeDefined();
      expect(account.name).toBeDefined();
      expect(account.balance).toBeDefined();
      expect(account.type).toBeDefined();
   }

   // Verify budgets and transactions exist
   expect(exportedJSON.budgets).toBeDefined();
   expect(exportedJSON.transactions).toBeDefined();
}

/**
 * Performs logout with confirmation
 *
 * @param {Page} page - Playwright page instance
 */
export async function performLogout(page: Page): Promise<void> {
   const logoutButton = page.getByTestId("settings-logout");
   await expect(logoutButton).toBeVisible();
   await logoutButton.click();

   // Wait for confirmation dialog
   await assertComponentVisibility(page, "settings-logout-confirm");

   // Confirm logout
   await page.getByTestId("settings-logout-confirm").click();

   // Wait for redirect to login
   await expect(page).toHaveURL(/\/login/);
}

/**
 * Cancels logout operation
 *
 * @param {Page} page - Playwright page instance
 */
export async function cancelLogout(page: Page): Promise<void> {
   const logoutButton = page.getByTestId("settings-logout");
   await expect(logoutButton).toBeVisible();
   await logoutButton.click();

   // Wait for confirmation dialog
   await assertComponentVisibility(page, "settings-logout-cancel");

   // Cancel logout
   await page.getByTestId("settings-logout-cancel").click();

   // Verify still on settings page
   await assertComponentVisibility(page, "settings-details");
}

/**
 * Asserts delete confirmation dialog is visible
 *
 * @param {Page} page - Playwright page instance
 */
export async function assertDeleteConfirmationDialog(page: Page): Promise<void> {
   await assertComponentVisibility(page, "settings-delete-account-confirm");
   await expect(page.getByText("Are you sure you want to delete your account?")).toBeVisible();
}

/**
 * Performs account deletion with optional confirmation
 *
 * @param {Page} page - Playwright page instance
 * @param {boolean} [confirmDelete=true] - Whether to confirm or cancel deletion
 */
export async function performDelete(page: Page, confirmDelete: boolean = true): Promise<void> {
   const deleteButton = page.getByTestId("settings-delete-account");
   await expect(deleteButton).toBeVisible();
   await deleteButton.click();

   // Wait for confirmation dialog
   await assertDeleteConfirmationDialog(page);

   if (confirmDelete) {
      const responsePromise = page.context().waitForEvent("response", (response: Response) => {
         return response.url().includes("/api/v1/users") && response.request().method() === "DELETE";
      });

      // Confirm deletion
      await page.getByTestId("settings-delete-account-confirm").click();

      // Wait for response
      const response = await responsePromise;
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);

      // Wait for redirect to home
      await expect(page).toHaveURL(/^(?!.*settings)/);
   } else {
      // Cancel deletion
      await page.getByTestId("settings-delete-account-cancel").click();

      // Verify still on settings page
      await assertComponentVisibility(page, "settings-details");
   }
}

/**
 * Performs Details form update and asserts the result
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<SettingsFormData>} data - Data to update
 * @param {Record<string, string>} [expectedErrors] - Expected validation errors
 */
export async function performAndAssertDetailsUpdate(
   page: Page,
   data: Partial<SettingsFormData>,
   expectedErrors?: Record<string, string>
): Promise<void> {
   await updateDetails(page, data, expectedErrors);

   if (!expectedErrors) {
      const expectedDetails: Partial<UserDetails> = {};
      if (data.name) expectedDetails.name = data.name;
      if (data.birthday) expectedDetails.birthday = data.birthday;
      await assertDetailsDisplay(page, expectedDetails);
   }
}

/**
 * Performs theme toggle and asserts the result with proper dataset wait
 *
 * @param {Page} page - Playwright page instance
 * @param {string} newTheme - Expected theme after toggle
 */
export async function performAndAssertThemeToggle(
   page: Page,
   newTheme: "light" | "dark"
): Promise<void> {
   await toggleTheme(page, newTheme);

   // Wait for router data-dark attribute to update (Redux → DOM binding)
   await page.waitForFunction(
      (expectedTheme: string) => {
         const router = document.querySelector('[data-testid="router"]');
         return router?.getAttribute('data-dark') === expectedTheme;
      },
      newTheme === "dark" ? "true" : "false",
      { timeout: 5000 }
   );

   await assertThemeState(page, newTheme);
}

/**
 * Performs security field toggle and update with assertions
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Field to update
 * @param {Partial<SecurityFormData>} data - Data to update
 * @param {Record<string, string>} [expectedErrors] - Expected validation errors
 */
export async function performAndAssertSecurityUpdate(
   page: Page,
   field: "username" | "email" | "password",
   data: Partial<SecurityFormData>,
   expectedErrors?: Record<string, string>
): Promise<void> {
   await toggleSecurityField(page, field);
   await updateSecurityFields(page, data, expectedErrors);

   if (!expectedErrors) {
      await assertAllSecurityFieldsDisabled(page);
   }
}
