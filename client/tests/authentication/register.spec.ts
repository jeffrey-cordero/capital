import { expect, test } from "@tests/fixtures";
import {
   cleanupUsersWithIsolatedBrowser,
   createUser,
   DASHBOARD_ROUTE,
   LOGIN_ROUTE,
   REGISTER_ROUTE
} from "@tests/utils/authentication";
import { assertValidationError, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { assertPasswordVisibilityToggle, getPasswordToggleButton } from "@tests/utils/password";
import {
   createUserWithInvalidEmail,
   createUserWithMismatchedPasswords,
   generateTestCredentials,
   INVALID_PASSWORD_CASES,
   VALID_REGISTRATION
} from "capital/mocks/user";

test.describe("User Registration", () => {
   test.beforeEach(async({ page }) => {
      await navigateToPath(page, REGISTER_ROUTE);
   });

   test.afterAll(async({ createdUsersRegistry }) => {
      await cleanupUsersWithIsolatedBrowser(createdUsersRegistry);
   });

   test.describe("UI Components and Layout", () => {
      test("should display registration page with all required elements", async({ page }) => {
         // Verify all form fields are present
         await expect(page.getByTestId("name")).toBeVisible();
         await expect(page.getByTestId("birthday")).toBeVisible();
         await expect(page.getByTestId("username")).toBeVisible();
         await expect(page.getByTestId("password")).toBeVisible();
         await expect(page.getByTestId("verifyPassword")).toBeVisible();
         await expect(page.getByTestId("email")).toBeVisible();
         await expect(page.getByTestId("submit-button")).toBeVisible();

         // Verify the navigation link to the login page
         await expect(page.getByTestId("login-link")).toBeVisible();
         await page.getByTestId("login-link").click();
         await expect(page).toHaveURL(LOGIN_ROUTE);
      });

      test("should toggle password visibility for both password fields", async({ page }) => {
         await assertPasswordVisibilityToggle(page, "password");
         await assertPasswordVisibilityToggle(page, "verifyPassword");
      });

      test("should have independent toggle states for password fields", async({ page }) => {
         const passwordInput = page.getByTestId("password");
         const confirmPasswordInput = page.getByTestId("verifyPassword");
         const passwordToggle = getPasswordToggleButton(page, "password");
         const confirmPasswordToggle = getPasswordToggleButton(page, "verifyPassword");

         // Fill both fields
         await passwordInput.fill("TestPassword123!");
         await confirmPasswordInput.fill("TestPassword123!");

         // Both should initially be hidden
         await expect(passwordInput).toHaveAttribute("type", "password");
         await expect(confirmPasswordInput).toHaveAttribute("type", "password");

         // Show only password field
         await passwordToggle.click();
         await expect(passwordInput).toHaveAttribute("type", "text");
         await expect(confirmPasswordInput).toHaveAttribute("type", "password");

         // Show only confirm password field
         await confirmPasswordToggle.click();
         await expect(passwordInput).toHaveAttribute("type", "text");
         await expect(confirmPasswordInput).toHaveAttribute("type", "text");

         // Hide password field, confirm password should remain visible
         await passwordToggle.click();
         await expect(passwordInput).toHaveAttribute("type", "password");
         await expect(confirmPasswordInput).toHaveAttribute("type", "text");
      });
   });

   test.describe("Form Validation", () => {
      test("should display validation errors for empty form submission", async({ page }) => {
         await submitForm(page, {});
         await assertValidationError(page, "name", "Name is required");
         await assertValidationError(page, "birthday", "Birthday is required");
         await assertValidationError(page, "username", "Username is required");
         await assertValidationError(page, "email", "Email is required");
         await assertValidationError(page, "password", "Password is required");
         await assertValidationError(page, "verifyPassword", "Password is required");
      });

      test("should validate name field requirements", async({ page }) => {
         await submitForm(page, { name: "a" });
         await assertValidationError(page, "name", "Name must be at least 2 characters");
      });

      test("should validate email format", async({ page }) => {
         const invalidEmailTypes: Array<"noAtSymbol" | "noDomain" | "noUsername"> = ["noAtSymbol", "noDomain", "noUsername"];

         for (const invalidType of invalidEmailTypes) {
            const invalidUserData = createUserWithInvalidEmail(invalidType);
            await submitForm(page, invalidUserData);
            await assertValidationError(page, "email", "Invalid email address");
         }
      });

      INVALID_PASSWORD_CASES.forEach(({ name, password, expected }: { name: string; password: string; expected: string }) => {
         test(`should enforce password complexity: ${name}`, async({ page }) => {
            const userData = { ...VALID_REGISTRATION, ...generateTestCredentials(), password, verifyPassword: password };
            await submitForm(page, userData);
            await assertValidationError(page, "password", expected);
         });
      });

      test("should validate password confirmation matching", async({ page }) => {
         const mismatchedPasswordData = createUserWithMismatchedPasswords();
         await submitForm(page, mismatchedPasswordData);
         await assertValidationError(page, "verifyPassword", "Passwords don't match");
      });
   });

   test.describe("Registration Flow", () => {
      test("should maintain session after successful registration", async({ page, createdUsersRegistry }) => {
         await createUser(page, {}, true, createdUsersRegistry);

         // Verify session persists across page reload
         await page.reload();
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });
   });

   test.describe("Duplicate Registration Prevention", () => {
      test("should prevent conflicts with case sensitivity variations", async({ page, createdUsersRegistry }) => {
         // Create initial user
         const { username: originalUsername, email: originalEmail } = await createUser(page, {}, false, createdUsersRegistry);

         // Test 1: Username conflict with case sensitivity
         await navigateToPath(page, REGISTER_ROUTE);
         const { email: newEmail1 } = generateTestCredentials();
         await submitForm(page, {
            ...VALID_REGISTRATION,
            username: originalUsername.toUpperCase(),
            email: newEmail1
         });
         await assertValidationError(page, "username", "Username already exists");

         // Test 2: Email conflict with case sensitivity and whitespace
         await navigateToPath(page, REGISTER_ROUTE);
         const { username: newUsername2 } = generateTestCredentials();
         const emailWithWhitespace = `  ${originalEmail.toUpperCase()}  `;
         await submitForm(page, {
            ...VALID_REGISTRATION,
            username: newUsername2,
            email: emailWithWhitespace
         });
         await assertValidationError(page, "email", "Email already exists");

         // Test 3: Both username and email conflict with case variations
         await navigateToPath(page, REGISTER_ROUTE);
         await submitForm(page, {
            ...VALID_REGISTRATION,
            username: `  ${originalUsername.toLowerCase()}  `,
            email: originalEmail.toUpperCase()
         });
         await assertValidationError(page, "username", "Username already exists");
         await assertValidationError(page, "email", "Email already exists");
      });
   });
});