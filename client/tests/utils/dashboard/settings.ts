import { expect, type Locator, type Page, type Response } from "@playwright/test";
import { assertComponentVisibility, assertModalClosed, closeModal } from "@tests/utils";
import { assertValidationErrors, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { assertNotificationStatus } from "@tests/utils/notifications";
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
   await navigateToPath(page, "/dashboard/settings");
   await assertComponentVisibility(page, "settings-details");
}

/**
 * Asserts the display of user details (name, birthday)
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<UserDetails>} expectedDetails - Expected details to verify
 */
export async function assertDetailsDisplay(page: Page, expectedDetails: Partial<UserDetails>): Promise<void> {
   if (expectedDetails.name) {
      const nameDisplay = page.getByTestId("details-name-display");
      await expect(nameDisplay).toBeVisible();
      await expect(nameDisplay).toContainText(expectedDetails.name);
   }

   if (expectedDetails.birthday) {
      const birthdayDisplay = page.getByTestId("details-birthday-display");
      await expect(birthdayDisplay).toBeVisible();
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
         await submitForm(page, formData, { buttonType: "Update", containsErrors: true });
         await assertValidationErrors(page, expectedErrors);
      } else {
         const responsePromise = page.waitForResponse((response: Response) => {
            return response.url().includes("/api/v1/users") && response.request().method() === "PUT";
         });

         await submitForm(page, formData, { buttonType: "Update" });

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
   await themeToggle.click();

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

   // Primary verification via router data-testid
   await expect(page.getByTestId("router")).toHaveAttribute("data-dark", expectedValue);

   // Fallback verification via MUI body attribute
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
 * Opens the security section
 *
 * @param {Page} page - Playwright page instance
 */
export async function openSecuritySection(page: Page): Promise<void> {
   await assertComponentVisibility(page, "security-username", undefined, "Username");
   const securitySection = page.getByTestId("security-section");
   await expect(securitySection).toBeVisible();
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

   // Verify input is enabled
   const input = page.getByTestId(`security-${field}`);
   await expect(input).not.toHaveAttribute("disabled", "true");

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
   const input = page.getByTestId(`security-${field}`);
   await expect(input).toHaveAttribute("disabled", "true");
}

/**
 * Asserts that a security field is enabled
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Field name to check
 */
export async function assertSecurityFieldEnabled(page: Page, field: "username" | "email" | "password"): Promise<void> {
   const input = page.getByTestId(`security-${field}`);
   await expect(input).not.toHaveAttribute("disabled", "true");
}

/**
 * Asserts that all security fields (except optionally one) are disabled
 *
 * @param {Page} page - Playwright page instance
 * @param {string} [excludeField] - Optional field to exclude from disabled check
 */
export async function assertAllSecurityFieldsDisabled(page: Page, excludeField?: string): Promise<void> {
   const fields = ["username", "email", "password"];

   for (const field of fields) {
      if (excludeField && field === excludeField) continue;

      const input = page.getByTestId(`security-${field}`);
      await expect(input).toHaveAttribute("disabled", "true");
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
      await submitForm(page, formData, { buttonType: "Update", containsErrors: true });
      await assertValidationErrors(page, expectedErrors);
   } else {
      const responsePromise = page.waitForResponse((response: Response) => {
         return response.url().includes("/api/v1/users") && response.request().method() === "PUT";
      });

      await submitForm(page, formData, { buttonType: "Update" });

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

   // Password fields are hidden in normal state, so just verify they're disabled
   if (originalValues.password) {
      await expect(page.getByTestId("security-current-password")).toHaveAttribute("disabled", "true");
      await expect(page.getByTestId("security-new-password")).toHaveAttribute("disabled", "true");
      await expect(page.getByTestId("security-verify-password")).toHaveAttribute("disabled", "true");
   }

   // Verify all pen icons are visible
   await expect(page.getByTestId("security-username-pen")).toBeVisible();
   await expect(page.getByTestId("security-email-pen")).toBeVisible();
   await expect(page.getByTestId("security-password-pen")).toBeVisible();

   // Verify all fields are disabled
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
   const downloadPromise = page.context().waitForEvent("download");

   const exportButton = page.getByTestId("action-export");
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
 * @param {Page} page - Playwright page instance
 * @param {any} exportedJSON - Parsed JSON data to validate
 * @param {number} expectedAccountCount - Expected number of accounts in export
 */
export async function assertExportStructure(
   page: Page,
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
   const logoutButton = page.getByTestId("action-logout");
   await expect(logoutButton).toBeVisible();
   await logoutButton.click();

   // Wait for confirmation dialog
   await assertComponentVisibility(page, "logout-confirm-button");

   // Confirm logout
   await page.getByTestId("logout-confirm-button").click();

   // Wait for redirect to login
   await expect(page).toHaveURL(/\/login/);
}

/**
 * Cancels logout operation
 *
 * @param {Page} page - Playwright page instance
 */
export async function cancelLogout(page: Page): Promise<void> {
   const logoutButton = page.getByTestId("action-logout");
   await expect(logoutButton).toBeVisible();
   await logoutButton.click();

   // Wait for confirmation dialog
   await assertComponentVisibility(page, "logout-confirm-button");

   // Cancel logout
   await page.getByTestId("logout-cancel-button").click();

   // Verify still on settings page
   await assertComponentVisibility(page, "settings-details");
}

/**
 * Asserts delete confirmation dialog is visible
 *
 * @param {Page} page - Playwright page instance
 */
export async function assertDeleteConfirmationDialog(page: Page): Promise<void> {
   await assertComponentVisibility(page, "delete-confirm-button");
   await expect(page.getByText("Are you sure you want to delete your account?")).toBeVisible();
}

/**
 * Performs account deletion with optional confirmation
 *
 * @param {Page} page - Playwright page instance
 * @param {boolean} [confirmDelete=true] - Whether to confirm or cancel deletion
 */
export async function performDelete(page: Page, confirmDelete: boolean = true): Promise<void> {
   const deleteButton = page.getByTestId("action-delete");
   await expect(deleteButton).toBeVisible();
   await deleteButton.click();

   // Wait for confirmation dialog
   await assertDeleteConfirmationDialog(page);

   if (confirmDelete) {
      const responsePromise = page.context().waitForEvent("response", (response: Response) => {
         return response.url().includes("/api/v1/users") && response.request().method() === "DELETE";
      });

      // Confirm deletion
      await page.getByTestId("delete-confirm-button").click();

      // Wait for response
      const response = await responsePromise;
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);

      // Wait for redirect to home
      await expect(page).toHaveURL(/^(?!.*settings)/);
   } else {
      // Cancel deletion
      await page.getByTestId("delete-cancel-button").click();

      // Verify still on settings page
      await assertComponentVisibility(page, "settings-details");
   }
}
