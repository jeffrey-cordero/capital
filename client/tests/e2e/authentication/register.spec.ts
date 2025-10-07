import { expect, type Page, test } from "@playwright/test";
import {
   createUser,
   DASHBOARD_ROUTE,
   generateTestCredentials,
   LOGIN_ROUTE,
   REGISTER_ROUTE
} from "@tests/utils/authentication";
import { expectValidationError, submitForm, VALID_REGISTRATION } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { getPasswordToggleButton, testPasswordVisibilityToggle } from "@tests/utils/password";

/**
 * Helper function to test password validation scenarios
 *
 * @param page - Playwright page instance
 * @param password - Password to test
 * @param verifyPassword - Verify password to test
 * @param expectedError - Expected validation error message
 * @param testId - Test ID of the field that should show the error (defaults to "password")
 */
async function testPasswordValidation(
   page: Page,
   password: string,
   verifyPassword: string,
   expectedError: string,
   testId: string = "password"
): Promise<void> {
   const { username, email } = generateTestCredentials();
   await submitForm(page, { ...VALID_REGISTRATION, username, email, password, verifyPassword });
   await expectValidationError(page, testId, expectedError);
}

test.describe("User Registration", () => {
   test.beforeEach(async({ page }) => {
      await navigateToPath(page, REGISTER_ROUTE);
   });

   test.describe("UI Components and Layout", () => {
      test("should display registration page with all required elements", async({ page }) => {
         // Verify essential form fields are present
         await expect(page.getByTestId("name")).toBeVisible();
         await expect(page.getByTestId("birthday")).toBeVisible();
         await expect(page.getByTestId("username")).toBeVisible();
         await expect(page.getByTestId("password")).toBeVisible();
         await expect(page.getByTestId("verifyPassword")).toBeVisible();
         await expect(page.getByTestId("email")).toBeVisible();
         await expect(page.getByTestId("submit-button")).toBeVisible();

         // Verify navigation link to login
         await expect(page.getByTestId("login-link")).toBeVisible();
         // Un-blur the auto-focused input to ensure proper navigation
         await page.evaluate(() => (document.activeElement as HTMLInputElement)?.blur());
         await page.getByTestId("login-link").click();
         await expect(page).toHaveURL(LOGIN_ROUTE);
      });

      test("should toggle password visibility for both password fields", async({ page }) => {
         await testPasswordVisibilityToggle(page, "password");
         await testPasswordVisibilityToggle(page, "verifyPassword");
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
         await expectValidationError(page, "name", "Name must be at least 2 characters");
         await expectValidationError(page, "birthday", "Birthday is required");
         await expectValidationError(page, "username", "Username must be at least 2 characters");
         await expectValidationError(page, "email", "Invalid email address");
         await expectValidationError(page, "password", "Password must be at least 8 characters");
         await expectValidationError(page, "verifyPassword", "Password must be at least 8 characters");
      });

      test("should validate name field requirements", async({ page }) => {
         await submitForm(page, { name: "a" });
         await expectValidationError(page, "name", "Name must be at least 2 characters");
      });

      test("should validate email format", async({ page }) => {
         const invalidEmails = ["notanemail", "@example.com", "user@", "user.example.com"];

         for (const invalidEmail of invalidEmails) {
            await submitForm(page, { ...VALID_REGISTRATION, email: invalidEmail });
            await expectValidationError(page, "email", "Invalid email address");
         }
      });

      test("should enforce password complexity requirements", async({ page }) => {
         // Test missing uppercase
         await testPasswordValidation(page, "password", "password", "Password must contain at least one uppercase letter");

         // Test missing lowercase
         await testPasswordValidation(page, "PASSWORD", "PASSWORD", "Password must contain at least one lowercase letter");

         // Test missing number
         await testPasswordValidation(page, "Password", "Password", "Password must contain at least one number");
      });

      test("should validate password confirmation matching", async({ page }) => {
         await testPasswordValidation(page, "Password1!", "Password2!", "Passwords don't match", "verifyPassword");
      });
   });

   test.describe("Registration Flow", () => {
      test("should maintain session after successful registration", async({ page }) => {
         await createUser(page);

         // Verify session persists across page reload
         await page.reload();
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });
   });

   test.describe("Duplicate Registration Prevention", () => {
      test("should prevent conflicts with case sensitivity variations", async({ page }) => {
         // Create initial user
         const { username: originalUsername, email: originalEmail } = await createUser(page, {}, false);

         // Test 1: Username conflict with case sensitivity
         await navigateToPath(page, REGISTER_ROUTE);
         const { email: newEmail1 } = generateTestCredentials();
         await submitForm(page, {
            ...VALID_REGISTRATION,
            username: originalUsername.toUpperCase(),
            email: newEmail1
         });
         await expectValidationError(page, "username", "Username already exists");

         // Test 2: Email conflict with case sensitivity and whitespace
         await navigateToPath(page, REGISTER_ROUTE);
         const { username: newUsername2 } = generateTestCredentials();
         const emailWithWhitespace = `  ${originalEmail.toUpperCase()}  `;
         await submitForm(page, {
            ...VALID_REGISTRATION,
            username: newUsername2,
            email: emailWithWhitespace
         });
         await expectValidationError(page, "email", "Email already exists");

         // Test 3: Both username and email conflict with case variations
         await navigateToPath(page, REGISTER_ROUTE);
         await submitForm(page, {
            ...VALID_REGISTRATION,
            username: `  ${originalUsername.toLowerCase()}  `,
            email: originalEmail.toUpperCase()
         });
         await expectValidationError(page, "username", "Username already exists");
         await expectValidationError(page, "email", "Email already exists");
      });
   });

});