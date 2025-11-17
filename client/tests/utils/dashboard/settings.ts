import { expect, type Locator, type Page, type Response } from "@playwright/test";
import type { AssignedUserRecord } from "@tests/fixtures";
import { assertComponentIsHidden, assertComponentIsVisible, assertInputVisibility } from "@tests/utils";
import { loginUser, logoutUser, ROOT_ROUTE, SETTINGS_ROUTE } from "@tests/utils/authentication";
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
export type DetailsFormData = {
   name?: string;
   birthday?: string;
   theme?: "light" | "dark";
};

/**
 * Security form data type for updates with password change fields
 */
export type SecurityFormData = {
   username?: string;
   email?: string;
   currentPassword?: string;
   newPassword?: string;
   verifyPassword?: string;
};

/**
 * Generates unique test values for specified settings fields
 *
 * @param {Page} page - Playwright page instance
 * @param {AssignedUserRecord} assignedUser - Currently assigned user fixture
 * @param {("name" | "birthday" | "theme" | "username" | "email" | "currentPassword" | "newPassword" | "verifyPassword")[]} fieldsToUpdate - Field names to generate values for
 * @returns {Promise<Record<string, string>>} Object with generated unique values
 */
export async function generateUniqueUpdateValues(
   page: Page,
   assignedUser: AssignedUserRecord,
   fieldsToUpdate: ("name" | "birthday" | "theme" | "username" | "email" | "currentPassword" | "newPassword" | "verifyPassword")[]
): Promise<Record<string, string>> {
   const updates: Record<string, string> = {};
   const newPassword: string = assignedUser.current.password === "Password1!" ? "NewPassword1!" : assignedUser.current.password;

   for (const field of fieldsToUpdate) {
      switch (field) {
         case "name": {
            updates.name = generateUniqueTestName();
            break;
         }
         case "birthday": {
            updates.birthday = generateUniqueTestBirthday(assignedUser.current.birthday);
            break;
         }
         case "theme": {
            updates.theme = (await getCurrentAndOppositeTheme(page)).opposite;
            break;
         }
         case "username": {
            updates.username = (generateTestCredentials()).username;
            break;
         }
         case "email": {
            updates.email = (generateTestCredentials()).email;
            break;
         }
         case "currentPassword": {
            updates.currentPassword = assignedUser.current.password;
            break;
         }
         case "newPassword":
            updates.newPassword = newPassword;
            break;
         case "verifyPassword":
            updates.verifyPassword = newPassword;
            break;
      }
   }

   return updates;
}

/**
 * Submits a form and validates the response, handling both success and error cases
 *
 * @param {Page} page - Playwright page instance
 * @param {Record<string, any>} formData - Form data to submit
 * @param {string} submitButtonSelector - CSS selector for the submit button
 * @param {Record<string, string>} [expectedErrors] - Expected validation errors (if provided, expects form submission to fail)
 */
async function submitAndValidateForm(
   page: Page,
   formData: Record<string, any>,
   submitButtonSelector: string,
   expectedErrors?: Record<string, string>
): Promise<void> {
   if (expectedErrors) {
      await submitForm(page, formData, {
         buttonType: "Update",
         containsErrors: true,
         submitButtonSelector
      });
   } else {
      const responsePromise = page.waitForResponse((response: Response) => {
         return response.url().includes("/api/v1/users") && response.request().method() === "PUT";
      });

      await submitForm(page, formData, {
         buttonType: "Update",
         submitButtonSelector
      });

      const response = await responsePromise;
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);
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

   await submitAndValidateForm(page, formData, "[data-testid=\"details-submit\"]", expectedErrors);
}

/**
 * Asserts account details match expected values
 *
 * @param {Page} page - Playwright page instance
 * @param {DetailsFormData} expectedDetails - Expected details to verify
 */
export async function assertAccountDetails(
   page: Page,
   expectedDetails: DetailsFormData
): Promise<void> {
   const birthday = expectedDetails.birthday || "";
   const birthdayValue: string = birthday.includes("T")
      ? birthday.split("T")[0] : birthday;

   await assertInputVisibility(page, "details-name", "Name", expectedDetails.name);
   await assertInputVisibility(page, "details-birthday", "Birthday", birthdayValue);

   if (expectedDetails.theme) {
      await assertInputVisibility(page, "details-theme", "Theme", expectedDetails.theme);
   }
}

