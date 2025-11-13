import { expect, type Page } from "@playwright/test";
import type { CreatedUserRecord } from "@tests/fixtures";
import { assertComponentVisible } from "@tests/utils";
import { submitForm } from "@tests/utils/forms";
import { clickSidebarLink, navigateToPath } from "@tests/utils/navigation";
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
 * Creates a test user by registering them with unique credentials
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<RegisterPayload>} overrides - Optional overrides for registration data
 * @param {boolean} keepLoggedIn - Whether to keep the user logged in after registration (defaults to `true`)
 * @param {Set<CreatedUserRecord>} usersRegistry - Set of created test users to collect for the worker's final cleanup
 * @param {boolean} isTestScoped - Whether to mark the user as test-scoped (prevents future reuse)
 * @returns {Promise<{ username: string; email: string; password: string; isTestScoped?: boolean }>} The unique credentials used for registration (username, email, and password) and whether the user is test-scoped
 */
export async function createUser(
   page: Page,
   overrides: Partial<RegisterPayload> = {},
   keepLoggedIn: boolean = true,
   usersRegistry: Set<CreatedUserRecord>,
   isTestScoped: boolean = false
): Promise<{ username: string; email: string; password: string; isTestScoped?: boolean }> {
   await navigateToPath(page, REGISTER_ROUTE);

   const credentials = generateTestCredentials();
   const registrationData = { ...VALID_REGISTRATION, ...credentials, ...overrides };

   // Wait for the submit button to be visible before submitting the registration form
   await assertComponentVisible(page, "submit-button");
   await submitForm(page, registrationData);
   await expect(page).toHaveURL(DASHBOARD_ROUTE);
   await expect(page.getByTestId("accounts-trends-container")).toBeVisible();

   if (!keepLoggedIn) {
      // Logout the created user, which is typically used for intermediate test users
      await clickSidebarLink(page, "sidebar-logout");
      await expect(page).toHaveURL(LOGIN_ROUTE);
      await assertComponentVisible(page, "username");
   }

   // Add the created user to the registry for the worker's final cleanup
   usersRegistry.add({ username: registrationData.username, password: registrationData.password, isTestScoped });

   const result: { username: string; email: string; password: string; isTestScoped?: boolean } = {
      username: registrationData.username,
      email: registrationData.email,
      password: registrationData.password,
      isTestScoped
   };

   return result;
}

/**
 * Logs in a user with the provided credentials
 *
 * @param {Page} page - Playwright page instance
 * @param {string} username - Username for login
 * @param {string} password - Password for login
 */
export async function loginUser(page: Page, username: string, password: string): Promise<void> {
   await navigateToPath(page, LOGIN_ROUTE);

   // Wait for the submit button to be visible before submitting the login form
   await assertComponentVisible(page, "submit-button");
   await submitForm(page, { username, password });
   await expect(page).toHaveURL(DASHBOARD_ROUTE);
   await expect(page.getByTestId("accounts-trends-container")).toBeVisible();
}

/**
 * Performs a user logout operation through the sidebar or settings interface
 *
 * @param {Page} page - Playwright page instance
 * @param {"sidebar" | "settings"} method - The logout method to use (`"sidebar"` or `"settings"`)
 */
export async function logoutUser(page: Page, method: "sidebar" | "settings"): Promise<void> {
   // Ensure the current user is within a protected route before attempting to logout
   expect(page.url()).toContain(DASHBOARD_ROUTE);

   if (method === "sidebar") {
      await clickSidebarLink(page, "sidebar-logout");
   } else if (method === "settings") {
      await navigateToPath(page, SETTINGS_ROUTE);
      await page.getByTestId("settings-logout").click();
      await page.getByTestId("settings-logout-confirm").click();
   }

   await expect(page).toHaveURL(LOGIN_ROUTE);
   await assertComponentVisible(page, "username");
}

/**
 * Deletes created test users via API calls
 *
 * @param {Page} page - Playwright page instance for API requests
 * @param {Set<CreatedUserRecord>} usersToCleanup - Set of created test users to delete
 */
async function deleteCreatedUsers(page: Page, usersToCleanup: Set<CreatedUserRecord>): Promise<void> {
   // If no test users were created, skip the cleanup process
   if (usersToCleanup.size === 0) {
      return;
   }

   // Fetch the server URL from the environment variable
   const serverUrl: string = process.env.VITE_SERVER_URL || "http://localhost:8000/api/v1";

   for (const user of usersToCleanup) {
      // Clear cookies before each attempt to ensure an isolated state for the browser
      await page.context().clearCookies();
      await page.reload();

      // Login via the API to initiate a session
      await page.request.post(`${serverUrl}/authentication/login`, {
         data: { username: user.username, password: user.password }
      });

      // Delete the test user via the API
      await page.request.delete(`${serverUrl}/users`);
   }

   // Remove all created test users from the registry for the worker's final cleanup
   usersToCleanup.clear();
}

/**
 * Cleans up created users from a worker-scoped registry using an isolated browser
 *
 * @param {Set<CreatedUserRecord>} usersRegistry - Set of created test users to clean up
 */
export async function cleanupCreatedTestUsers(usersRegistry: Set<CreatedUserRecord>): Promise<void> {
   // Create the isolated browser environment
   const { chromium } = await import("@playwright/test");
   const browser = await chromium.launch({ headless: true });
   const page = await browser.newPage();

   // Remove the created test users from the database
   await deleteCreatedUsers(page, usersRegistry);

   // Close the isolated browser environment
   await browser.close();
}