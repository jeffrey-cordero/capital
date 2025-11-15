import { expect, type Page, type Response } from "@playwright/test";
import type { AssignedUserRecord } from "@tests/fixtures";
import { assertComponentIsHidden, assertComponentIsVisible, assertInputVisibility } from "@tests/utils";
import { assertValidationErrors, submitForm, updateSelectValue } from "@tests/utils/forms";
import { openSidebar } from "@tests/utils/navigation";
import { HTTP_STATUS } from "capital/server";

/**
 * Details form data type for account details updates (name, birthday, theme)
 */
export type DetailsFormData = Partial<{
   name: string;
   birthday: string;
   theme: "light" | "dark";
}>;

/**
 * Security form data type for updates with password change fields
 */
export type SecurityFormData = Partial<{
   username: string;
   email: string;
   password?: string;
   newPassword?: string;
   verifyPassword?: string;
}>;

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
   detailsData?: DetailsFormData;
   securityData?: Partial<SecurityFormData>;
   expectedErrors?: Record<string, string>;
   usersRegistry?: Set<any>;
   assignedRegistry?: Record<string, string>;
};

/**
 * Generates a unique name that's guaranteed to differ from the current value
 *
 * @param {string} currentName - Current name value
 * @returns {string} A unique name different from the current value
 */
export function generateUniqueTestName(currentName: string): string {
   const timestamp = Date.now().toString().slice(-4);
   return `Test Name ${timestamp}`;
}

/**
 * Generates a unique birthday that's guaranteed to differ from the current value
 *
 * @param {string} currentBirthday - Current birthday in YYYY-MM-DD format
 * @returns {string} A unique birthday different from the current value
 */
export function generateUniqueTestBirthday(currentBirthday: string): string {
   const date = new Date(currentBirthday);
   // Add 1 day to ensure it's different
   date.setDate(date.getDate() + 1);
   return date.toISOString().split("T")[0];
}

/**
 * Generates a unique username that's guaranteed to differ from the current value
 *
 * @param {string} currentUsername - Current username
 * @returns {string} A unique username different from the current value
 */
export function generateUniqueTestUsername(currentUsername: string): string {
   const timestamp = Date.now().toString().slice(-4);
   return `testuser${timestamp}`;
}

/**
 * Generates a unique email that's guaranteed to differ from the current value
 *
 * @param {string} currentEmail - Current email
 * @returns {string} A unique email different from the current value
 */
export function generateUniqueTestEmail(currentEmail: string): string {
   const timestamp = Date.now().toString().slice(-4);
   return `test${timestamp}@example.com`;
}

/**
 * Asserts account details (name, birthday, theme) match expected values
 *
 * @param {Page} page - Playwright page instance
 * @param {DetailsFormData} expectedDetails - Expected details to verify
 */
export async function assertAccountDetails(
   page: Page,
   expectedDetails: DetailsFormData
): Promise<void> {
   const birthdayValue: string = expectedDetails.birthday!.includes("T")
      ? expectedDetails.birthday!.split("T")[0] : expectedDetails.birthday!;

   await assertInputVisibility(page, "details-name", "Name", expectedDetails.name);
   await assertInputVisibility(page, "details-birthday", "Birthday", birthdayValue);

   if (expectedDetails.theme) {
      await assertInputVisibility(page, "details-theme", "Theme", expectedDetails.theme);
   }
}

/**
 * Updates details (name, birthday) and optionally toggles theme
 *
 * @param {Page} page - Playwright page instance
 * @param {DetailsFormData} data - Details data to update
 * @param {Record<string, string>} [expectedErrors] - Expected validation errors
 */
export async function updateDetails(
   page: Page,
   data: DetailsFormData,
   expectedErrors?: Record<string, string>
): Promise<void> {
   const formData: Record<string, any> = {};

   if (data.name !== undefined) formData["details-name"] = data.name;
   if (data.birthday !== undefined) formData["details-birthday"] = data.birthday;
   if (data.theme !== undefined) await toggleTheme(page, "details", data.theme);

   // Only submit form if there are name/birthday changes
   if (expectedErrors) {
      await submitForm(page, formData, {
         buttonType: "Update",
         containsErrors: true,
         submitButtonSelector: "[data-testid=\"details-submit\"]"
      });
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
   }
}

/**
 * Updates user details and asserts the changes were saved correctly
 *
 * @param {Page} page - Playwright page instance
 * @param {AssignedUserRecord} assignedUser - Currently assigned user fixture
 * @param {DetailsFormData} data - Details data to update
 * @param {Record<string, string>} [expectedErrors] - Expected validation errors
 */
