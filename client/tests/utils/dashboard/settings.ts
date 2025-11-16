import { expect, type Page, type Response } from "@playwright/test";
import type { AssignedUserRecord } from "@tests/fixtures";
import { assertComponentIsHidden, assertComponentIsVisible, assertInputVisibility } from "@tests/utils";
import { loginUser, logoutUser } from "@tests/utils/authentication";
import { submitForm, updateSelectValue } from "@tests/utils/forms";
import { openSidebar } from "@tests/utils/navigation";
import { updateUserInRegistries } from "@tests/utils/user-management";
import type { Account } from "capital/accounts";
import type { OrganizedBudgets } from "capital/budgets";
import { generateTestCredentials, generateUniqueTestBirthday, generateUniqueTestName } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";
import type { Transaction } from "capital/transactions";
import type { UserDetails } from "capital/user";

/**
 * Exported account data structure matching the download format
 */
export type ExportData = {
   timestamp: string;
   settings: UserDetails;
   accounts: Account[];
   budgets: OrganizedBudgets;
   transactions: Transaction[];
};

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
   usersRegistry?: Set<unknown>;
   assignedRegistry?: Record<string, string>;
};

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
 * Updates details fields and submits the form
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
 * Generates unique test values for specified settings fields
 *
 * @param {Page} page - Playwright page instance
 * @param {string[]} fieldsToUpdate - Field names: "name", "birthday", "theme", "username", "email", "password", "newPassword", "verifyPassword"
 * @returns {Promise<Record<string, string>>} Object with generated unique values
 */
export async function generateUniqueUpdateValues(
   page: Page,
   fieldsToUpdate: string[]
): Promise<Record<string, string>> {
   const updates: Record<string, string> = {};

   for (const field of fieldsToUpdate) {
      switch (field) {
         case "name": {
            updates.name = generateUniqueTestName();
            break;
         }
         case "birthday": {
            const current = await page.getByTestId("details-birthday").inputValue();
            updates.birthday = generateUniqueTestBirthday(current);
            break;
         }
         case "theme": {
            const { opposite } = await getCurrentAndOppositeTheme(page);
            updates.theme = opposite;
            break;
         }
         case "username": {
            const { username } = generateTestCredentials();
            updates.username = username;
            break;
         }
         case "email": {
            const { email } = generateTestCredentials();
            updates.email = email;
            break;
         }
         case "password":
            updates.password = "CurrentPassword1!";
            break;
         case "newPassword":
            updates.newPassword = "NewPassword1!";
            break;
         case "verifyPassword":
            updates.verifyPassword = "NewPassword1!";
            break;
      }
   }

   return updates;
}

/**
 * Updates user details with auto-generated values and asserts persistence
 *
 * @param {Page} page - Playwright page instance
 * @param {AssignedUserRecord} assignedUser - Currently assigned user fixture
 * @param {string[]} fieldsToUpdate - Fields to update: "name", "birthday", "theme"
 */
export async function performAndAssertDetailsUpdate(
   page: Page,
   assignedUser: AssignedUserRecord,
   fieldsToUpdate: string[]
): Promise<void> {
   const detailsData = (await generateUniqueUpdateValues(page, fieldsToUpdate)) as DetailsFormData;

   await updateDetails(page, detailsData);
   const updatedDetailsData: DetailsFormData = { ...assignedUser.current, ...detailsData };

   await assertAccountDetails(page, updatedDetailsData);

   // Reload the page to ensure the changes are persisted
   await page.reload();
   await assertAccountDetails(page, updatedDetailsData);
}

/**
 * Toggles theme via sidebar or details form
 *
 * @param {Page} page - Playwright page instance
 * @param {"sidebar" | "details"} method - Toggle method
 * @param {("light" | "dark")} [expectedTheme] - Expected theme after toggle
 */
export async function toggleTheme(page: Page, method: "sidebar" | "details", expectedTheme?: "light" | "dark"): Promise<void> {
   if (method === "sidebar") {
      await openSidebar(page);
      const themeSwitch = page.getByTestId("theme-switch");
      await assertComponentIsVisible(page, "theme-switch");
      await themeSwitch.click();
   } else {
      const themeToggle = page.getByTestId("details-theme-toggle");
      await assertComponentIsVisible(page, "details-theme-toggle");

      if (expectedTheme) {
         const themeLabel = `${expectedTheme.charAt(0).toUpperCase()}${expectedTheme.slice(1)} Mode`;
         await updateSelectValue(page, "details-theme-toggle", themeLabel);
      } else {
         await themeToggle.click();
      }
   }

   await page.waitForTimeout(100);

   if (expectedTheme) {
      await assertThemeState(page, expectedTheme);
   }
}

