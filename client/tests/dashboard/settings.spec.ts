import { expect, test } from "@tests/fixtures";
import { assertComponentIsVisible } from "@tests/utils";
import {
   ACCOUNTS_ROUTE,
   createUser,
   DASHBOARD_ROUTE,
   logoutUser,
   REGISTER_ROUTE,
   ROOT_ROUTE,
   SETTINGS_ROUTE
} from "@tests/utils/authentication";
import { createAccount } from "@tests/utils/dashboard/accounts";
import {
   assertAccountDetails,
   assertExportStructure,
   assertSecurityDetails,
   assertThemeState,
   cancelLogout,
   getCurrentAndOppositeTheme,
   performAccountDeletion,
   performAndAssertCancelBehavior,
   performAndAssertDetailsUpdate,
   performAndAssertSecurityUpdate,
   performExport,
   testAllPasswordVisibilityToggles,
   toggleTheme,
   updateDetails,
   updateSecurityFields
} from "@tests/utils/dashboard/settings";
import { navigateToPath } from "@tests/utils/navigation";
import { setupAssignedUser } from "@tests/utils/user-management";
import type { Account } from "capital/accounts";
import { createUserUpdatesWithPasswordChange } from "capital/mocks/user";

test.describe("Settings", () => {
   test.describe("Initial State", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, false, false, assignedUser);
      });

      test("should display security details form with correct initial values", async({ page, assignedUser }) => {
         await assertSecurityDetails(page, {
            username: assignedUser.current?.username,
            email: assignedUser.current?.email
         });
      });

      test("should have independent password field visibility toggles", async({ page }) => {
         await testAllPasswordVisibilityToggles(page);
      });

      test("should display account details form with correct initial values", async({ page, assignedUser }) => {
         const { current: currentThemeValue } = await getCurrentAndOppositeTheme(page);
         await assertAccountDetails(page, {
            name: assignedUser.current?.name,
            birthday: assignedUser.current?.birthday,
            theme: currentThemeValue
         });
      });

      test("should display action buttons", async({ page }) => {
         await assertComponentIsVisible(page, "settings-export", "Export Data");
         await assertComponentIsVisible(page, "settings-logout", "Logout");
         await assertComponentIsVisible(page, "settings-delete-account", "Delete Account");
      });
   });

   test.describe("Account Details", () => {
      test.describe("Successful Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, true, true, assignedUser);
         });

         test("should successfully update name", async({ page, assignedUser }) => {
            await performAndAssertDetailsUpdate(page, assignedUser, ["name"]);
         });

         test("should successfully update birthday", async({ page, assignedUser }) => {
            await performAndAssertDetailsUpdate(page, assignedUser, ["birthday"]);
         });

         test("should successfully toggle theme", async({ page }) => {
            const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);
            await toggleTheme(page, "details", newTheme);
            await assertThemeState(page, newTheme);
         });

         test("should successfully update name, birthday, and theme", async({ page, assignedUser }) => {
            await performAndAssertDetailsUpdate(page, assignedUser, ["name", "birthday", "theme"]);
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

         test("should validate birthday is not too early", async({ page }) => {
            await updateDetails(page, { birthday: "1799-12-31" }, { "details-birthday": "Birthday must be on or after 1800-01-01" });
         });

         test("should validate birthday is not in the future", async({ page }) => {
            const futureDate: Date = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const futureDateString: string = futureDate.toISOString().split("T")[0];
            await updateDetails(page, { birthday: futureDateString }, { "details-birthday": "Birthday cannot be in the future" });
         });
      });

      test.describe("Cancel Behavior", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, true, true, assignedUser);
         });

         test("should cancel name change and revert to original value", async({ page, assignedUser }) => {
            await performAndAssertCancelBehavior(page, assignedUser, "details", ["name"]);
         });

         test("should cancel birthday change and revert to original value", async({ page, assignedUser }) => {
            await performAndAssertCancelBehavior(page, assignedUser, "details", ["birthday"]);
         });

         test("should cancel multiple field changes and revert to original values", async({ page, assignedUser }) => {
            await performAndAssertCancelBehavior(page, assignedUser, "details", ["name", "birthday"]);
         });
      });
   });

   test.describe("Account Security", () => {
      test.describe("Successful Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, true, true, assignedUser);
         });

         test("should successfully update username", async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await performAndAssertSecurityUpdate(page, usersRegistry, assignedRegistry, assignedUser, ["username"]);
         });

         test("should successfully update email", async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await performAndAssertSecurityUpdate(page, usersRegistry, assignedRegistry, assignedUser, ["email"]);
         });

         test("should successfully update password", async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await performAndAssertSecurityUpdate(page, usersRegistry, assignedRegistry, assignedUser, ["currentPassword", "newPassword", "verifyPassword"]);
         });

         test("should successfully update username, email, and password", async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await performAndAssertSecurityUpdate(page, usersRegistry, assignedRegistry, assignedUser, ["username", "email", "currentPassword", "newPassword", "verifyPassword"]);
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

         test("should validate password verification match", async({ page }) => {
            const { password: currentPassword, newPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               currentPassword,
               newPassword,
               verifyPassword: "DifferentPassword1!"
            }, { "security-verify-password": "Passwords don't match" });
         });

         test("should validate new password is not same as current", async({ page }) => {
            const { password: currentPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               currentPassword,
               newPassword: currentPassword,
               verifyPassword: currentPassword
            }, { "security-new-password": "New password must not match the old password" });
         });

         test("should validate current password is correct", async({ page }) => {
            const { newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               currentPassword: "WrongPassword1!",
               newPassword,
               verifyPassword
            }, { "security-current-password": "Invalid credentials" });
         });

         test("should validate current password required", async({ page }) => {
            const { newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               newPassword,
               verifyPassword
            }, { "security-current-password": "Current password is required to set a new password" });
         });

         test("should validate new password required", async({ page }) => {
            const { password: currentPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               currentPassword,
               verifyPassword
            }, { "security-new-password": "New password is required to set a new password" });
         });
      });

      test.describe("Cancel Behavior", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, true, true, assignedUser);
         });

         test("should cancel username change and revert to original value", async({ page, assignedUser }) => {
            await performAndAssertCancelBehavior(page, assignedUser, "security", ["username"]);
         });

         test("should cancel email change and revert to original value", async({ page, assignedUser }) => {
            await performAndAssertCancelBehavior(page, assignedUser, "security", ["email"]);
         });

         test("should cancel password change and hide password fields", async({ page, assignedUser }) => {
            await performAndAssertCancelBehavior(page, assignedUser, "security", ["currentPassword"]);
         });

         test("should cancel all security field changes and revert to original values", async({ page, assignedUser }) => {
            await performAndAssertCancelBehavior(page, assignedUser, "security", ["username", "email", "currentPassword"]);
         });
      });
   });

   test.describe("User Actions", () => {
      test.describe("Logout", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, false, false, assignedUser);
         });

         test("should successfully logout with confirmation", async({ page }) => {
            await logoutUser(page, "settings");
         });

         test("should cancel logout and remain logged in", async({ page }) => {
            await cancelLogout(page);
         });
      });

      test.describe("Account Deletion", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, SETTINGS_ROUTE, false, false, assignedUser);
         });

         test("should successfully delete account with confirmation and allow re-registration", async({ page, usersRegistry, assignedUser }) => {
            const { username, password } = { username: assignedUser.current.username, password: assignedUser.current.password };
            await performAccountDeletion(page, true);
            await expect(page).toHaveURL(ROOT_ROUTE);

            await navigateToPath(page, REGISTER_ROUTE);
            await createUser(page, { username, password }, true, usersRegistry);
            await expect(page).toHaveURL(DASHBOARD_ROUTE);
         });

         test("should cancel account deletion and remain on settings", async({ page }) => {
            await performAccountDeletion(page, false);
            await expect(page).toHaveURL(SETTINGS_ROUTE);
         });
      });

      test.describe("Data Export", () => {
         test("should export account data as JSON with correct structure and values", async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, true, true, assignedUser);

            const account1Data = { name: "Checking Account", balance: 5000, type: "Checking" };
            const account2Data = { name: "Savings Account", balance: 3000, type: "Savings" };
            const account1Id = await createAccount(page, account1Data);
            const account2Id = await createAccount(page, account2Data);

            await navigateToPath(page, SETTINGS_ROUTE);
            const exportedJSON = await performExport(page);

            const expectedAccounts = [
               { ...account1Data, account_id: account1Id, last_updated: expect.any(String) },
               { ...account2Data, account_id: account2Id, last_updated: expect.any(String) }
            ] as unknown as Account[];

            await assertExportStructure(exportedJSON, {
               settings: {
                  username: assignedUser.current.username,
                  name: assignedUser.current.name,
                  email: assignedUser.current.email,
                  birthday: new Date(assignedUser.current.birthday).toISOString().split("T")[0]
               },
               accounts: expectedAccounts,
               // Future test suites will verify the following structures
               budgets: exportedJSON.budgets,
               transactions: [],
               timestamp: expect.any(String) as unknown as string
            });
         });
      });
   });
});