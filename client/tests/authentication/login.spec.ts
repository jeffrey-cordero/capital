import { expect, test } from "@playwright/test";
import { createUser, DASHBOARD_ROUTE, LOGIN_ROUTE, REGISTER_ROUTE } from "@tests/utils/authentication";
import { assertValidationError, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { assertPasswordVisibilityToggle } from "@tests/utils/password";
import { createValidLogin, VALID_LOGIN } from "capital/mocks/user";

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
         await page.getByTestId("register-link").click();
         await expect(page).toHaveURL(REGISTER_ROUTE);
      });

      test("should toggle password visibility correctly", async({ page }) => {
         await assertPasswordVisibilityToggle(page, "password");
      });
   });

   test.describe("Form Validation", () => {
      test("should display validation errors for empty form submission", async({ page }) => {
         await submitForm(page, {});
         await assertValidationError(page, "username", "Username is required");
         await assertValidationError(page, "password", "Password is required");
      });

      test("should validate username length requirement", async({ page }) => {
         await submitForm(page, { username: "a", password: "Password1!" });
         await assertValidationError(page, "username", "Username must be at least 2 characters");
      });

      test("should validate password length requirement", async({ page }) => {
         const { username } = createValidLogin();
         await submitForm(page, {
            username,
            password: "short"
         });
         await assertValidationError(page, "password", "Password must be at least 8 characters");
      });
   });

   test.describe("Authentication Flow", () => {
      test("should reject invalid credentials with clear error message", async({ page }) => {
         const { username } = createValidLogin();
         await submitForm(page, {
            username,
            password: "WrongPassword123!"
         });

         await assertValidationError(page, "username", "Invalid credentials");
         await assertValidationError(page, "password", "Invalid credentials");
      });

      test("should successfully authenticate with valid credentials", async({ page }) => {
         // First register a user
         const { username } = await createUser(page, {}, false);

         // Then attempt to login
         await navigateToPath(page, LOGIN_ROUTE);
         await submitForm(page, { ...VALID_LOGIN, username });

         // Verify successful authentication and redirect
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });

      test("should maintain session after successful login", async({ page }) => {
         // Register and login
         const { username } = await createUser(page, {}, false);
         await navigateToPath(page, LOGIN_ROUTE);
         await submitForm(page, { ...VALID_LOGIN, username });
         await expect(page).toHaveURL(DASHBOARD_ROUTE);

         // Verify session persists across page reload
         await page.reload();
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });

      test("should handle case-sensitive username login", async({ page }) => {
         // Register with lowercase username
         const { username: generatedUsername } = createValidLogin();
         const lowercaseUsername = generatedUsername.toLowerCase();
         const { username } = await createUser(page, { username: lowercaseUsername }, false);

         // Login with exact username
         await navigateToPath(page, LOGIN_ROUTE);
         await submitForm(page, { ...VALID_LOGIN, username: username.toLowerCase() });

         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });
   });
});