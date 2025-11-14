import { expect, type Page, type Response } from "@playwright/test";
import { assertComponentIsHidden, assertComponentIsVisible, assertInputVisibility } from "@tests/utils";
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
 * Options for performing and asserting details form updates
 */
export type PerformDetailsUpdateOptions = {
   page: Page;
   detailsData: Partial<SettingsFormData>;
   baseDetailValues?: Partial<UserDetails>;
   expectedErrors?: Record<string, string>;
};

/**
 * Options for performing and asserting security field updates
 */
export type PerformSecurityUpdateOptions = {
   page: Page;
   securityData: Partial<SecurityFormData>;
   expectedErrors?: Record<string, string>;
};

/**
 * Options for unified settings action (details, security, or both)
 */
export type PerformAndAssertSettingsActionOptions = {
   page: Page;
   detailsData?: Partial<SettingsFormData>;
   securityData?: Partial<SecurityFormData>;
   expectedErrors?: Record<string, string>;
   usersRegistry?: Set<any>;
   assignedRegistry?: Record<string, string>;
};

/**
 * Fills field with smart value selection, using alternate if primary matches current value
 */
export async function smartFillField(
   page: Page,
   testId: string,
   primaryValue: string,
   alternateValue: string
): Promise<string> {
   const input = page.getByTestId(testId);
   const currentValue = await input.inputValue();
   const valueToUse = currentValue === primaryValue ? alternateValue : primaryValue;
   await input.fill(valueToUse);
   return valueToUse;
}

/**
 * Opens the settings page and asserts visibility
 *
 * @param {Page} page - Playwright page instance
 */
export async function openSettingsPage(page: Page): Promise<void> {
   await navigateToPath(page, SETTINGS_ROUTE);
   await assertComponentIsVisible(page, "settings-details");
}

/**
 * Asserts account details (name, birthday, theme) match expected values
 */
export async function assertAccountDetails(
   page: Page,
   expectedDetails?: Partial<{ name?: string; birthday?: string; theme?: "light" | "dark" }>
): Promise<void> {
   if (expectedDetails?.name) {
      await expect(page.getByTestId("details-name")).toHaveValue(expectedDetails.name);
   }

   if (expectedDetails?.birthday) {
      const birthdayValue = expectedDetails.birthday.includes("T")
         ? expectedDetails.birthday.split("T")[0]
         : expectedDetails.birthday;
      await expect(page.getByTestId("details-birthday")).toHaveValue(birthdayValue);
   }

   if (expectedDetails?.theme) {
      const expectedValue = expectedDetails.theme === "dark" ? "true" : "false";
      await expect(page.locator("body")).toHaveAttribute("data-dark", expectedValue);
   }
}

/**
 * Alias for assertAccountDetails - consolidated for consistency with accounts.spec.ts
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<UserDetails>} expectedDetails - Expected details to verify
 */
export async function assertDetailsDisplay(page: Page, expectedDetails: Partial<UserDetails>): Promise<void> {
   await assertAccountDetails(page, expectedDetails);
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
         await assertInputVisibility(page, "details-name", "Name");
      }
   }
}

/**
 * Updates user details and asserts the changes were saved correctly
 */
