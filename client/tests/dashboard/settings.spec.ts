import { expect, test } from "@tests/fixtures";
import { assertComponentIsVisible, assertInputVisibility } from "@tests/utils";
import { ACCOUNTS_ROUTE, DASHBOARD_ROUTE, REGISTER_ROUTE, SETTINGS_ROUTE, VERIFIED_ROUTES, createUser } from "@tests/utils/authentication";
import {
   assertSecurityFieldDisabled,
   assertSecurityUpdates,
   assertDetailsDisplay,
   assertExportStructure,
   assertInitialSecurityState,
   assertThemeState,
   cancelDetailsEdit,
   cancelLogout,
   cancelSecurityFieldEdit,
   getCurrentAndOppositeTheme,
   openSettingsPage,
   performAndAssertDetailsUpdate,
   performAndAssertSecurityUpdate,
   performAndAssertThemeToggle,
   performDelete,
   performExport,
   performLogout,
   testAllPasswordVisibilityToggles,
   toggleSecurityField,
   toggleTheme,
   updateDetails,
   updateSecurityFields
} from "@tests/utils/dashboard/settings";
import { createAccount } from "@tests/utils/dashboard/accounts";
import { setupAssignedUser, updateUsernameInRegistries, updatePasswordInRegistries } from "@tests/utils/user-management";
import { navigateToPath } from "@tests/utils/navigation";
import { generateTestCredentials, createUserUpdatesWithPasswordChange } from "capital/mocks/user";

