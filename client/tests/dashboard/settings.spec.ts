import { expect, test } from "@tests/fixtures";
import { assertComponentIsVisible } from "@tests/utils";
import {
   ACCOUNTS_ROUTE,
   createUser,
   DASHBOARD_ROUTE,
   REGISTER_ROUTE,
   ROOT_ROUTE,
   SETTINGS_ROUTE
} from "@tests/utils/authentication";
import { createAccount } from "@tests/utils/dashboard/accounts";
import {
   assertAccountDetails,
   assertExportStructure,
   assertSecurityDetails,
   cancelLogout,
   getCurrentAndOppositeTheme,
   performAndAssertCancelDetailsBehavior,
   performAndAssertCancelSecurityBehavior,
   performAndAssertDetailsUpdate,
   performAndAssertSecurityUpdate,
   performAndAssertThemeToggle,
   performDelete,
   performExport,
   performLogout,
   testAllPasswordVisibilityToggles,
   updateDetails,
   updateSecurityFields
} from "@tests/utils/dashboard/settings";
import { navigateToPath } from "@tests/utils/navigation";
import { setupAssignedUser, updatePasswordInRegistries, updateUsernameInRegistries } from "@tests/utils/user-management";
import { createUserUpdatesWithPasswordChange, generateTestCredentials } from "capital/mocks/user";