/**
 * Updates user details with auto-generated values and asserts persistence
 *
 * @param {Page} page - Playwright page instance
 * @param {AssignedUserRecord} assignedUser - Currently assigned user fixture
 * @param {("name" | "birthday" | "theme")[]} fieldsToUpdate - Fields to update: `"name"`, `"birthday"`, or `"theme"`
 */
export async function performAndAssertDetailsUpdate(
   page: Page,
   assignedUser: AssignedUserRecord,
   fieldsToUpdate: ("name" | "birthday" | "theme")[]
): Promise<void> {
   const detailsData = await generateUniqueUpdateValues(page, assignedUser, fieldsToUpdate) as DetailsFormData;
   const updatedDetails = { ...assignedUser.current, ...detailsData };

   await updateDetails(page, detailsData);
   await assertAccountDetails(page, updatedDetails);

   // Reload the page to ensure the changes are persisted
   await page.reload();
   await assertAccountDetails(page, updatedDetails);
}

/**
 * Gets current and opposite theme values
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<{current: "light" | "dark"; opposite: "light" | "dark"}>} Current and opposite theme values
 */
export async function getCurrentAndOppositeTheme(page: Page): Promise<{ current: "light" | "dark"; opposite: "light" | "dark"; }> {
   const themeValue: string | null = await page.getByTestId("router").getAttribute("data-dark");
   const current = themeValue === "true" ? "dark" : "light";
   const opposite = current === "dark" ? "light" : "dark";

   return { current, opposite };
}

/**
 * Toggles theme via sidebar or details form
 *
 * @param {Page} page - Playwright page instance
 * @param {"sidebar" | "details"} method - Toggle method
 * @param {("light" | "dark")} [detailsTheme] - Theme to set in details form via the select input
 */
export async function toggleTheme(page: Page, method: "sidebar" | "details", detailsTheme?: "light" | "dark"): Promise<void> {
   if (method === "sidebar") {
      await openSidebar(page);
      const themeSwitch: Locator = page.getByTestId("theme-switch");
      await expect(themeSwitch).toBeVisible();
      await themeSwitch.click();
   } else {
      const themeLabel: string = detailsTheme ? `${detailsTheme.charAt(0).toUpperCase()}${detailsTheme.slice(1)} Mode` : "";
      await updateSelectValue(page, "details-theme-select", themeLabel);
   }
}

/**
 * Asserts current theme state
 *
 * @param {Page} page - Playwright page instance
 * @param {("light" | "dark")} expectedTheme - Expected theme value
 */