export async function performAndAssertDetailsUpdate(
   page: Page,
   data: Partial<SettingsFormData>,
   expectedErrors?: Record<string, string>
): Promise<void> {
   await updateDetails(page, data, expectedErrors);

   if (!expectedErrors && data) {
      const expectedDetails: Partial<UserDetails> = {};
      if (data.name) expectedDetails.name = data.name;
      if (data.birthday) expectedDetails.birthday = data.birthday;
      await assertDetailsDisplay(page, expectedDetails);
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
   await assertComponentIsVisible(page, "details-theme-toggle");

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
 * Gets the current theme and returns both current and opposite theme values
 *
 * @param {Page} page - Playwright page instance
 */
export async function getCurrentAndOppositeTheme(page: Page): Promise<{ current: "light" | "dark"; opposite: "light" | "dark"; }> {
   const themeValue = await page.getByTestId("router").getAttribute("data-dark");
   const current = themeValue === "true" ? "dark" : "light";
   const opposite = current === "dark" ? "light" : "dark";
   return { current, opposite };
}

/**
 * Asserts the sidebar theme switch reflects the expected theme state
 *
 * @param {Page} page - Playwright page instance
 * @param {string} expectedTheme - Expected theme value ("light" or "dark")
 */
export async function assertSidebarTheme(page: Page, expectedTheme: "light" | "dark"): Promise<void> {
   // Check if sidebar is visible, open if needed
   const themeSwitch = page.getByTestId("theme-switch");
   const wasVisible = await themeSwitch.isVisible();

   if (!wasVisible) {
      // Open the sidebar by clicking the toggle
      const sidebarToggle = page.getByTestId("sidebar-toggle");
      await sidebarToggle.click();
   }

   // Check the switch input's checked state
   await assertComponentIsVisible(page, "theme-switch");
   const switchInput = page.getByTestId("theme-switch").locator("input");
   if (expectedTheme === "dark") {
      await expect(switchInput).toBeChecked();
   } else {
      await expect(switchInput).not.toBeChecked();
   }

   // Close the sidebar if it wasn't open before
   if (!wasVisible) {
      await page.keyboard.press("Escape");
      await assertComponentIsHidden(page, "theme-switch");
   }
}

/**
 * Asserts the theme toggle in settings form displays the expected theme value
 *
 * @param {Page} page - Playwright page instance
 * @param {string} expectedTheme - Expected theme value ("light" or "dark")
 */
export async function assertThemeInSettingsForm(page: Page, expectedTheme: "light" | "dark"): Promise<void> {
   const themeLabel = `${expectedTheme.charAt(0).toUpperCase()}${expectedTheme.slice(1)} Mode`;
   const themeToggle = page.getByTestId("details-theme-toggle");
   await expect(themeToggle).toHaveAttribute("value", themeLabel);
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
 * Fills fields smartly, verifies change detection, then cancels and asserts revert
 */
export async function smartFillAndCancel(
   page: Page,
   fields: Array<[testId: string, primaryValue: string, alternateValue: string]>,
   originalValues: Record<string, string>
): Promise<void> {
   // Smart fill all fields
   for (const [testId, primary, alternate] of fields) {
      await smartFillField(page, testId, primary, alternate);
   }

   // Verify change detection (cancel button should appear)
   await assertComponentIsVisible(page, "details-cancel");

   // Cancel and verify revert
   const cancelButton = page.getByTestId("details-cancel");
   await cancelButton.click();
   await expect(cancelButton).toBeHidden();

   // Verify all fields reverted to original values
   for (const [testId] of fields) {
      const input = page.getByTestId(testId);
      await expect(input).toHaveValue(originalValues[testId]);
   }
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
      await assertInputVisibility(page, "security-current-password", "Password");
      await assertInputVisibility(page, "security-new-password", "New Password");
      await assertInputVisibility(page, "security-verify-password", "Verify Password");
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
 * Asserts security fields are disabled and have expected values (post-update state)
 * Verifies fields return to initial state with new default values after update
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<SecurityFormData>} [expectedValues] - Expected field values after update
 */
export async function assertSecurityUpdates(page: Page, expectedValues?: Partial<SecurityFormData>): Promise<void> {
   const fields = ["username", "email", "current-password"];

   for (const field of fields) {
      const input = page.getByTestId(`security-${field}`);
      await expect(input).toHaveAttribute("disabled");

      // Verify expected values if provided
      if (expectedValues) {
         if (field === "username" && expectedValues.username !== undefined) {
            await expect(input).toHaveValue(expectedValues.username);
         } else if (field === "email" && expectedValues.email !== undefined) {
            await expect(input).toHaveValue(expectedValues.email);
         }
      }

      // Verify pen icon is visible (field is in view-only mode)
      const penField = field === "current-password" ? "password" : field;
      await assertComponentIsVisible(page, `security-${penField}-pen`);
   }

   // Verify cancel button is hidden
   await assertComponentIsHidden(page, "security-cancel");
}

/**
 * Updates one or more security fields and submits the form
 * Automatically toggles fields that are being updated
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
   // Auto-toggle fields that are being updated
   if (fields.username !== undefined) {
      await toggleSecurityField(page, "username");
      await assertSecurityFieldEnabled(page, "username");
   }

   if (fields.email !== undefined) {
      await toggleSecurityField(page, "email");
      await assertSecurityFieldEnabled(page, "email");
   }

   if (fields.password !== undefined || fields.newPassword !== undefined) {
      await toggleSecurityField(page, "password");
      // Password fields become visible when toggled
   }

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

      // Verify all fields are disabled with new values (comprehensive post-update state verification)
      await assertSecurityUpdates(page, fields);
   }
}

/**
 * Updates security fields with automatic toggling and asserts the changes were saved
 */
export async function performAndAssertSecurityUpdate(
   page: Page,
   securityData: Partial<SecurityFormData>,
   expectedErrors?: Record<string, string>
): Promise<void> {
   await updateSecurityFields(page, securityData, expectedErrors);
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
   await assertComponentIsVisible(page, "security-username-pen");
   await assertComponentIsVisible(page, "security-email-pen");
   await assertComponentIsVisible(page, "security-password-pen");

   // Verify all visible fields are disabled
   await assertSecurityUpdates(page);
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
   await assertComponentIsVisible(page, "settings-logout-confirm");

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
   await assertComponentIsVisible(page, "settings-logout-cancel");

   // Cancel logout
   await page.getByTestId("settings-logout-cancel").click();

   // Verify still on settings page
   await assertComponentIsVisible(page, "settings-details");
}

/**
 * Asserts delete confirmation dialog is visible
 *
 * @param {Page} page - Playwright page instance
 */
export async function assertDeleteConfirmationDialog(page: Page): Promise<void> {
   await assertComponentIsVisible(page, "settings-delete-account-confirm");
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
      await assertComponentIsVisible(page, "settings-details");
   }
}


/**
 * Toggles the theme and asserts the change was applied correctly
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
   await assertSidebarTheme(page, newTheme);
}

/**
 * Asserts the initial state of security form with all fields disabled
 */
export async function assertInitialSecurityState(
   page: Page,
   expectedValues?: { username?: string; email?: string }
): Promise<void> {
   // Verify security fields using assertInputVisibility with disabled state
   await assertInputVisibility(page, "security-username", "Username", expectedValues?.username, false);
   await assertInputVisibility(page, "security-email", "Email", expectedValues?.email, false);

   // Verify password field is disabled (no value to check initially)
   const passwordInput = page.getByTestId("security-current-password");
   await expect(passwordInput).toHaveAttribute("disabled");

   // Verify pen icons are visible for all fields
   await assertComponentIsVisible(page, "security-username-pen");
   await assertComponentIsVisible(page, "security-email-pen");
   await assertComponentIsVisible(page, "security-password-pen");

   // Verify new and verify password fields are hidden in initial state
   await assertComponentIsHidden(page, "security-new-password");
   await assertComponentIsHidden(page, "security-verify-password");

   // Verify cancel button is hidden
   await assertComponentIsHidden(page, "security-cancel");
}

/**
 * Updates a details field and asserts the change is detected
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Field name ("name" or "birthday")
 * @param {string} value - Value to fill
 */
export async function updateDetailsField(page: Page, field: "name" | "birthday", value: string): Promise<void> {
   const testId = `details-${field}`;
   await page.getByTestId(testId).fill(value);
   await assertComponentIsVisible(page, "details-cancel");
}

/**
 * Tests password field visibility toggle for a specific field
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Password field type ("current", "new", or "verify")
 */
export async function testPasswordVisibilityToggle(page: Page, field: "current" | "new" | "verify"): Promise<void> {
   await assertPasswordVisibilityToggle(page, field, false);
   await togglePasswordVisibility(page, field);
   await assertPasswordVisibilityToggle(page, field, true);
   await togglePasswordVisibility(page, field);
   await assertPasswordVisibilityToggle(page, field, false);
}

/**
 * Tests all three password fields for independent visibility toggles
 *
 * @param {Page} page - Playwright page instance
 */
export async function testAllPasswordVisibilityToggles(page: Page): Promise<void> {
   // Toggle password field to enable visibility toggles for all three password fields
   await toggleSecurityField(page, "password");

   await testPasswordVisibilityToggle(page, "current");
   await testPasswordVisibilityToggle(page, "new");
   await testPasswordVisibilityToggle(page, "verify");
}

/**
 * Asserts security field is in view-only mode (disabled + pen visible)
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Field name ("username", "email", or "password")
 */
export async function assertSecurityFieldViewMode(page: Page, field: "username" | "email" | "password"): Promise<void> {
   const penField = field === "password" ? "password" : field;
   await assertSecurityFieldDisabled(page, field);
   await assertComponentIsVisible(page, `security-${penField}-pen`);
}

/**
 * Asserts security field is in edit mode (enabled + pen hidden)
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Field name ("username", "email", or "password")
 */
export async function assertSecurityFieldEditMode(page: Page, field: "username" | "email" | "password"): Promise<void> {
   const penField = field === "password" ? "password" : field;
   await assertSecurityFieldEnabled(page, field);
   await assertComponentIsHidden(page, `security-${penField}-pen`);
}

/**
 * Toggles a security field to edit mode and asserts the state change
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Field name ("username", "email", or "password")
 */
export async function enableSecurityFieldEdit(page: Page, field: "username" | "email" | "password"): Promise<void> {
   await toggleSecurityField(page, field);
   await assertSecurityFieldEditMode(page, field);
   await assertComponentIsVisible(page, "security-cancel");
}

/**
 * Captures current security field value, generates new value, and updates it
 *
 * @param {Page} page - Playwright page instance
 * @param {string} field - Field name ("username" or "email")
 * @param {string} newValue - New value to set
 * @returns {Promise<string>} The original value before update
 */
export async function captureAndUpdateSecurityField(page: Page, field: "username" | "email", newValue: string): Promise<string> {
   const testId = `security-${field}`;
   const originalValue = await page.getByTestId(testId).inputValue();
   await enableSecurityFieldEdit(page, field);
   await page.getByTestId(testId).fill(newValue);
   return originalValue;
}

/**
 * Asserts all security fields are in disabled state (view-only mode)
 *
 * @param {Page} page - Playwright page instance
 */
export async function assertAllSecurityFieldsViewMode(page: Page): Promise<void> {
   await assertSecurityFieldViewMode(page, "username");
   await assertSecurityFieldViewMode(page, "email");
   await assertSecurityFieldViewMode(page, "password");
}