export async function performAndAssertDetailsUpdate(
   page: Page,
   assignedUser: AssignedUserRecord,
   data: DetailsFormData,
   expectedErrors?: Record<string, string>
): Promise<void> {
   await updateDetails(page, data, expectedErrors);

   if (!expectedErrors) {
      await assertAccountDetails(page, { ...assignedUser.current, ...data });
   } else {
      await assertValidationErrors(page, expectedErrors);
   }
}

/**
 * Toggles the theme between light and dark via sidebar or details form
 *
 * @param {Page} page - Playwright page instance
 * @param {"sidebar" | "details"} method - Method to toggle theme (sidebar switch or details select)
 * @param {?string} expectedTheme - Optional expected theme after toggle
 */
export async function toggleTheme(page: Page, method: "sidebar" | "details", expectedTheme?: "light" | "dark"): Promise<void> {
   if (method === "sidebar") {
      // Toggle via sidebar switch
      await openSidebar(page);
      const themeSwitch = page.getByTestId("theme-switch");
      await assertComponentIsVisible(page, "theme-switch");
      await themeSwitch.click();
   } else {
      // Toggle via details form select
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
 * Asserts the current theme state via multiple verification methods
 *
 * @param {Page} page - Playwright page instance
 * @param {string} expectedTheme - Expected theme value ("light" or "dark")
 */
export async function assertThemeState(page: Page, expectedTheme: "light" | "dark"): Promise<void> {
   const expectedValue = expectedTheme === "dark" ? "true" : "false";

   // Assert via MUI body attribute
   await expect(page.locator("body")).toHaveAttribute("data-dark", expectedValue);

   // Assert via sidebar
   await openSidebar(page);
   await assertComponentIsVisible(page, "theme-switch");
   const switchInput = page.getByTestId("theme-switch").locator("input");

   if (expectedTheme === "dark") {
      await expect(switchInput).toBeChecked();
   } else {
      await expect(switchInput).not.toBeChecked();
   }

   // Close the sidebar
   await page.keyboard.press("Escape");
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
   const value: string = await page.getByTestId(testId).inputValue();
   await assertInputVisibility(page, testId, field.charAt(0).toUpperCase() + field.slice(1), value, true);

   // For password field, verify all 3 password inputs become visible
   if (field === "password") {
      await assertInputVisibility(page, "security-new-password", "New Password");
      await assertInputVisibility(page, "security-verify-password", "Verify Password");
   }

   // Verify cancel button becomes visible
   await assertComponentIsVisible(page, "security-cancel", "Cancel");
   await assertComponentIsVisible(page, "security-submit", "Update");
}

/**
 * Asserts security fields are disabled and have expected values
 * Verifies fields are in view-only mode with specified values
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<SecurityFormData>} expectedValues - Expected field values to verify
 */
export async function assertSecurityDetails(page: Page, expectedValues: Partial<SecurityFormData>): Promise<void> {
   for (const field of ["username", "email", "current-password"]) {
      const label: string = field === "current-password" ? "Password" : field;
      const value: string = label === "Password" ? "********" : expectedValues[field as keyof typeof expectedValues]!;

      // Input should be disabled and show it's respective pen icon for potential updates
      await assertInputVisibility(page, `security-${field}`, label, value, false);
      await assertComponentIsVisible(page, `security-${label.toLowerCase()}-pen`);
   }

   // Additional password fields should only display in edit mode
   await assertComponentIsHidden(page, "security-new-password");
   await assertComponentIsHidden(page, "security-verify-password");

   // Cancel/Submit buttons should only display in edit mode
   await assertComponentIsHidden(page, "security-cancel");
   await assertComponentIsHidden(page, "security-submit");
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
   if (fields.username !== undefined) await toggleSecurityField(page, "username");
   if (fields.email !== undefined) await toggleSecurityField(page, "email");
   if (fields.password !== undefined || fields.newPassword !== undefined) await toggleSecurityField(page, "password");

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
   }
}

/**
 * Updates security fields with automatic toggling and asserts the changes were saved
 *
 * @param {Page} page - Playwright page instance
 * @param {AssignedUserRecord} assignedUser - Currently assigned user fixture
 * @param {Partial<SecurityFormData>} securityData - Security data to update
 * @param {Record<string, string>} [expectedErrors] - Expected validation errors
 */
export async function performAndAssertSecurityUpdate(
   page: Page,
   assignedUser: AssignedUserRecord,
   securityData: Partial<SecurityFormData>,
   expectedErrors?: Record<string, string>
): Promise<void> {
   await updateSecurityFields(page, securityData, expectedErrors);

   if (!expectedErrors) {
      await assertSecurityDetails(page, { ...assignedUser.current, ...securityData });
   } else {
      await assertValidationErrors(page, expectedErrors);
   }
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
   method: "sidebar" | "details",
   expectedTheme?: "light" | "dark"
): Promise<void> {
   await toggleTheme(page, method, expectedTheme);

   // Wait for router data-dark attribute to update (Redux → DOM binding)
   if (expectedTheme) {
      await page.waitForFunction(
         (theme: string) => {
            const router = document.querySelector("[data-testid=\"router\"]");
            return router?.getAttribute("data-dark") === theme;
         },
         expectedTheme === "dark" ? "true" : "false",
         { timeout: 5000 }
      );

      await assertThemeState(page, expectedTheme);
   }
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
 * Performs cancel operation for specified details fields and verifies revert
 * Modifies fields, cancels, and asserts all fields are reverted to original values
 *
 * @param {Page} page - Playwright page instance
 * @param {AssignedUserRecord} assignedUser - User fixture with original values
 * @param {Array<"name" | "birthday">} fieldsToCancel - Fields to test cancel behavior on
 */
export async function performAndAssertCancelDetailsBehavior(
   page: Page,
   assignedUser: AssignedUserRecord,
   fieldsToCancel: Array<"name" | "birthday">
): Promise<void> {
   // Capture original values BEFORE any modifications
   const originalValues: Partial<DetailsFormData> = {};
   for (const field of fieldsToCancel) {
      if (field === "name") {
         originalValues.name = assignedUser.current!.name;
      } else if (field === "birthday") {
         originalValues.birthday = assignedUser.current!.birthday;
      }
   }

   // Modify each field
   for (const field of fieldsToCancel) {
      if (field === "name") {
         const newValue = generateUniqueTestName(originalValues.name!);
         await page.getByTestId("details-name").fill(newValue);
      } else if (field === "birthday") {
         const newValue = generateUniqueTestBirthday(originalValues.birthday!);
         await page.getByTestId("details-birthday").fill(newValue);
      }
   }

   // Verify change detection and click cancel button
   await assertComponentIsVisible(page, "details-cancel", "Cancel");
   await assertComponentIsVisible(page, "details-submit", "Update");
   await page.getByTestId("details-cancel").click();

   // Verify all fields reverted to original state using captured originals
   await assertAccountDetails(page, originalValues);
}

/**
 * Performs cancel operation for specified security fields and verifies revert
 * Enables fields, makes edits, cancels, and asserts all fields are disabled with correct values
 *
 * @param {Page} page - Playwright page instance
 * @param {AssignedUserRecord} assignedUser - User fixture with original values
 * @param {Array<"username" | "email" | "password">} fieldsToCancel - Fields to test cancel behavior on
 */
export async function performAndAssertCancelSecurityBehavior(
   page: Page,
   assignedUser: AssignedUserRecord,
   fieldsToCancel: Array<"username" | "email" | "password">
): Promise<void> {
   // Capture original values BEFORE any modifications
   const originalValues: Partial<SecurityFormData> = {};
   for (const field of fieldsToCancel) {
      if (field === "username") {
         originalValues.username = assignedUser.current!.username;
      } else if (field === "email") {
         originalValues.email = assignedUser.current!.email;
      }
   }

   // Enable and modify each field
   for (const field of fieldsToCancel) {
      await toggleSecurityField(page, field);

      if (field === "username") {
         const newValue = generateUniqueTestUsername(originalValues.username!);
         await page.getByTestId("security-username").fill(newValue);
      } else if (field === "email") {
         const newValue = generateUniqueTestEmail(originalValues.email!);
         await page.getByTestId("security-email").fill(newValue);
      } else if (field === "password") {
         await page.getByTestId("security-current-password").fill("Password1!");
         await page.getByTestId("security-new-password").fill("NewPassword1!");
         await page.getByTestId("security-verify-password").fill("NewPassword1!");
      }
   }

   // Click cancel button
   await page.getByTestId("security-cancel").click();

   // Verify all fields reverted to original state using captured originals
   await assertSecurityDetails(page, originalValues);
}