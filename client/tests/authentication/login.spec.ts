import { expect, test } from "@tests/fixtures";
import {
   cleanupUsersWithIsolatedBrowser,
   createUser,
   DASHBOARD_ROUTE,
   LOGIN_ROUTE,
   REGISTER_ROUTE
} from "@tests/utils/authentication";
import { assertValidationErrors, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { assertPasswordVisibilityToggle } from "@tests/utils/password";
import { createValidLogin, INVALID_PASSWORD_CASES, VALID_LOGIN } from "capital/mocks/user";

test.describe("Login Authentication", () => {
   test.beforeEach(async({ page }) => {
      await navigateToPath(page, LOGIN_ROUTE);
   });

   test.afterAll(async({ createdUsersRegistry }) => {
      await cleanupUsersWithIsolatedBrowser(createdUsersRegistry);
   });

   test.describe("UI Components and Layout", () => {
      test("should display login page with all required elements", async({ page }) => {
         // Verify all form fields are present
         await expect(page.getByTestId("username")).toBeVisible();
         await expect(page.getByTestId("password")).toBeVisible();
         await expect(page.getByTestId("submit-button")).toBeVisible();

         // Verify the navigation link to the registration page
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
         await assertValidationErrors(page, {
            username: "Username is required",
            password: "Password is required"
         });
      });

      test("should validate username minimum length requirement", async({ page }) => {
         await submitForm(page, { ...VALID_LOGIN, username: "a" });
         await assertValidationErrors(page, { username: "Username must be at least 2 characters" });
      });

      test("should validate username maximum length requirement", async({ page }) => {
         await submitForm(page, { ...VALID_LOGIN, username: "a".repeat(31) });
         await assertValidationErrors(page, { username: "Username must be at most 30 characters" });
      });

      test("should validate username allowed characters requirement", async({ page }) => {
         await submitForm(page, { ...VALID_LOGIN, username: "invalid@user!" });
         await assertValidationErrors(page, { username: "Username may only contain letters, numbers, underscores, and hyphens" });
      });
   });

   INVALID_PASSWORD_CASES.forEach(({ name, password, expected }: { name: string; password: string; expected: string }) => {
      test(`should validate password complexity: ${name}`, async({ page }) => {
         await submitForm(page, { ...VALID_LOGIN, password });
         await assertValidationErrors(page, { password: expected });
      });
   });

   test.describe("Authentication Flow", () => {
      test("should reject invalid credentials", async({ page }) => {
         await submitForm(page, { username: "missingUsername", password: "WrongPassword123!" });
         await assertValidationErrors(page, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });

      test("should successfully authenticate with valid credentials and session persistence", async({ page, createdUsersRegistry }) => {
         // Register the test user using the default test credentials
         const { username } = await createUser(page, {}, false, createdUsersRegistry);

         // Login with the test user's credentials
         await navigateToPath(page, LOGIN_ROUTE);
         await submitForm(page, { ...VALID_LOGIN, username });

         // Verify successful authentication and automatic redirection to the dashboard
         await expect(page).toHaveURL(DASHBOARD_ROUTE);

         // Reload the page to verify session persistence
         await page.reload();
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });

      test("should handle case-insensitive username login", async({ page, createdUsersRegistry }) => {
         // Register the test user with a lowercase username
         const { username: generatedUsername } = createValidLogin();
         const { username } = await createUser(page, { username: generatedUsername.toLowerCase() }, false, createdUsersRegistry);

         // Attempt to login with case-sensitive username mismatch
         await navigateToPath(page, LOGIN_ROUTE);
         await submitForm(page, { ...VALID_LOGIN, username: username.toUpperCase() });

         // Verify successful authentication and automatic redirection to the dashboard
         await expect(page).toHaveURL(DASHBOARD_ROUTE);

         // Reload the page to verify session persistence
         await page.reload();
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });
   });
});