/**
 * Gets current and opposite theme values
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<{current: "light" | "dark"; opposite: "light" | "dark"}>} Current and opposite theme values
 */
export async function getCurrentAndOppositeTheme(page: Page): Promise<{ current: "light" | "dark"; opposite: "light" | "dark"; }> {
   const themeValue = await page.getByTestId("router").getAttribute("data-dark");
   const current = themeValue === "true" ? "dark" : "light";
   const opposite = current === "dark" ? "light" : "dark";

   return { current, opposite };
}

/**
 * Asserts current theme state
 *
 * @param {Page} page - Playwright page instance
 * @param {("light" | "dark")} expectedTheme - Expected theme value
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

   await page.keyboard.press("Escape");
}

/**
 * Toggles a security field to enable editing
 *
 * @param {Page} page - Playwright page instance
 * @param {("username" | "email" | "password")} field - Field name to toggle
 */
export async function toggleSecurityField(page: Page, field: "username" | "email" | "password"): Promise<void> {
   const penIcon = page.getByTestId(`security-${field}-pen`);
   await expect(penIcon).toBeVisible();
   await penIcon.click();

   await expect(penIcon).toBeHidden();

   const testId = field === "password" ? "security-current-password" : `security-${field}`;
   const value: string = await page.getByTestId(testId).inputValue();
   await assertInputVisibility(page, testId, field.charAt(0).toUpperCase() + field.slice(1), value, true);

   if (field === "password") {
      await assertInputVisibility(page, "security-new-password", "New Password");
      await assertInputVisibility(page, "security-verify-password", "Verify Password");
   }

   // Verify cancel button becomes visible
   await assertComponentIsVisible(page, "security-cancel", "Cancel");
   await assertComponentIsVisible(page, "security-submit", "Update");
}

/**
 * Asserts security fields are in view-only mode with expected values
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<SecurityFormData>} expectedValues - Expected field values to verify
 */
export async function assertSecurityDetails(page: Page, expectedValues: Partial<SecurityFormData>): Promise<void> {
   for (const field of ["username", "email", "current-password"]) {
      const label: string = field === "current-password" ? "Password" : field;
      const value: string = label === "Password" ? "********" : expectedValues[field as keyof typeof expectedValues]!;

      await assertInputVisibility(page, `security-${field}`, label, value, false);
      await assertComponentIsVisible(page, `security-${label.toLowerCase()}-pen`);
   }

   await assertComponentIsHidden(page, "security-new-password");
   await assertComponentIsHidden(page, "security-verify-password");
   await assertComponentIsHidden(page, "security-cancel");
   await assertComponentIsHidden(page, "security-submit");
}

/**
 * Updates security fields with automatic toggle and submits the form
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
   // Ensure all of the required fields are toggled to allow editing
   if (fields.username !== undefined) await toggleSecurityField(page, "username");
   if (fields.email !== undefined) await toggleSecurityField(page, "email");
   if (fields.password !== undefined || fields.newPassword !== undefined) await toggleSecurityField(page, "password");

   const formData: Record<string, any> = {};

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
 * Updates security fields with auto-generated values, submits, and asserts changes were saved
 *
 * @param {Page} page - Playwright page instance
 * @param {Set<any>} usersRegistry - Registry of created test users (auto-updates credentials if provided)
 * @param {Record<string, string>} assignedRegistry - Registry of assigned user credentials (auto-updates if provided)
 * @param {AssignedUserRecord} assignedUser - Currently assigned user fixture
 * @param {string[]} fieldsToUpdate - Fields to update: "username", "email", "password"
 * @returns {Promise<Partial<SecurityFormData>>} Updated security data merged with current user
 */
