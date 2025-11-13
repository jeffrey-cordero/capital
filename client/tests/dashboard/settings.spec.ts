import type { Page } from "@playwright/test";
import { expect, test } from "@tests/fixtures";
import { assertComponentVisibility, assertInputVisibility } from "@tests/utils";
import { DASHBOARD_ROUTE, VERIFIED_ROUTES } from "@tests/utils/authentication";
import {
   assertAllSecurityFieldsDisabled,
   assertDetailsDisplay,
   assertExportStructure,
   assertPasswordVisibilityToggle,
   assertSecurityFieldDisabled,
   assertSecurityFieldEnabled,
   assertThemeState,
   cancelDetailsEdit,
   cancelLogout,
   cancelSecurityFieldEdit,
   openSettingsPage,
   performDelete,
   performExport,
   performLogout,
   togglePasswordVisibility,
   toggleSecurityField,
   toggleTheme,
   updateDetails,
   updateSecurityFields
} from "@tests/utils/dashboard/settings";
import { createAccount } from "@tests/utils/dashboard/accounts";
import { setupAssignedUser } from "@tests/utils/user-management";
import { navigateToPath } from "@tests/utils/navigation";

test.describe("Settings Page E2E Tests", () => {
   /**
    * Asserts initial state of security form with all fields disabled
    * and optionally verifies expected values
    *
    * @param {Page} page - Playwright page instance
    * @param {object} [expectedValues] - Optional expected field values
    * @param {string} [expectedValues.username] - Expected username value
    * @param {string} [expectedValues.email] - Expected email value
    */
   const assertInitialSecurityState = async(
      page: Page,
      expectedValues?: { username?: string; email?: string }
   ): Promise<void> => {
      // Verify security fields using assertInputVisibility with disabled state
      await assertInputVisibility(page, "security-username", "Username", expectedValues?.username, false);
      await assertInputVisibility(page, "security-email", "Email", expectedValues?.email, false);

      // Verify password field is disabled (no value to check initially)
      const passwordInput = page.getByTestId("security-current-password");
      await expect(passwordInput).toHaveAttribute("disabled");

      // Verify pen icons are visible for all fields
      await expect(page.getByTestId("security-username-pen")).toBeVisible();
      await expect(page.getByTestId("security-email-pen")).toBeVisible();
      await expect(page.getByTestId("security-password-pen")).toBeVisible();

      // Verify new and verify password fields are hidden in initial state
      await expect(page.getByTestId("security-new-password")).not.toBeVisible();
      await expect(page.getByTestId("security-verify-password")).not.toBeVisible();

      // Verify cancel button is hidden
      await expect(page.getByTestId("security-cancel")).toBeHidden();
   };

   test.describe("Initial State", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
         await openSettingsPage(page);
      });

      test("should have all security fields disabled initially", async({ page }) => {
         await assertInitialSecurityState(page);
      });

      test("should have accessible form inputs", async({ page }) => {
         await assertInputVisibility(page, "details-name", "Name");
         await assertInputVisibility(page, "details-birthday", "Birthday");
         await assertComponentVisibility(page, "details-theme-toggle");
      });
   });

   test.describe("Details Form", () => {
      test.describe("Successful Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
            await openSettingsPage(page);
         });

         test("should update name only", async({ page }) => {
            const newName = "Updated Name";
            await updateDetails(page, { name: newName });
            await assertDetailsDisplay(page, { name: newName });
         });

         test("should update birthday only", async({ page }) => {
            const newBirthday = "1995-05-15";
            await updateDetails(page, { birthday: newBirthday });
            await assertDetailsDisplay(page, { birthday: newBirthday });
         });

         test("should update name and birthday together", async({ page }) => {
            const newName = "New Full Name";
            const newBirthday = "1990-06-20";
            await updateDetails(page, { name: newName, birthday: newBirthday });
            await assertDetailsDisplay(page, { name: newName, birthday: newBirthday });
         });

         test("should toggle theme and apply instantly", async({ page }) => {
            const currentTheme = await page.getByTestId("router").getAttribute("data-dark");
            const newTheme = currentTheme === "false" ? "dark" : "light";

            await toggleTheme(page, newTheme);
            await assertThemeState(page, newTheme);
         });

         test("should update name, birthday, and toggle theme", async({ page }) => {
            const newName = "Updated User";
            const newBirthday = "1992-03-10";
            const currentTheme = await page.getByTestId("router").getAttribute("data-dark");
            const newTheme = currentTheme === "false" ? "dark" : "light";

            await updateDetails(page, { name: newName, birthday: newBirthday, theme: newTheme });
            await assertDetailsDisplay(page, { name: newName, birthday: newBirthday });
            await assertThemeState(page, newTheme);
         });

         test("should update all Details fields together", async({ page }) => {
            const newName = "Complete Update";
            const newBirthday = "1988-12-25";
            const currentTheme = await page.getByTestId("router").getAttribute("data-dark");
            const newTheme = currentTheme === "false" ? "dark" : "light";

            await updateDetails(page, {
               name: newName,
               birthday: newBirthday,
               theme: newTheme
            });

            await assertDetailsDisplay(page, { name: newName, birthday: newBirthday });
            await assertThemeState(page, newTheme);
         });
      });

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
            await openSettingsPage(page);
         });

         test("should validate name minimum length", async({ page }) => {
            await updateDetails(page, { name: "a" }, { "details-name": "Name must be at least 2 characters" });
         });

         test("should validate name maximum length", async({ page }) => {
            await updateDetails(page, { name: "a".repeat(31) }, { "details-name": "Name must be at most 30 characters" });
         });

         test("should validate birthday too early", async({ page }) => {
            await updateDetails(page, { birthday: "1799-12-31" }, { "details-birthday": "Birthday must be on or after 1800-01-01" });
         });

         test("should validate birthday in future", async({ page }) => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const futureDateString = futureDate.toISOString().split("T")[0];

            await updateDetails(page, { birthday: futureDateString }, { "details-birthday": "Birthday cannot be in the future" });
         });
      });

      test.describe("Theme Persistence", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
            await openSettingsPage(page);
         });

         test("should persist theme across page navigation", async({ page }) => {
            // Toggle to dark
            const currentTheme = await page.getByTestId("router").getAttribute("data-dark");
            const newTheme = currentTheme === "false" ? "dark" : "light";

            await toggleTheme(page, newTheme);
            await assertThemeState(page, newTheme);

            // Navigate through all verified routes and verify theme persists
            for (const route of VERIFIED_ROUTES) {
               if (route !== DASHBOARD_ROUTE) {  // Skip dashboard base route
                  await navigateToPath(page, route);
                  await assertThemeState(page, newTheme);
               }
            }
         });

         test("should persist theme across page reload", async({ page }) => {
            // Toggle theme
            const currentTheme = await page.getByTestId("router").getAttribute("data-dark");
            const newTheme = currentTheme === "false" ? "dark" : "light";

            await toggleTheme(page, newTheme);
            await assertThemeState(page, newTheme);

            // Reload page
            await page.reload();

            // Verify theme persists
            await assertThemeState(page, newTheme);
         });
      });

      test.describe("Cancel Behavior", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
            await openSettingsPage(page);
         });

         test("should cancel name change and show original value", async({ page }) => {
            const originalName = await page.getByTestId("details-name").inputValue();

            // Make change
            await page.getByTestId("details-name").fill("New Name");

            // Cancel
            await cancelDetailsEdit(page, { name: originalName });

            // Verify original
            await expect(page.getByTestId("details-name")).toHaveValue(originalName);
         });

         test("should cancel birthday change and show original value", async({ page }) => {
            const originalBirthday = await page.getByTestId("details-birthday").inputValue();

            // Make change
            await page.getByTestId("details-birthday").fill("1995-01-01");

            // Cancel
            await cancelDetailsEdit(page, { birthday: originalBirthday });

            // Verify original
            await expect(page.getByTestId("details-birthday")).toHaveValue(originalBirthday);
         });

         test("should cancel multiple field changes", async({ page }) => {
            const originalName = await page.getByTestId("details-name").inputValue();
            const originalBirthday = await page.getByTestId("details-birthday").inputValue();

            // Make changes
            await page.getByTestId("details-name").fill("Updated Name");
            await page.getByTestId("details-birthday").fill("1990-01-01");

            // Cancel
            await cancelDetailsEdit(page, { name: originalName, birthday: originalBirthday });

            // Verify originals
            await expect(page.getByTestId("details-name")).toHaveValue(originalName);
            await expect(page.getByTestId("details-birthday")).toHaveValue(originalBirthday);
         });
      });
   });

   test.describe("Security Form", () => {
      test.describe("Successful Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);
         });

         test("should update username only", async({ page }) => {
            const newUsername = `user_${Date.now()}`;

            await toggleSecurityField(page, "username");
            await assertSecurityFieldEnabled(page, "username");

            await updateSecurityFields(page, { username: newUsername });

            await assertSecurityFieldDisabled(page, "username");
            await expect(page.getByTestId("security-username-pen")).toBeVisible();
         });

         test("should update email only", async({ page }) => {
            const newEmail = `test_${Date.now()}@example.com`;

            await toggleSecurityField(page, "email");
            await assertSecurityFieldEnabled(page, "email");

            await updateSecurityFields(page, { email: newEmail });

            await assertSecurityFieldDisabled(page, "email");
            await expect(page.getByTestId("security-email-pen")).toBeVisible();
         });

         test("should update password with valid credentials", async({ page }) => {
            const currentPassword = "Password1!"; // From test fixtures
            const newPassword = "NewPassword1!";

            await toggleSecurityField(page, "password");

            // Verify all password fields are visible
            await expect(page.getByTestId("security-current-password")).toBeVisible();
            await expect(page.getByTestId("security-new-password")).toBeVisible();
            await expect(page.getByTestId("security-verify-password")).toBeVisible();

            await updateSecurityFields(page, {
               password: currentPassword,
               newPassword,
               verifyPassword: newPassword
            });

            await assertSecurityFieldDisabled(page, "password");
            await expect(page.getByTestId("security-password-pen")).toBeVisible();
         });

         test("should verify each password field has independent visibility toggle", async({ page }) => {
            await toggleSecurityField(page, "password");

            // Test current password visibility
            await assertPasswordVisibilityToggle(page, "current", false);
            await togglePasswordVisibility(page, "current");
            await assertPasswordVisibilityToggle(page, "current", true);
            await togglePasswordVisibility(page, "current");
            await assertPasswordVisibilityToggle(page, "current", false);

            // Test new password visibility
            await assertPasswordVisibilityToggle(page, "new", false);
            await togglePasswordVisibility(page, "new");
            await assertPasswordVisibilityToggle(page, "new", true);
            await togglePasswordVisibility(page, "new");
            await assertPasswordVisibilityToggle(page, "new", false);

            // Test verify password visibility
            await assertPasswordVisibilityToggle(page, "verify", false);
            await togglePasswordVisibility(page, "verify");
            await assertPasswordVisibilityToggle(page, "verify", true);
            await togglePasswordVisibility(page, "verify");
            await assertPasswordVisibilityToggle(page, "verify", false);
         });
      });

      test.describe("Multiple Fields Together", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);
         });

         test("should update username and email together", async({ page }) => {
            const newUsername = `user_${Date.now()}`;
            const newEmail = `test_${Date.now()}@example.com`;

            // Enable both fields
            await toggleSecurityField(page, "username");
            await toggleSecurityField(page, "email");

            // Verify both are enabled
            await assertSecurityFieldEnabled(page, "username");
            await assertSecurityFieldEnabled(page, "email");

            // Update both
            await updateSecurityFields(page, {
               username: newUsername,
               email: newEmail
            });

            // Verify both disabled
            await assertSecurityFieldDisabled(page, "username");
            await assertSecurityFieldDisabled(page, "email");
         });

         test("should update username and password together", async({ page }) => {
            const newUsername = `user_${Date.now()}`;
            const currentPassword = "Password1!";
            const newPassword = "NewPassword1!";

            // Enable both fields
            await toggleSecurityField(page, "username");
            await toggleSecurityField(page, "password");

            // Update both
            await updateSecurityFields(page, {
               username: newUsername,
               password: currentPassword,
               newPassword,
               verifyPassword: newPassword
            });

            // Verify both disabled
            await assertSecurityFieldDisabled(page, "username");
            await assertSecurityFieldDisabled(page, "password");
         });

         test("should update email and password together", async({ page }) => {
            const newEmail = `test_${Date.now()}@example.com`;
            const currentPassword = "Password1!";
            const newPassword = "NewPassword1!";

            // Enable both fields
            await toggleSecurityField(page, "email");
            await toggleSecurityField(page, "password");

            // Update both
            await updateSecurityFields(page, {
               email: newEmail,
               password: currentPassword,
               newPassword,
               verifyPassword: newPassword
            });

            // Verify both disabled
            await assertSecurityFieldDisabled(page, "email");
            await assertSecurityFieldDisabled(page, "password");
         });
      });

      test.describe("Update All Security Fields", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);
         });

         test("should update all security fields together", async({ page }) => {
            const newUsername = `user_${Date.now()}`;
            const newEmail = `test_${Date.now()}@example.com`;
            const currentPassword = "Password1!";
            const newPassword = "NewPassword1!";

            // Enable all three fields
            await toggleSecurityField(page, "username");
            await toggleSecurityField(page, "email");
            await toggleSecurityField(page, "password");

            // Verify all are enabled
            await assertSecurityFieldEnabled(page, "username");
            await assertSecurityFieldEnabled(page, "email");
            await assertSecurityFieldEnabled(page, "password");

            // Update all
            await updateSecurityFields(page, {
               username: newUsername,
               email: newEmail,
               password: currentPassword,
               newPassword,
               verifyPassword: newPassword
            });

            // Verify all disabled
            await assertAllSecurityFieldsDisabled(page);
         });
      });

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);
         });

         test("should validate username minimum length", async({ page }) => {
            await toggleSecurityField(page, "username");
            await updateSecurityFields(page, { username: "a" }, { "security-username": "Username must be at least 2 characters" });
         });

         test("should validate email format", async({ page }) => {
            await toggleSecurityField(page, "email");
            await updateSecurityFields(page, { email: "invalid-email" }, { "security-email": "Invalid email address" });
         });

         test("should validate password mismatch", async({ page }) => {
            const currentPassword = "Password1!";

            await toggleSecurityField(page, "password");
            await updateSecurityFields(
               page,
               {
                  password: currentPassword,
                  newPassword: "NewPassword1!",
                  verifyPassword: "DifferentPassword1!"
               },
               { "security-verify-password": "Passwords don't match" }
            );
         });

         test("should validate new password same as old password", async({ page }) => {
            const samePassword = "Password1!";

            await toggleSecurityField(page, "password");
            await updateSecurityFields(
               page,
               {
                  password: samePassword,
                  newPassword: samePassword,
                  verifyPassword: samePassword
               },
               { "security-new-password": "New password must not match the old password" }
            );
         });

         test("should validate invalid current password", async({ page }) => {
            const newPassword = "NewPassword1!";

            await toggleSecurityField(page, "password");
            await updateSecurityFields(
               page,
               {
                  password: "WrongPassword1!",
                  newPassword,
                  verifyPassword: newPassword
               },
               { "security-current-password": "Invalid credentials" }
            );
         });

         test("should validate current password required for password change", async({ page }) => {
            await toggleSecurityField(page, "password");
            await updateSecurityFields(
               page,
               {
                  newPassword: "NewPassword1!",
                  verifyPassword: "NewPassword1!"
               },
               { "security-current-password": "Current password is required to set a new password" }
            );
         });

         test("should validate new password required for password change", async({ page }) => {
            const currentPassword = "Password1!";

            await toggleSecurityField(page, "password");
            await updateSecurityFields(
               page,
               {
                  password: currentPassword,
                  verifyPassword: "NewPassword1!"
               },
               { "security-new-password": "New password is required to set a new password" }
            );
         });
      });

      test.describe("Cancel Behavior", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);
         });

         test("should cancel username change and show original value", async({ page }) => {
            const originalUsername = await page.getByTestId("security-username").inputValue();

            // Enable and modify
            await toggleSecurityField(page, "username");
            await page.getByTestId("security-username").fill("ChangedUsername");

            // Cancel
            await cancelSecurityFieldEdit(page, { username: originalUsername });

            // Verify original and disabled
            await expect(page.getByTestId("security-username")).toHaveValue(originalUsername);
            await assertSecurityFieldDisabled(page, "username");
         });

         test("should cancel email change and show original value", async({ page }) => {
            const originalEmail = await page.getByTestId("security-email").inputValue();

            // Enable and modify
            await toggleSecurityField(page, "email");
            await page.getByTestId("security-email").fill("newemail@example.com");

            // Cancel
            await cancelSecurityFieldEdit(page, { email: originalEmail });

            // Verify original and disabled
            await expect(page.getByTestId("security-email")).toHaveValue(originalEmail);
            await assertSecurityFieldDisabled(page, "email");
         });

         test("should cancel password change and hide all password fields", async({ page }) => {
            // Enable password
            await toggleSecurityField(page, "password");

            // Verify fields visible
            await expect(page.getByTestId("security-current-password")).toBeVisible();
            await expect(page.getByTestId("security-new-password")).toBeVisible();
            await expect(page.getByTestId("security-verify-password")).toBeVisible();

            // Cancel
            await cancelSecurityFieldEdit(page, { password: "Password1!" });

            // Verify all disabled
            await assertSecurityFieldDisabled(page, "password");
            await expect(page.getByTestId("security-password-pen")).toBeVisible();
         });

         test("should cancel all security field changes", async({ page }) => {
            const originalUsername = await page.getByTestId("security-username").inputValue();
            const originalEmail = await page.getByTestId("security-email").inputValue();

            // Enable all
            await toggleSecurityField(page, "username");
            await toggleSecurityField(page, "email");
            await toggleSecurityField(page, "password");

            // Modify values
            await page.getByTestId("security-username").fill("ChangedUsername");
            await page.getByTestId("security-email").fill("newemail@example.com");

            // Cancel
            await cancelSecurityFieldEdit(page, {
               username: originalUsername,
               email: originalEmail,
               password: "Password1!"
            });

            // Verify all original and disabled
            await expect(page.getByTestId("security-username")).toHaveValue(originalUsername);
            await expect(page.getByTestId("security-email")).toHaveValue(originalEmail);
            await assertAllSecurityFieldsDisabled(page);
            await expect(page.getByTestId("security-username-pen")).toBeVisible();
            await expect(page.getByTestId("security-email-pen")).toBeVisible();
            await expect(page.getByTestId("security-password-pen")).toBeVisible();
         });
      });
   });

   test.describe("Cross-Section Updates", () => {
      test("should update Details and Security fields together", async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
         await openSettingsPage(page);

         const newName = "Updated Full Name";
         const newUsername = `user_${Date.now()}`;

         // Update details name
         await page.getByTestId("details-name").fill(newName);

         // Submit details form
         await page.getByTestId("details-submit").click();
         await page.getByTestId("details-submit").waitFor({ state: "hidden", timeout: 10000 });

         // Update security username
         await toggleSecurityField(page, "username");
         await page.getByTestId("security-username").fill(newUsername);

         // Submit security form
         await page.getByTestId("security-submit").click();
         await page.getByTestId("security-submit").waitFor({ state: "hidden", timeout: 10000 });

         // Verify both updated
         await assertDetailsDisplay(page, { name: newName });
         await expect(page.getByTestId("security-username")).toHaveValue(newUsername);
      });
   });

   test.describe("Actions", () => {
      test.describe("Logout", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
            await openSettingsPage(page);
         });

         test("should logout with confirmation", async({ page }) => {
            await performLogout(page);
         });

         test("should cancel logout operation", async({ page }) => {
            await cancelLogout(page);
         });
      });

      test.describe("Delete Account", () => {
         test("should delete account with confirmation", async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);

            await performDelete(page, true);

            // Verify redirect
            await expect(page).toHaveURL("/");
         });

         test("should cancel delete operation", async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);

            await performDelete(page, false);

            // Verify still on settings
            await assertComponentVisibility(page, "settings-details");
         });
      });

      test.describe("Export Account", () => {
         test("should export account data as JSON", async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
            await openSettingsPage(page);

            // Create 2 test accounts
            const account1Data = { name: "Checking Account", balance: 5000, type: "Checking" };
            const account2Data = { name: "Savings Account", balance: 3000, type: "Savings" };

            await navigateToPath(page, "/dashboard/accounts");
            await createAccount(page, account1Data);
            await createAccount(page, account2Data);

            // Navigate back to settings
            await navigateToPath(page, "/dashboard/settings");

            // Export
            const exportedJSON = await performExport(page);

            // Verify structure with 2 accounts
            await assertExportStructure(exportedJSON, 2);

            // Verify accounts have correct data
            const exportedAccounts = exportedJSON.accounts;
            expect(exportedAccounts.some((a: any) => a.name === "Checking Account" && a.balance === 5000)).toBe(true);
            expect(exportedAccounts.some((a: any) => a.name === "Savings Account" && a.balance === 3000)).toBe(true);
         });
      });
   });
});