test.describe("Settings Page E2E Tests", () => {

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
         await assertComponentIsVisible(page, "details-theme-toggle");
      });
   });

   test.describe("Details Form", () => {
      test.describe("Successful Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
            await openSettingsPage(page);
         });

         test("should update name only", async({ page }) => {
            await performAndAssertDetailsUpdate(
               page,
               { name: "Updated Name" }
            );
         });

         test("should update birthday only", async({ page }) => {
            await performAndAssertDetailsUpdate(
               page,
               { birthday: "1995-05-15" }
            );
         });

         test("should update name and birthday together", async({ page }) => {
            await performAndAssertDetailsUpdate(
               page,
               { name: "New Full Name", birthday: "1990-06-20" }
            );
         });

         test("should toggle theme and apply instantly", async({ page }) => {
            const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);
            await performAndAssertThemeToggle(page, "details", newTheme);
         });

         test("should update name, birthday, and toggle theme", async({ page }) => {
            const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);
            await performAndAssertDetailsUpdate(
               page,
               { name: "Updated User", birthday: "1992-03-10", theme: newTheme }
            );
            await performAndAssertThemeToggle(page, "details", newTheme);
         });

         test("should update all Details fields together", async({ page }) => {
            const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);
            await performAndAssertDetailsUpdate(
               page,
               { name: "Complete Update", birthday: "1988-12-25", theme: newTheme }
            );
            await performAndAssertThemeToggle(page, "details", newTheme);
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
            const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);
            await toggleTheme(page, "details", newTheme);
            await assertThemeState(page, newTheme);

            for (const route of VERIFIED_ROUTES) {
               if (route !== DASHBOARD_ROUTE) {
                  await navigateToPath(page, route);
                  await assertThemeState(page, newTheme);
               }
            }
         });

         test("should persist theme across page reload", async({ page }) => {
            const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);
            await toggleTheme(page, "details", newTheme);
            await assertThemeState(page, newTheme);

            await page.reload();
            await assertThemeState(page, newTheme);
         });

         test("should sync theme between sidebar and settings form", async({ page }) => {
            const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);

            await toggleTheme(page, "details", newTheme);
            await assertThemeState(page, newTheme);

            const oppositeTheme = newTheme === "dark" ? "light" : "dark";
            await toggleTheme(page, "details", oppositeTheme);
            await assertThemeState(page, oppositeTheme);
         });
      });

      test.describe("Cancel Behavior", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
            await openSettingsPage(page);
         });

         test("should cancel name change and show original value", async({ page }) => {
            const originalName = await page.getByTestId("details-name").inputValue();

            // Make change (use different value if it matches current value)
            const newName = originalName === "New Name" ? "Different Name" : "New Name";
            await page.getByTestId("details-name").fill(newName);

            // Verify cancel button appears (indicates change was detected)
            await assertComponentIsVisible(page, "details-cancel");

            // Cancel
            await cancelDetailsEdit(page, { name: originalName });

            // Verify original
            await expect(page.getByTestId("details-name")).toHaveValue(originalName);
         });

         test("should cancel birthday change and show original value", async({ page }) => {
            const originalBirthday = await page.getByTestId("details-birthday").inputValue();

            // Make change (use different value if it matches current value)
            const newBirthday = originalBirthday === "1995-01-01" ? "1990-01-01" : "1995-01-01";
            await page.getByTestId("details-birthday").fill(newBirthday);

            // Verify cancel button appears (indicates change was detected)
            await assertComponentIsVisible(page, "details-cancel");

            // Cancel
            await cancelDetailsEdit(page, { birthday: originalBirthday });

            // Verify original
            await expect(page.getByTestId("details-birthday")).toHaveValue(originalBirthday);
         });

         test("should cancel multiple field changes", async({ page }) => {
            const originalName = await page.getByTestId("details-name").inputValue();
            const originalBirthday = await page.getByTestId("details-birthday").inputValue();

            // Make changes (use different values if they match current values)
            const newName = originalName === "Updated Name" ? "Different Name" : "Updated Name";
            const newBirthday = originalBirthday === "1990-01-01" ? "1995-01-01" : "1990-01-01";

            await page.getByTestId("details-name").fill(newName);
            await page.getByTestId("details-birthday").fill(newBirthday);

            // Verify cancel button appears (indicates changes were detected)
            await assertComponentIsVisible(page, "details-cancel");

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

         test("should update username only", async({ page, usersRegistry, assignedRegistry }) => {
            const originalUsername = await page.getByTestId("security-username").inputValue();
            const { username: newUsername } = generateTestCredentials();
            await performAndAssertSecurityUpdate(page, { username: newUsername });
            updateUsernameInRegistries(usersRegistry, assignedRegistry, originalUsername, newUsername);
         });

         test("should update email only", async({ page }) => {
            const { email: newEmail } = generateTestCredentials();
            await performAndAssertSecurityUpdate(page, { email: newEmail });
         });

         test("should update password with valid credentials", async({ page, usersRegistry, assignedRegistry }) => {
            const currentUsername = await page.getByTestId("security-username").inputValue();
            const { password: currentPassword, newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await performAndAssertSecurityUpdate(page, {
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
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);
         });

         test("should update username and email together", async({ page }) => {
            const { username: newUsername, email: newEmail } = generateTestCredentials();
            await updateSecurityFields(page, { username: newUsername, email: newEmail });
            await assertSecurityUpdates(page, { username: newUsername, email: newEmail });
         });

         test("should update username and password together", async({ page }) => {
            const { username: newUsername } = generateTestCredentials();
            const { password: currentPassword, newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               username: newUsername,
               password: currentPassword,
               newPassword,
               verifyPassword
            });
            await assertSecurityUpdates(page, { username: newUsername });
         });

         test("should update email and password together", async({ page }) => {
            const { email: newEmail } = generateTestCredentials();
            const { password: currentPassword, newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               email: newEmail,
               password: currentPassword,
               newPassword,
               verifyPassword
            });
            await assertSecurityUpdates(page, { email: newEmail });
         });
      });

      test.describe("Update All Security Fields", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);
         });

         test("should update all security fields together", async({ page }) => {
            const { username: newUsername, email: newEmail } = generateTestCredentials();
            const { password: currentPassword, newPassword, verifyPassword } = createUserUpdatesWithPasswordChange();
            await updateSecurityFields(page, {
               username: newUsername,
               email: newEmail,
               password: currentPassword,
               newPassword,
               verifyPassword
            });
            await assertSecurityUpdates(page, { username: newUsername, email: newEmail });
         });
      });

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);
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
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);
         });

         test("should cancel username change and show original value", async({ page }) => {
            const originalUsername = await page.getByTestId("security-username").inputValue();

            // Enable and modify (use different value if it matches current value)
            await toggleSecurityField(page, "username");
            const newUsername = originalUsername === "ChangedUsername" ? "DifferentUsername" : "ChangedUsername";
            await page.getByTestId("security-username").fill(newUsername);

            // Verify cancel button appears (indicates change was detected)
            await assertComponentIsVisible(page, "security-cancel");

            // Cancel
            await cancelSecurityFieldEdit(page, { username: originalUsername });

            // Verify original and disabled
            await expect(page.getByTestId("security-username")).toHaveValue(originalUsername);
            await assertSecurityFieldDisabled(page, "username");
         });

         test("should cancel email change and show original value", async({ page }) => {
            const originalEmail = await page.getByTestId("security-email").inputValue();

            // Enable and modify (use different value if it matches current value)
            await toggleSecurityField(page, "email");
            const newEmail = originalEmail === "newemail@example.com" ? "different@example.com" : "newemail@example.com";
            await page.getByTestId("security-email").fill(newEmail);

            // Verify cancel button appears (indicates change was detected)
            await assertComponentIsVisible(page, "security-cancel");

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
            await assertComponentIsVisible(page, "security-current-password");
            await assertComponentIsVisible(page, "security-new-password");
            await assertComponentIsVisible(page, "security-verify-password");

            // Fill password fields to trigger change detection
            await page.getByTestId("security-current-password").fill("Password1!");
            await page.getByTestId("security-new-password").fill("NewPassword1!");
            await page.getByTestId("security-verify-password").fill("NewPassword1!");

            // Verify cancel button appears (indicates change was detected)
            await assertComponentIsVisible(page, "security-cancel");

            // Cancel
            await cancelSecurityFieldEdit(page, { password: "Password1!" });

            // Verify all disabled
            await assertSecurityFieldDisabled(page, "password");
            await assertComponentIsVisible(page, "security-password-pen");
         });

         test("should cancel all security field changes", async({ page }) => {
            const originalUsername = await page.getByTestId("security-username").inputValue();
            const originalEmail = await page.getByTestId("security-email").inputValue();

            // Enable all
            await toggleSecurityField(page, "username");
            await toggleSecurityField(page, "email");
            await toggleSecurityField(page, "password");

            // Modify values (use different values if they match current values)
            const newUsername = originalUsername === "ChangedUsername" ? "DifferentUsername" : "ChangedUsername";
            const newEmail = originalEmail === "newemail@example.com" ? "different@example.com" : "newemail@example.com";

            await page.getByTestId("security-username").fill(newUsername);
            await page.getByTestId("security-email").fill(newEmail);

            // Fill password fields to trigger change detection
            await page.getByTestId("security-current-password").fill("Password1!");
            await page.getByTestId("security-new-password").fill("NewPassword1!");
            await page.getByTestId("security-verify-password").fill("NewPassword1!");

            // Verify cancel button appears (indicates changes were detected)
            await assertComponentIsVisible(page, "security-cancel");

            // Cancel
            await cancelSecurityFieldEdit(page, {
               username: originalUsername,
               email: originalEmail,
               password: "Password1!"
            });

            // Verify all original and disabled
            await expect(page.getByTestId("security-username")).toHaveValue(originalUsername);
            await expect(page.getByTestId("security-email")).toHaveValue(originalEmail);
            await assertSecurityUpdates(page);
         });
      });
   });

   test.describe("Cross-Section Updates", () => {
      test("should update Details and Security fields together", async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
         await openSettingsPage(page);

         const newName = "Updated Full Name";
         const { username: newUsername } = generateTestCredentials();

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
            // Get the credentials before deletion
            const username = Object.keys(assignedRegistry)[0];
            const password = username ? assignedRegistry[username] : undefined;

            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);

            await performDelete(page, true);

            // Verify redirect
            await expect(page).toHaveURL("/");

            // Re-register the user with same credentials for clean teardown
            if (username && password) {
               // Navigate to register page and re-register
               await navigateToPath(page, REGISTER_ROUTE);
               await createUser(page, { username, password }, false, usersRegistry);
            }
         });

         test("should cancel delete operation", async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true);
            await openSettingsPage(page);

            await performDelete(page, false);

            // Verify still on settings
            await assertComponentIsVisible(page, "settings-details");
         });
      });

      test.describe("Export Account", () => {
         test("should export account data as JSON", async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
            await openSettingsPage(page);

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