export async function performAndAssertSecurityUpdate(
   page: Page,
   usersRegistry: Set<any>,
   assignedRegistry: Record<string, string>,
   assignedUser: AssignedUserRecord,
   fieldsToUpdate: string[]
): Promise<Partial<SecurityFormData>> {
   const securityData = (await generateUniqueUpdateValues(page, fieldsToUpdate)) as SecurityFormData;

   if (securityData.password !== undefined) {
      // Use the current assigned user's password
      securityData.password = assignedUser.current!.password;
   }

   await updateSecurityFields(page, securityData);

   const updatedSecurityData = { ...assignedUser.current, ...securityData };

   await assertSecurityDetails(page, updatedSecurityData);

   // Reload the page to ensure the changes are persisted
   await page.reload();
   await assertSecurityDetails(page, updatedSecurityData);

   // Auto-verify credentials if username or password changed
   const hasUsernameChange = fieldsToUpdate.includes("username");
   const hasPasswordChange = fieldsToUpdate.includes("password");

   if (hasUsernameChange || hasPasswordChange) {
      const loginUsername = hasUsernameChange ? updatedSecurityData.username! : assignedUser.current!.username;
      const loginPassword = hasPasswordChange ? updatedSecurityData.newPassword! : assignedUser.current!.password;

      await assertCredentialsChanged(page, loginUsername, loginPassword);

      // Update registries
      const originalUsername = assignedUser.current!.username;
      const registryUpdate: Record<string, string | undefined> = {};

      if (hasUsernameChange) {
         registryUpdate.username = updatedSecurityData.username;
      }
      if (hasPasswordChange) {
         registryUpdate.password = updatedSecurityData.newPassword;
      }

      updateUserInRegistries(usersRegistry, assignedRegistry, originalUsername, registryUpdate as Record<string, string>);
   }

   return updatedSecurityData;
}

/**
 * Asserts credentials changed by logging out and re-logging in with new credentials
 *
 * @param {Page} page - Playwright page instance
 * @param {string} username - Username to login with
 * @param {string} password - Password to login with
 * @returns {Promise<void>}
 */
export async function assertCredentialsChanged(page: Page, username: string, password: string): Promise<void> {
   await logoutUser(page, "settings");
   await loginUser(page, username, password);
}

/**
 * Asserts password field visibility state
 *
 * @param {Page} page - Playwright page instance
 * @param {("current" | "new" | "verify")} field - Password field to check
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
 * @param {("current" | "new" | "verify")} field - Password field to toggle
 */
export async function togglePasswordVisibility(page: Page, field: "current" | "new" | "verify"): Promise<void> {
   const toggle = page.getByTestId(`security-${field}-password-visibility`);
   await expect(toggle).toBeVisible();
   await toggle.click();
}

/**
 * Downloads the export file and returns the parsed JSON data
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<ExportData>} Parsed export JSON data
 */