export async function assertThemeState(page: Page, expectedTheme: "light" | "dark"): Promise<void> {
   // Assert via the details form if we're currently on the settings page
   if (page.url().includes(SETTINGS_ROUTE)) {
      await assertInputVisibility(page, "details-theme", "Theme", expectedTheme);
   }

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
 * @param {("username" | "email" | "currentPassword")} field - Field name to toggle
 */
export async function toggleSecurityField(page: Page, field: "username" | "email" | "currentPassword"): Promise<void> {
   const penIcon: Locator = page.getByTestId(`security-${field}-pen`);
   await expect(penIcon).toBeVisible();
   await penIcon.click();
   await expect(penIcon).toBeHidden();

   const testId: string = `security-${field}`;
   const value: string = await page.getByTestId(testId).inputValue();
   const label: string = field === "currentPassword" ? "Password" : field.charAt(0).toUpperCase() + field.slice(1);
   await assertInputVisibility(page, testId, label, value, true);

   if (field === "currentPassword") {
      await assertInputVisibility(page, "security-newPassword", "New Password");
      await assertInputVisibility(page, "security-verifyPassword", "Verify Password");
   }

   // Assert the cancel and submit buttons are visible
   await assertComponentIsVisible(page, "security-cancel", "Cancel");
   await assertComponentIsVisible(page, "security-submit", "Update");
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
   if (fields.currentPassword !== undefined || fields.newPassword !== undefined) await toggleSecurityField(page, "currentPassword");

   const formData: Record<string, any> = {};

   if (fields.username !== undefined) formData["security-username"] = fields.username;
   if (fields.email !== undefined) formData["security-email"] = fields.email;
   if (fields.currentPassword !== undefined) formData["security-currentPassword"] = fields.currentPassword;
   if (fields.newPassword !== undefined) formData["security-newPassword"] = fields.newPassword;
   if (fields.verifyPassword !== undefined) formData["security-verifyPassword"] = fields.verifyPassword;

   await submitAndValidateForm(page, formData, "[data-testid=\"security-submit\"]", expectedErrors);
}

/**
 * Asserts security fields are in view-only mode with expected values
 *
 * @param {Page} page - Playwright page instance
 * @param {SecurityFormData} expectedValues - Expected field values to verify
 */
export async function assertSecurityDetails(page: Page, expectedValues: SecurityFormData): Promise<void> {
   // Security fields should be in view-only mode with expected values
   for (const field of ["username", "email", "currentPassword"]) {
      const label: string = field === "currentPassword" ? "Password" : field;
      const value: string = label === "Password" ? "********" : (expectedValues[field as keyof typeof expectedValues] as string || "");

      await assertInputVisibility(page, `security-${field}`, label, value, false);
      await assertComponentIsVisible(page, `security-${field}-pen`);
   }

   // Additional password fields and form buttons should be hidden
   for (const field of ["newPassword", "verifyPassword", "cancel", "submit"]) {
      await assertComponentIsHidden(page, `security-${field}`);
   }
}

/**
 * Updates security fields with auto-generated values, submits, and asserts changes were saved
 *
 * @param {Page} page - Playwright page instance
 * @param {Set<any>} usersRegistry - Registry of created test users (auto-updates credentials if provided)
 * @param {Record<string, string>} assignedRegistry - Registry of assigned user credentials (auto-updates for credential updates if applicable)
 * @param {AssignedUserRecord} assignedUser - Currently assigned user fixture
 * @param {("username" | "email" | "currentPassword" | "newPassword" | "verifyPassword")[]} fieldsToUpdate - Fields to update
 * @returns {Promise<Partial<SecurityFormData>>} Updated security data merged with current user
 */
export async function performAndAssertSecurityUpdate(
   page: Page,
   usersRegistry: Set<any>,
   assignedRegistry: Record<string, string>,
   assignedUser: AssignedUserRecord,
   fieldsToUpdate: ("username" | "email" | "currentPassword" | "newPassword" | "verifyPassword")[]
): Promise<SecurityFormData> {
   const securityData = await generateUniqueUpdateValues(page, assignedUser, fieldsToUpdate) as SecurityFormData;
   const updatedSecurityData = { ...assignedUser.current, ...securityData };

   await updateSecurityFields(page, securityData);
   await assertSecurityDetails(page, updatedSecurityData);

   // Reload the page to ensure the changes are persisted
   await page.reload();
   await assertSecurityDetails(page, updatedSecurityData);

   // Check if credentials were updated
   const usernameUpdate: boolean = securityData.username !== undefined;
   const passwordUpdate: boolean = securityData.newPassword !== undefined;

   if (usernameUpdate || passwordUpdate) {
      const loginUsername: string = usernameUpdate ? (updatedSecurityData.username || "") : assignedUser.current.username;
      const loginPassword: string = passwordUpdate ? (updatedSecurityData.newPassword || "") : assignedUser.current.password;

      await logoutUser(page, "settings");
      await loginUser(page, loginUsername, loginPassword);

      // Update users and assigned registries for credential updates
      const originalUsername: string = assignedUser.current.username;
      const registryUpdate: Record<string, string> = {};

      if (usernameUpdate) {
         registryUpdate.username = updatedSecurityData.username || "";
      }

      if (passwordUpdate) {
         registryUpdate.password = updatedSecurityData.newPassword || "";
      }

      updateUserInRegistries(usersRegistry, assignedRegistry, originalUsername, registryUpdate as Record<string, string>);
   }

   return updatedSecurityData;
}

/**
 * Toggles password visibility for a specific password field between text and password types
 *
 * @param {Page} page - Playwright page instance
 * @param {("currentPassword" | "newPassword" | "verifyPassword")} field - Password field to toggle
 */
export async function togglePasswordVisibility(page: Page, field: "currentPassword" | "newPassword" | "verifyPassword"): Promise<void> {
   const toggle: Locator = page.getByTestId(`security-${field}-visibility`);
   await expect(toggle).toBeVisible();
   await toggle.click();
}

/**
 * Asserts password field visibility state between text and password types
 *
 * @param {Page} page - Playwright page instance
 * @param {("currentPassword" | "newPassword" | "verifyPassword")} field - Password field to check
 * @param {boolean} expectedVisible - Expected visibility state
 */
export async function assertPasswordVisibilityToggle(
   page: Page,
   field: "currentPassword" | "newPassword" | "verifyPassword",
   expectedVisible: boolean
): Promise<void> {
   const input: Locator = page.getByTestId(`security-${field}`);
   const inputType: string = await input.evaluate((el: HTMLInputElement) => el.type);

   if (expectedVisible) {
      expect(inputType).toBe("text");
   } else {
      expect(inputType).toBe("password");
   }
}

/**
 * Tests password field visibility toggle for a specific field between text and password types
 *
 * @param {Page} page - Playwright page instance
 * @param {("currentPassword" | "newPassword" | "verifyPassword")} field - Password field type
 */
export async function testPasswordVisibilityToggle(page: Page, field: "currentPassword" | "newPassword" | "verifyPassword"): Promise<void> {
   // Initial password state is hidden (type="password")
   await assertPasswordVisibilityToggle(page, field, false);

   // Toggle password field to show the password (type="text")
   await togglePasswordVisibility(page, field);
   await assertPasswordVisibilityToggle(page, field, true);

   // Toggle password field to hide the password (type="password")
   await togglePasswordVisibility(page, field);
   await assertPasswordVisibilityToggle(page, field, false);
}

/**
 * Tests all three password fields for independent visibility toggles
 *
 * @param {Page} page - Playwright page instance
 */
export async function testAllPasswordVisibilityToggles(page: Page): Promise<void> {
   // Toggle password field to enable visibility for all three password fields
   await toggleSecurityField(page, "currentPassword");

   for (const field of ["currentPassword", "newPassword", "verifyPassword"] as const) {
      await testPasswordVisibilityToggle(page, field);
   }
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
   expect(download.suggestedFilename()).toBe("capital_export.json");

   // Return the parsed JSON data from the downloaded file
   const path: string | undefined = await download.path();
   const fs = await import("fs");

   return JSON.parse(fs.readFileSync(path!, "utf-8")) as ExportData;
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
   // Assert timestamp is within +/- 1 minute
   const exportTime: Date = new Date(exportedJSON.timestamp);
   const now: Date = new Date();
   const timeDiffMinutes = Math.abs(now.getTime() - exportTime.getTime()) / (1000 * 60);
   expect(timeDiffMinutes).toBeLessThanOrEqual(1);

   // Assert all fields match to a certain degree of exactness until all test suites are implemented
   expect(exportedJSON).toEqual(expect.objectContaining(expectedExportData));
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
   await expect(page).toHaveURL(SETTINGS_ROUTE); 
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

   await assertComponentIsVisible(page, "settings-delete-account-confirm");
   await expect(page.getByText("Are you sure you want to delete your account?")).toBeVisible();

   if (confirmDelete) {
      const responsePromise = page.context().waitForEvent("response", (response: Response) => {
         return response.url().includes("/api/v1/users") && response.request().method() === "DELETE";
      });
      await page.getByTestId("settings-delete-account-confirm").click();

      const response = await responsePromise;
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);
      await expect(page).toHaveURL(ROOT_ROUTE);
   } else {
      await page.getByTestId("settings-delete-account-cancel").click();
      await expect(page).toHaveURL(SETTINGS_ROUTE);
   }
}

