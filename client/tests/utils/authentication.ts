import { expect, type Page } from "@playwright/test";
import { submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { generateTestCredentials, VALID_REGISTRATION } from "capital/mocks/user";
import type { RegisterPayload } from "capital/user";

/**
 * Route constants for unauthenticated (public) pages
 */
export const ROOT_ROUTE = "/";
export const LOGIN_ROUTE = "/login";
export const REGISTER_ROUTE = "/register";
export const UNVERIFIED_ROUTES = [ROOT_ROUTE, LOGIN_ROUTE, REGISTER_ROUTE] as const;

/**
 * Route constants for authenticated (protected) pages
 */
export const DASHBOARD_ROUTE = "/dashboard";
export const ACCOUNTS_ROUTE = "/dashboard/accounts";
export const BUDGETS_ROUTE = "/dashboard/budgets";
export const SETTINGS_ROUTE = "/dashboard/settings";
export const VERIFIED_ROUTES = [DASHBOARD_ROUTE, ACCOUNTS_ROUTE, BUDGETS_ROUTE, SETTINGS_ROUTE] as const;

/**
 * Creates a test user by registering with unique credentials
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<RegisterPayload>} overrides - Optional overrides for registration data
 * @param {boolean} keepLoggedIn - Whether to keep the user logged in after registration
 * @returns {Promise<{ username: string; email: string }>} The credentials used for registration
 */
export async function createUser(
   page: Page,
   overrides: Partial<RegisterPayload> = {},
   keepLoggedIn: boolean = true
): Promise<{ username: string; email: string }> {
   const credentials = generateTestCredentials();
   const registrationData = { ...VALID_REGISTRATION, ...credentials, ...overrides };

   await navigateToPath(page, REGISTER_ROUTE);
   // Wait for the form to be ready
   await page.getByTestId("submit-button").waitFor({ state: "visible" });
   await submitForm(page, registrationData);
   await expect(page).toHaveURL(DASHBOARD_ROUTE);

   if (!keepLoggedIn) {
      // Logout the user, typically used to create mock users for testing
      await page.getByTestId("sidebar-toggle").click();
      await page.getByTestId("sidebar-logout").click();
      await expect(page).toHaveURL(LOGIN_ROUTE);
   }

   return {
      username: registrationData.username,
      email: registrationData.email
   };
}