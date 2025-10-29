import { expect, type Page } from "@playwright/test";
import type { CreatedUserRecord } from "@tests/fixtures";
import { submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { generateTestCredentials, VALID_REGISTRATION } from "capital/mocks/user";
import type { RegisterPayload } from "capital/user";

/**
 * Route constants for public pages
 */
export const ROOT_ROUTE = "/";
export const LOGIN_ROUTE = "/login";
export const REGISTER_ROUTE = "/register";
export const UNVERIFIED_ROUTES = [ROOT_ROUTE, LOGIN_ROUTE, REGISTER_ROUTE] as const;

/**
 * Route constants for protected pages
 */
export const DASHBOARD_ROUTE = "/dashboard";
export const ACCOUNTS_ROUTE = "/dashboard/accounts";
export const BUDGETS_ROUTE = "/dashboard/budgets";
export const SETTINGS_ROUTE = "/dashboard/settings";
export const VERIFIED_ROUTES = [DASHBOARD_ROUTE, ACCOUNTS_ROUTE, BUDGETS_ROUTE, SETTINGS_ROUTE] as const;

/**
 * Creates a test user by registering one with unique credentials
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<RegisterPayload>} overrides - Optional overrides for registration data
 * @param {boolean} keepLoggedIn - Whether to keep the user logged in after registration (defaults to `true`)
 * @param {Set<{ username: string; password: string; }>} registry - Registry to auto-collect created users for final cleanup
 * @returns {Promise<{ username: string; email: string }>} The unique credentials used for registration (username and email)
 */
export async function createUser(
   page: Page,
   overrides: Partial<RegisterPayload> = {},
   keepLoggedIn: boolean = true,
   registry: Set<CreatedUserRecord>
): Promise<{ username: string; email: string }> {
   await navigateToPath(page, REGISTER_ROUTE);

   const credentials = generateTestCredentials();
   const registrationData = { ...VALID_REGISTRATION, ...credentials, ...overrides };

   // Wait for the submit button to be visible before submitting the registration form
   await page.getByTestId("submit-button").waitFor({ state: "visible" });
   await submitForm(page, registrationData);
   await expect(page).toHaveURL(DASHBOARD_ROUTE);

   if (!keepLoggedIn) {
      // Logout the user, which is typically used for intermediate mock users
      await page.getByTestId("sidebar-toggle").click();
      await page.getByTestId("sidebar-logout").click();
      await expect(page).toHaveURL(LOGIN_ROUTE);
   }

   // Auto-register created user for final cleanup
   registry.add({ username: registrationData.username, password: registrationData.password });

   return {
      username: registrationData.username,
      email: registrationData.email
   };
}

/**
 * Performs a user logout operation through the sidebar or settings interface
 *
 * @param {Page} page - Playwright page instance
 * @param {"sidebar" | "settings"} method - The logout method to use (`"sidebar"` or `"settings"`)
 */
export async function logoutUser(page: Page, method: "sidebar" | "settings"): Promise<void> {
   // Ensure the user is currently within a protected route before logging out
   expect(page.url()).toContain(DASHBOARD_ROUTE);

   if (method === "sidebar") {
      await page.getByTestId("sidebar-toggle").click();
      await page.getByTestId("sidebar-logout").click();
   } else if (method === "settings") {
      await navigateToPath(page, SETTINGS_ROUTE);
      await page.getByRole("button", { name: "Logout" }).click();
      await page.getByTestId("settings-logout-confirm").click();
   }

   await expect(page).toHaveURL(LOGIN_ROUTE);
}

/**
 * Cleans up users from a worker-scoped registry using an isolated browser for final cleanup
 *
 * @param {Set<CreatedUserRecord>} registry - Worker-scoped set of created users
 */
export async function cleanupUsersWithIsolatedBrowser(registry: Set<CreatedUserRecord>): Promise<void> {
   const users: Array<CreatedUserRecord> = Array.from(registry);

   // Create the isolated browser for final cleanup
   const { chromium } = await import("@playwright/test");
   const browser = await chromium.launch();
   const page = await browser.newPage();

   // Cleanup the users using the isolated browser
   try {
      await cleanupCreatedUsers(page, users);
   } finally {
      // Close the isolated browser and remove all created users from the registry
      await browser.close();
      registry.clear();
   }
}

/**
 * Deletes users created during tests via API calls
 * Call this in test.afterAll with the array of users to clean up
 *
 * @param {Page} page - Playwright page instance for API requests
 * @param {Array<{ username: string; password: string; }>} usersToCleanup - Array of user credentials to delete
 */
export async function cleanupCreatedUsers(page: Page, usersToCleanup: Array<CreatedUserRecord>): Promise<void> {
   // If no users were created, skip cleanup
   if (usersToCleanup.length === 0) {
      return;
   }

   // Use VITE_SERVER_URL environment variable for API calls
   const serverUrl = process.env.VITE_SERVER_URL || "http://localhost:8000/api/v1";

   for (const user of usersToCleanup) {
      // Clear cookies before each attempt to ensure clean state
      await page.context().clearCookies();
      await page.reload();

      // Login via API to get session cookie
      await page.request.post(`${serverUrl}/authentication/login`, {
         data: { username: user.username, password: user.password }
      });

      // Delete user via API
      await page.request.delete(`${serverUrl}/users`);
   }
}