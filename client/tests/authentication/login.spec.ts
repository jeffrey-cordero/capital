import { expect, test } from "@tests/fixtures";
import { assertComponentIsVisible, assertInputVisibility } from "@tests/utils";
import { createUser, DASHBOARD_ROUTE, LOGIN_ROUTE, REGISTER_ROUTE } from "@tests/utils/authentication";
import { assertValidationErrors, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { assertPasswordVisibilityToggle } from "@tests/utils/password";
import { createValidLogin, INVALID_PASSWORD_CASES, VALID_LOGIN } from "capital/mocks/user";

test.describe("Login Authentication", () => {
   test.beforeEach(async({ page }) => {
      await navigateToPath(page, LOGIN_ROUTE);
   });

   test.describe("UI Components and Layout", () => {
      test("should display login page with all required elements", async({ page }) => {
         // Assert that all form fields are present
         await assertInputVisibility(page, "username", "Username");
         await assertInputVisibility(page, "password", "Password");
         await assertComponentIsVisible(page, "submit-button", "Login");

         // Assert that the navigation link directs user to the registration page
         await assertComponentIsVisible(page, "register-link", "Register");
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

      test("should successfully authenticate with valid credentials and session persistence", async({ page, usersRegistry }) => {
         // Register the test user using the default test credentials
         const { username } = await createUser(page, {}, false, usersRegistry);

         // Submit the login form with the test user's credentials
         await submitForm(page, { ...VALID_LOGIN, username });

         // Assert that the user is redirected to the dashboard and session persists after reloading the page
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
         await page.reload();
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });

      test("should successfully authenticate with a case-insensitive username", async({ page, usersRegistry }) => {
         // Create a test user with a lowercase username
         const { username: generatedUsername } = createValidLogin();
         const { username } = await createUser(page, { username: generatedUsername.toLowerCase() }, false, usersRegistry);

         // Submit the login form with the case-sensitive username
         await submitForm(page, { ...VALID_LOGIN, username: username.toUpperCase() });

         // Assert that the user is redirected to the dashboard and session persists after reloading the page
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
         await page.reload();
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
      });
   });
});