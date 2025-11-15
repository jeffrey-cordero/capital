import { expect, test } from "@tests/fixtures";
import { assertComponentIsVisible, assertInputVisibility } from "@tests/utils";
import { createUser, DASHBOARD_ROUTE, LOGIN_ROUTE, REGISTER_ROUTE } from "@tests/utils/authentication";
import { assertValidationErrors, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { assertPasswordVisibilityToggle, getPasswordToggleButton } from "@tests/utils/password";
import {
   createUserWithInvalidEmail,
   createUserWithMismatchedPasswords,
   createValidRegistration,
   generateTestCredentials,
   INVALID_PASSWORD_CASES
} from "capital/mocks/user";
import type { RegisterPayload } from "capital/user";

test.describe("User Registration", () => {
   const validRegistration: RegisterPayload = createValidRegistration();

   test.beforeEach(async({ page }) => {
      await navigateToPath(page, REGISTER_ROUTE);
   });

   test.describe("UI Components and Layout", () => {
      test("should display registration page with all required elements", async({ page }) => {
         // Assert that all form fields are present
         await assertInputVisibility(page, "name", "Name");
         await assertInputVisibility(page, "birthday", "Birthday");
         await assertInputVisibility(page, "username", "Username");
         await assertInputVisibility(page, "password", "Password");
         await assertInputVisibility(page, "verifyPassword", "Verify Password");
         await assertInputVisibility(page, "email", "Email");
         await assertComponentIsVisible(page, "submit-button", "Register");

         // Assert that the navigation link directs user to the login page
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

         // Show both password fields
         await confirmPasswordToggle.click();
         await expect(passwordInput).toHaveAttribute("type", "text");
         await expect(confirmPasswordInput).toHaveAttribute("type", "text");

         // Hide password field and keep confirm password visible
         await passwordToggle.click();
         await expect(passwordInput).toHaveAttribute("type", "password");
         await expect(confirmPasswordInput).toHaveAttribute("type", "text");
      });
   });

   test.describe("Form Validation", () => {
      test("should display validation errors for empty form submission", async({ page }) => {
         await submitForm(page, {});
         await assertValidationErrors(page, {
            name: "Name is required",
            birthday: "Birthday is required",
            username: "Username is required",
            email: "Email is required",
            password: "Password is required",
            verifyPassword: "Password is required"
         });
      });

      test("should validate username minimum length requirement", async({ page }) => {
         await submitForm(page, { ...validRegistration, username: "a" });
         await assertValidationErrors(page, { username: "Username must be at least 2 characters" });
      });

      test("should validate username maximum length requirement", async({ page }) => {
         await submitForm(page, { ...validRegistration, username: "a".repeat(31) });
         await assertValidationErrors(page, { username: "Username must be at most 30 characters" });
      });

      test("should validate name minimum length requirement", async({ page }) => {
         await submitForm(page, { ...validRegistration, name: "a" });
         await assertValidationErrors(page, { name: "Name must be at least 2 characters" });
      });

      test("should validate name maximum length requirement", async({ page }) => {
         await submitForm(page, { ...validRegistration, name: "a".repeat(31) });
         await assertValidationErrors(page, { name: "Name must be at most 30 characters" });
      });

      test("should validate birthday too early requirement", async({ page }) => {
         await submitForm(page, { ...validRegistration, birthday: "1776-01-01" });
         await assertValidationErrors(page, { birthday: "Birthday must be on or after 1800-01-01" });
      });

      test("should validate birthday too late requirement", async({ page }) => {
         // Application constraints are based on the Pacific/Kiritimati timezone to avoid global timezone issues
         const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" }));
         const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
         const tomorrowString = tomorrow.toISOString().split("T")[0];

         await submitForm(page, { ...validRegistration, birthday: tomorrowString });
         await assertValidationErrors(page, { birthday: "Birthday cannot be in the future" });
      });

      test("should validate email format", async({ page }) => {
         const invalidEmailTypes = ["noAtSymbol", "noDomain", "noUsername"] as const;

         for (const invalidType of invalidEmailTypes) {
            await submitForm(page, createUserWithInvalidEmail(invalidType));
            await assertValidationErrors(page, { email: "Invalid email address" });
         }
      });

      INVALID_PASSWORD_CASES.forEach(({ name, password, expected }: { name: string; password: string; expected: string }) => {
         test(`should enforce password complexity: ${name}`, async({ page }) => {
            await submitForm(page, { ...validRegistration, password, verifyPassword: password });
            await assertValidationErrors(page, { password: expected });
         });
      });

      test("should validate password confirmation matching", async({ page }) => {
         await submitForm(page, createUserWithMismatchedPasswords());
         await assertValidationErrors(page, { verifyPassword: "Passwords don't match" });
      });
   });

   test.describe("Registration Flow", () => {
      test("should maintain session after successful registration", async({ page, usersRegistry }) => {
         await createUser(page, {}, true, usersRegistry);

         // Assert that the user is redirected to the dashboard
         await expect(page).toHaveURL(DASHBOARD_ROUTE);

         // Reload the page to assert session persistence
         await page.reload();
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });
   });

   test.describe("Duplicate Registration Prevention", () => {
      test("should prevent conflicts with case sensitivity variations", async({ page, usersRegistry }) => {
         // Create the conflicting user and navigate to the registration page
         const { username: originalUsername, email: originalEmail } = await createUser(page, {}, false, usersRegistry);
         await navigateToPath(page, REGISTER_ROUTE);

         // Submit the registration form with a username conflict including case sensitivity and whitespace
         const { email: newEmail1 } = generateTestCredentials();
         const usernameWithWhitespace: string = `  ${originalUsername.toUpperCase()}  `;
         await submitForm(page, {
            ...validRegistration,
            username: usernameWithWhitespace,
            email: newEmail1
         });
         await assertValidationErrors(page, { username: "Username already exists" });

         // Submit the registration form with an email conflict including case sensitivity and whitespace
         const { username: newUsername2 } = generateTestCredentials();
         const emailWithWhitespace = `  ${originalEmail.toUpperCase()}  `;
         await submitForm(page, {
            ...validRegistration,
            username: newUsername2,
            email: emailWithWhitespace
         });
         await assertValidationErrors(page, { email: "Email already exists" });

         // Submit the registration form with both username and email conflicts including case sensitivity and whitespace
         await submitForm(page, {
            ...validRegistration,
            username: usernameWithWhitespace,
            email: emailWithWhitespace
         });
         await assertValidationErrors(page, { username: "Username already exists", email: "Email already exists" });
      });
   });
});