export async function performExport(page: Page): Promise<ExportData> {
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
 * Asserts the exported JSON contains expected structure and data
 *
 * @param {ExportData} exportedJSON - Parsed JSON data to validate
 * @param {Partial<ExportData>} expectedExportData - Expected export data to verify
 */
export async function assertExportStructure(
   exportedJSON: ExportData,
   expectedExportData: Partial<ExportData>
): Promise<void> {
   // Verify timestamp is within ±1 minute
   const exportTime = new Date(exportedJSON.timestamp);
   const now = new Date();
   const timeDiffMinutes = Math.abs(now.getTime() - exportTime.getTime()) / (1000 * 60);
   expect(timeDiffMinutes).toBeLessThanOrEqual(1);

   // Verify settings match exactly
   expect(exportedJSON.settings).toEqual(expectedExportData.settings);

   // Verify accounts array length and content
   const expectedAccounts = expectedExportData.accounts || [];
   expect(exportedJSON.accounts).toHaveLength(expectedAccounts.length);

   // Verify each account matches expected data
   for (let i = 0; i < exportedJSON.accounts.length; i++) {
      const account = exportedJSON.accounts[i];
      const expectedAccount = expectedAccounts[i];

      // Verify account_order is NOT included
      expect(account.account_order).toBeUndefined();

      // Verify all expected fields are present and match
      expect(account.name).toBe(expectedAccount.name);
      expect(account.balance).toBe(expectedAccount.balance);
      expect(account.type).toBe(expectedAccount.type);
      expect(account.account_id).toBeDefined();
   }

   // Verify budgets match exactly
   expect(exportedJSON.budgets).toEqual(expectedExportData.budgets);

   // Verify transactions match exactly
   expect(exportedJSON.transactions).toEqual(expectedExportData.transactions);
}

/**
 * Performs logout with confirmation dialog
 *
 * @param {Page} page - Playwright page instance
 */
export async function performLogout(page: Page): Promise<void> {
   const logoutButton = page.getByTestId("settings-logout");
   await expect(logoutButton).toBeVisible();
   await logoutButton.click();

   await assertComponentIsVisible(page, "settings-logout-confirm");
   await page.getByTestId("settings-logout-confirm").click();

   // Wait for redirect to login
   await expect(page).toHaveURL(/\/login/);
}

/**
 * Cancels the logout operation and verifies user remains on settings page
 *
 * @param {Page} page - Playwright page instance
 */
export async function cancelLogout(page: Page): Promise<void> {
   const logoutButton = page.getByTestId("settings-logout");
   await expect(logoutButton).toBeVisible();
   await logoutButton.click();

   await assertComponentIsVisible(page, "settings-logout-cancel");
   await page.getByTestId("settings-logout-cancel").click();

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
 * Performs account deletion with optional confirmation or cancellation
 *
 * @param {Page} page - Playwright page instance
 * @param {boolean} [confirmDelete=true] - Whether to confirm (true) or cancel (false) deletion
 */
export async function performDelete(page: Page, confirmDelete: boolean = true): Promise<void> {
   const deleteButton = page.getByTestId("settings-delete-account");
   await expect(deleteButton).toBeVisible();
   await deleteButton.click();

   await assertDeleteConfirmationDialog(page);

   if (confirmDelete) {
      const responsePromise = page.context().waitForEvent("response", (response: Response) => {
         return response.url().includes("/api/v1/users") && response.request().method() === "DELETE";
      });

      await page.getByTestId("settings-delete-account-confirm").click();

      // Wait for response
      const response = await responsePromise;
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);

      // Wait for redirect to home
      await expect(page).toHaveURL(/^(?!.*settings)/);
   } else {
      await page.getByTestId("settings-delete-account-cancel").click();
      await assertComponentIsVisible(page, "settings-details");
   }
}

/**
 * Toggles theme and asserts the change was applied correctly
 *
 * @param {Page} page - Playwright page instance
 * @param {("sidebar" | "details")} method - Toggle method (sidebar switch or details select)
 * @param {("light" | "dark")} [expectedTheme] - Expected theme after toggle
 */
export async function performAndAssertThemeToggle(
   page: Page,
   method: "sidebar" | "details",
   expectedTheme?: "light" | "dark"
): Promise<void> {
   await toggleTheme(page, method, expectedTheme);

   // Wait for router data-dark attribute to update in the Redux store
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
 * @param {("current" | "new" | "verify")} field - Password field type
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
 * Tests cancel behavior by modifying fields and verifying revert to original values
 *
 * @param {Page} page - Playwright page instance
 * @param {AssignedUserRecord} assignedUser - User fixture with original values
 * @param {Array<("name" | "birthday")>} fieldsToCancel - Fields to test cancel behavior
 */
export async function performAndAssertCancelDetailsBehavior(
   page: Page,
   assignedUser: AssignedUserRecord,
   fieldsToCancel: Array<"name" | "birthday">
): Promise<void> {
   // Capture original values BEFORE any modifications
   const originalValues: Partial<DetailsFormData> = { ...assignedUser.current };

   for (const field of fieldsToCancel) {
      if (field === "name") {
         const newValue = generateUniqueTestName();
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
 * Tests security field cancel behavior by enabling, modifying, and reverting to original values
 *
 * @param {Page} page - Playwright page instance
 * @param {AssignedUserRecord} assignedUser - User fixture with original values
 * @param {Array<("username" | "email" | "password")>} fieldsToCancel - Fields to test cancel behavior
 */
export async function performAndAssertCancelSecurityBehavior(
   page: Page,
   assignedUser: AssignedUserRecord,
   fieldsToCancel: Array<"username" | "email" | "password">
): Promise<void> {
   // Capture original values BEFORE any modifications
   const originalValues: Partial<SecurityFormData> = { ...assignedUser.current };

   for (const field of fieldsToCancel) {
      await toggleSecurityField(page, field);

      if (field === "username") {
         const { username } = generateTestCredentials();
         await page.getByTestId("security-username").fill(username);
      } else if (field === "email") {
         const { email } = generateTestCredentials();
         await page.getByTestId("security-email").fill(email);
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