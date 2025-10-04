import { expect, type Page, test } from "@playwright/test";

import { DASHBOARD_ROUTE, LOGIN_ROUTE, REGISTER_ROUTE, submitRegistrationForm } from "../../utils/authentication";
import { expectValidationError, submitForm, VALID_LOGIN, VALID_REGISTRATION } from "../../utils/forms";
import { navigateToPath } from "../../utils/navigation";
import { getPasswordToggleButton, testPasswordVisibilityToggle } from "../../utils/password";
import { createUniqueIdentifier } from "../../utils/utils";

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
   const username = createUniqueIdentifier("username");
   const email = createUniqueIdentifier("email");
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
         const username = createUniqueIdentifier("username");
         const email = createUniqueIdentifier("email");
         await submitRegistrationForm(page, { ...VALID_REGISTRATION, username, email });

         // Verify session persists across page reload
         await page.reload();
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });
   });

   test.describe("Email Conflict Handling", () => {
      test("should prevent duplicate email registration", async({ page }) => {
         const username = createUniqueIdentifier("username");
         const email = createUniqueIdentifier("email");

         // First registration should succeed and log out the user
         await submitRegistrationForm(page, { ...VALID_REGISTRATION, username, email }, true);

         // Second registration with same email should fail
         await navigateToPath(page, REGISTER_ROUTE);
         await submitForm(page, { ...VALID_REGISTRATION, username, email });
         await expectValidationError(page, "email", "Email already exists");
      });

      test("should handle email normalization and case sensitivity", async({ page }) => {
         const username = createUniqueIdentifier("username");
         const baseEmail = createUniqueIdentifier("email");
         const emailWithWhitespace = `  ${baseEmail.toUpperCase()}  `;

         // Register with email containing whitespace and different case
         await submitRegistrationForm(page, { ...VALID_REGISTRATION, username, email: emailWithWhitespace }, true);

         // Attempt to register with normalized version
         await navigateToPath(page, REGISTER_ROUTE);
         await submitForm(page, { ...VALID_REGISTRATION, username, email: baseEmail.toLowerCase() });
         await expectValidationError(page, "email", "Email already exists");
      });
   });

});