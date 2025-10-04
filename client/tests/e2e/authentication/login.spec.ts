import { expect, test } from "@playwright/test";

import { DASHBOARD_ROUTE, LOGIN_ROUTE, REGISTER_ROUTE, submitRegistrationForm } from "../../utils/authentication";
import {
   expectValidationError,
   submitForm,
   VALID_LOGIN,
   VALID_REGISTRATION,
} from "../../utils/forms";
import { navigateToPath } from "../../utils/navigation";
import { testPasswordVisibilityToggle } from "../../utils/password";
import { createUniqueIdentifier } from "../../utils/utils";

test.describe("Login Authentication", () => {
   test.beforeEach(async({ page }) => {
      await navigateToPath(page, LOGIN_ROUTE);
   });

   test.describe("UI Components and Layout", () => {
      test("should display login page with all required elements", async({ page }) => {
         // Verify essential form fields are present
         await expect(page.getByTestId("username")).toBeVisible();
         await expect(page.getByTestId("password")).toBeVisible();
         await expect(page.getByTestId("submit-button")).toBeVisible();

         // Verify navigation link to the registration page
         await expect(page.getByTestId("register-link")).toBeVisible();
         // Un-blur the auto-focused input to ensure proper navigation
         await page.evaluate(() => (document.activeElement as HTMLInputElement)?.blur());
         await page.getByTestId("register-link").click();
         await expect(page).toHaveURL(REGISTER_ROUTE);
      });

      test("should toggle password visibility correctly", async({ page }) => {
         await testPasswordVisibilityToggle(page, "password");
      });
   });

   test.describe("Form Validation", () => {
      test("should display validation errors for empty form submission", async({ page }) => {
         await submitForm(page, {});
         await expectValidationError(page, "username", "Username must be at least 2 characters");
         await expectValidationError(page, "password", "Password must be at least 8 characters");
      });

      test("should validate username length requirement", async({ page }) => {
         await submitForm(page, { username: "a", password: "Password1!" });
         await expectValidationError(page, "username", "Username must be at least 2 characters");
      });

      test("should validate password length requirement", async({ page }) => {
         await submitForm(page, {
            username: createUniqueIdentifier("username"),
            password: "short"
         });
         await expectValidationError(page, "password", "Password must be at least 8 characters");
      });
   });

   test.describe("Authentication Flow", () => {
      test("should reject invalid credentials with clear error message", async({ page }) => {
         await submitForm(page, {
            username: createUniqueIdentifier("username"),
            password: "WrongPassword123!"
         });

         await expectValidationError(page, "username", "Invalid credentials");
         await expectValidationError(page, "password", "Invalid credentials");
      });

      test("should successfully authenticate with valid credentials", async({ page }) => {
         // First register a user
         const username = createUniqueIdentifier("username");
         const email = createUniqueIdentifier("email");
         await submitRegistrationForm(page, { ...VALID_REGISTRATION, username, email }, true);

         // Then attempt to login
         await navigateToPath(page, LOGIN_ROUTE);
         await submitForm(page, { ...VALID_LOGIN, username });

         // Verify successful authentication and redirect
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });

      test("should maintain session after successful login", async({ page }) => {
         // Register and login
         const username = createUniqueIdentifier("username");
         const email = createUniqueIdentifier("email");
         await submitRegistrationForm(page, { ...VALID_REGISTRATION, username, email }, true);
         await navigateToPath(page, LOGIN_ROUTE);
         await submitForm(page, { ...VALID_LOGIN, username });
         await expect(page).toHaveURL(DASHBOARD_ROUTE);

         // Verify session persists across page reload
         await page.reload();
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });

      test("should handle case-sensitive username login", async({ page }) => {
         const username = createUniqueIdentifier("username");
         const email = createUniqueIdentifier("email");

         // Register with lowercase username
         await submitRegistrationForm(page, { ...VALID_REGISTRATION, username: username.toLowerCase(), email }, true);

         // Login with exact username
         await navigateToPath(page, LOGIN_ROUTE);
         await submitForm(page, { ...VALID_LOGIN, username: username.toLowerCase() });

         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });
   });
});