test.describe("Settings", () => {
   test.describe("Initial State", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, false, false, assignedUser);
      });

      test("should have accessible security details form inputs with values corresponding to assigned user", async({ page, assignedUser }) => {
         await assertSecurityDetails(page, {
            username: assignedUser.current?.username,
            email: assignedUser.current?.email
         });
      });

      test("should have accessible account details form inputs with values corresponding to assigned user", async({ page, assignedUser }) => {
         const { current: themeValue } = await getCurrentAndOppositeTheme(page);
         await assertAccountDetails(page, {
            name: assignedUser.current?.name,
            birthday: assignedUser.current?.birthday,
            theme: themeValue
         });
      });

      test("should have accessible action buttons", async({ page }) => {
         await assertComponentIsVisible(page, "settings-export", "Export Data");
         await assertComponentIsVisible(page, "settings-logout", "Logout");
         await assertComponentIsVisible(page, "settings-delete-account", "Delete Account");
      });
   });

   test.describe("Details Form", () => {
      test.describe("Successful Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, false, false, assignedUser);
         });

         test("should update name only", async({ page, assignedUser }) => {
            await performAndAssertDetailsUpdate(
               page,
               assignedUser,
               { name: "Updated Name" }
            );
         });

         test("should update birthday only", async({ page, assignedUser }) => {
            await performAndAssertDetailsUpdate(
               page,
               assignedUser,
               { birthday: "1995-05-15" }
            );
         });

         test("should update name and birthday together", async({ page, assignedUser }) => {
            await performAndAssertDetailsUpdate(
               page,
               assignedUser,
               { name: "New Full Name", birthday: "1990-06-20" }
            );
         });

         test("should toggle theme and apply instantly", async({ page }) => {
            const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);
            await performAndAssertThemeToggle(page, "details", newTheme);
         });

         test("should update name, birthday, and toggle theme", async({ page, assignedUser }) => {
            const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);
            await performAndAssertDetailsUpdate(
               page,
               assignedUser,
               { name: "Updated User", birthday: "1992-03-10", theme: newTheme }
            );
            await performAndAssertThemeToggle(page, "details", newTheme);
         });

         test("should update all Details fields together", async({ page, assignedUser }) => {
            const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);
            await performAndAssertDetailsUpdate(
               page,
               assignedUser,
               { name: "Complete Update", birthday: "1988-12-25", theme: newTheme }
            );
            await performAndAssertThemeToggle(page, "details", newTheme);
         });
      });

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, false, false);
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

      test.describe("Cancel Behavior", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, false, false, assignedUser);
         });

         test("should cancel name change and show original value", async({ page, assignedUser }) => {
            await performAndAssertCancelDetailsBehavior(page, assignedUser, ["name"]);
         });

         test("should cancel birthday change and show original value", async({ page, assignedUser }) => {
            await performAndAssertCancelDetailsBehavior(page, assignedUser, ["birthday"]);
         });

         test("should cancel multiple field changes", async({ page, assignedUser }) => {
            await performAndAssertCancelDetailsBehavior(page, assignedUser, ["name", "birthday"]);
         });
      });
   });

   test.describe("Security Form", () => {
      test.describe("Successful Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, true, true, assignedUser);
         });

         test("should update username only", async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            const originalUsername = await page.getByTestId("security-username").inputValue();
            const { username: newUsername } = generateTestCredentials();
            await performAndAssertSecurityUpdate(page, assignedUser, { username: newUsername });
            updateUsernameInRegistries(usersRegistry, assignedRegistry, originalUsername, newUsername);
         });

         test("should update email only", async({ page, assignedUser }) => {
            const { email: newEmail } = generateTestCredentials();
            await performAndAssertSecurityUpdate(page, assignedUser, { email: newEmail });
         });

         test("should update password with valid credentials", async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            const currentUsername = await page.getByTestId("security-username").inputValue();
            const { password: currentPassword, newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await performAndAssertSecurityUpdate(page, assignedUser, {
               password: currentPassword,
               newPassword,
               verifyPassword
            });
            updatePasswordInRegistries(usersRegistry, assignedRegistry, currentUsername, newPassword!);
         });

         test("should verify each password field has independent visibility toggle", async({ page }) => {
            await testAllPasswordVisibilityToggles(page);
         });
      });

      test.describe("Multiple Fields Together", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, true, true, assignedUser);
         });

         test("should update username and email together", async({ page, assignedUser }) => {
            const { username: newUsername, email: newEmail } = generateTestCredentials();
            await performAndAssertSecurityUpdate(page, assignedUser, { username: newUsername, email: newEmail });
         });

         test("should update username and password together", async({ page, assignedUser }) => {
            const { username: newUsername } = generateTestCredentials();
            const { password: currentPassword, newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await performAndAssertSecurityUpdate(page, assignedUser, {
               username: newUsername,
               password: currentPassword,
               newPassword,
               verifyPassword
            });
         });

         test("should update email and password together", async({ page, assignedUser }) => {
            const { email: newEmail } = generateTestCredentials();
            const { password: currentPassword, newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await performAndAssertSecurityUpdate(page, assignedUser, {
               email: newEmail,
               password: currentPassword,
               newPassword,
               verifyPassword
            });
         });
      });

      test.describe("Update All Security Fields", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, true, true, assignedUser);
         });

         test("should update all security fields together", async({ page, assignedUser }) => {
            const { username: newUsername, email: newEmail } = generateTestCredentials();
            const { password: currentPassword, newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await performAndAssertSecurityUpdate(page, assignedUser, {
               username: newUsername,
               email: newEmail,
               password: currentPassword,
               newPassword,
               verifyPassword
            });
         });
      });

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, true, true);
         });

         test("should validate username minimum length", async({ page }) => {
            await updateSecurityFields(page, { username: "a" }, { "security-username": "Username must be at least 2 characters" });
         });

         test("should validate email format", async({ page }) => {
            await updateSecurityFields(page, { email: "invalid-email" }, { "security-email": "Invalid email address" });
         });

         test("should validate password mismatch", async({ page }) => {
            const { password: currentPassword, newPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               password: currentPassword,
               newPassword,
               verifyPassword: "DifferentPassword1!"
            }, { "security-verify-password": "Passwords don't match" });
         });

         test("should validate new password same as old password", async({ page }) => {
            const { password: currentPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               password: currentPassword,
               newPassword: currentPassword,
               verifyPassword: currentPassword
            }, { "security-new-password": "New password must not match the old password" });
         });

         test("should validate invalid current password", async({ page }) => {
            const { newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               password: "WrongPassword1!",
               newPassword,
               verifyPassword
            }, { "security-current-password": "Invalid credentials" });
         });

         test("should validate current password required for password change", async({ page }) => {
            const { newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               newPassword,
               verifyPassword
            }, { "security-current-password": "Current password is required to set a new password" });
         });

         test("should validate new password required for password change", async({ page }) => {
            const { password: currentPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               password: currentPassword,
               verifyPassword
            }, { "security-new-password": "New password is required to set a new password" });
         });
      });

      test.describe("Cancel Behavior", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, true, true, assignedUser);
         });

         test("should cancel username change and show original value", async({ page, assignedUser }) => {
            await performAndAssertCancelSecurityBehavior(page, assignedUser, ["username"]);
         });

         test("should cancel email change and show original value", async({ page, assignedUser }) => {
            await performAndAssertCancelSecurityBehavior(page, assignedUser, ["email"]);
         });

         test("should cancel password change and hide all password fields", async({ page, assignedUser }) => {
            await performAndAssertCancelSecurityBehavior(page, assignedUser, ["password"]);
            await assertComponentIsVisible(page, "security-password-pen");
         });

         test("should cancel all security field changes", async({ page, assignedUser }) => {
            await performAndAssertCancelSecurityBehavior(page, assignedUser, ["username", "email", "password"]);
         });
      });
   });

   test.describe("Actions", () => {
      test.describe("Logout", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, false, false, assignedUser);
         });

         test("should logout with confirmation", async({ page }) => {
            await performLogout(page);
         });

         test("should cancel logout operation", async({ page }) => {
            await cancelLogout(page);
         });
      });

      test.describe("Delete Account", () => {
         test("should delete account with confirmation", async({ page, usersRegistry }) => {
            const { username, password } = await createUser(page, {}, true, usersRegistry, true);
            await navigateToPath(page, SETTINGS_ROUTE);
            await performDelete(page, true);

            // Verify redirect
            await expect(page).toHaveURL(ROOT_ROUTE);

            // Navigate to register page and re-register
            await navigateToPath(page, REGISTER_ROUTE);
            await createUser(page, { username, password }, true, usersRegistry);

            // Verify redirect to dashboard for explicitiveness
            await expect(page).toHaveURL(DASHBOARD_ROUTE);
         });

         test("should cancel delete operation", async({ page, usersRegistry }) => {
            await createUser(page, {}, true, usersRegistry, true);
            await navigateToPath(page, SETTINGS_ROUTE);
            await performDelete(page, false);
            await expect(page).toHaveURL(SETTINGS_ROUTE);
         });
      });

      test.describe("Export Account", () => {
         test("should export account data as JSON", async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, true, true);

            // Create 2 test accounts
            const account1Data = { name: "Checking Account", balance: 5000, type: "Checking" };
            const account2Data = { name: "Savings Account", balance: 3000, type: "Savings" };

            await navigateToPath(page, ACCOUNTS_ROUTE);
            await createAccount(page, account1Data);
            await createAccount(page, account2Data);

            // Navigate back to settings
            await navigateToPath(page, SETTINGS_ROUTE);

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