/**
 * Tests cancel behavior by modifying fields and verifying values revert to original values
 *
 * @param {Page} page - Playwright page instance
 * @param {AssignedUserRecord} assignedUser - User fixture with original values
 * @param {type} type - Type of form to cancel: `"details"`, `"security"`
 * @param {("name" | "birthday" | "username" | "email" | "currentPassword")[]} fieldsToCancel - Field names to cancel
 */
export async function performAndAssertCancelBehavior(
   page: Page,
   assignedUser: AssignedUserRecord,
   type: "details" | "security",
   fieldsToCancel: ("name" | "birthday" | "username" | "email" | "currentPassword")[]
): Promise<void> {
   const updates = await generateUniqueUpdateValues(page, assignedUser, fieldsToCancel);

   for (const field of fieldsToCancel) {
      if (type === "security") {
         await toggleSecurityField(page, field as "username" | "email" | "currentPassword");
      }

      const value: string = updates[field];
      await page.getByTestId(`${type}-${field}`).fill(value);
   }

   // Assert change detection and cancel the changes
   await assertComponentIsVisible(page, `${type}-cancel`, "Cancel");
   await assertComponentIsVisible(page, `${type}-submit`, "Update");
   await page.getByTestId(`${type}-cancel`).click();

   // Assert all fields reverted to original state
   if (type === "details") {
      const { name, birthday } = assignedUser.current;
      await assertAccountDetails(page, { name, birthday });
   } else if (type === "security") {
      const { username, email, password } = assignedUser.current;
      await assertSecurityDetails(page, { username, email, currentPassword: password });
   }
}