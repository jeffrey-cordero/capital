import { expect, type Page } from "@playwright/test";
import type { CreatedUserRecord } from "@tests/fixtures";
import { assertComponentIsVisible, assertInputVisibility } from "@tests/utils";
import { submitForm } from "@tests/utils/forms";
import { clickSidebarLink, navigateToPath } from "@tests/utils/navigation";
import { generateTestCredentials, VALID_REGISTRATION } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";
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
 * @param {boolean} keepLoggedIn - Whether to keep user logged in after registration
 * @param {Set<CreatedUserRecord>} usersRegistry - Set of created test users to collect for the worker's final cleanup
 * @param {boolean} isTestScoped - Whether to mark the user as test-scoped (prevents future reuse)
 * @returns {Promise<{ username: string; email: string; password: string; isTestScoped?: boolean }>} The unique credentials used for registration and whether the user is test-scoped
 * @throws {Error} If user creation fails
 */
export async function createUser(
   page: Page,
   overrides: Partial<RegisterPayload> = {},
   keepLoggedIn: boolean = true,
   usersRegistry: Set<CreatedUserRecord>,
   isTestScoped: boolean = false
): Promise<CreatedUserRecord> {
   // Retry a registration attempt up to 3 times with varying username substrings as many users may require full isolation for testing
   const MAX_RETRIES: number = 3;
   const usernames: Set<string> = new Set(Array.from(usersRegistry).map(u => u.username));

   let userRecord: CreatedUserRecord | undefined;

   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      await navigateToPath(page, REGISTER_ROUTE);
      await assertComponentIsVisible(page, "submit-button");

      const credentials = generateTestCredentials();

      for (let i = 30; i >= 2; i--) {
         // Keep generating a substring from the generated username until a unique one is found
         const username: string = credentials.username.slice(0, i);

         if (!usernames.has(username)) {
            credentials.username = username;
            break;
         }
      }

      const registrationData: RegisterPayload = { ...VALID_REGISTRATION, ...credentials, ...overrides };
      const responsePromise =  page.waitForResponse(
         response => response.url().includes("/api/v1/users") && response.request().method() === "POST"
      );
      await submitForm(page, registrationData);
      const response = await responsePromise;

      if (response.status() === HTTP_STATUS.CREATED) {
         await assertComponentIsVisible(page, "accounts-trends-container");

         if (!keepLoggedIn) {
            await clickSidebarLink(page, "sidebar-logout");
            await expect(page).toHaveURL(LOGIN_ROUTE);
            await assertInputVisibility(page, "username", "Username");
         }

         userRecord = { ...registrationData, isTestScoped };
         usersRegistry.add(userRecord);
         break;
      } else if (response.status() === HTTP_STATUS.CONFLICT) {
         if (attempt === MAX_RETRIES) {
            throw new Error("User creation failed after maximum retries due to username conflicts or invalid data");
         }

         continue;
      } else {
         throw new Error(`User registration failed with unexpected response status: ${response.status()}`);
      }
   }

   if (userRecord === undefined) {
      throw new Error("User creation failed after maximum retries due to unexpected errors");
   }

   return userRecord;
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

   await assertComponentIsVisible(page, "submit-button");
   await submitForm(page, { username, password });
   await expect(page).toHaveURL(DASHBOARD_ROUTE);
   await assertComponentIsVisible(page, "accounts-trends-container");
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
   await assertInputVisibility(page, "username", "Username");
}

/**
 * Deletes created test users via API calls
 *
 * @param {Page} page - Playwright page instance for API requests
 * @param {Set<CreatedUserRecord>} usersToCleanup - Set of created test users to delete
 */
async function deleteCreatedUsers(page: Page, usersToCleanup: Set<CreatedUserRecord>): Promise<void> {
   if (usersToCleanup.size === 0) {
      return;
   }

   const serverUrl: string = process.env.VITE_SERVER_URL || "http://localhost:8000/api/v1";

   for (const user of usersToCleanup) {
      // Clear cookies before each attempt to ensure an isolated state for the browser
      await page.context().clearCookies();
      await page.reload();

      await page.request.post(`${serverUrl}/authentication/login`, {
         data: { username: user.username, password: user.password }
      });

      await page.request.delete(`${serverUrl}/users`);
   }

   usersToCleanup.clear();
}

/**
 * Cleans up created users from a worker-scoped registry using an isolated browser
 *
 * @param {Set<CreatedUserRecord>} usersRegistry - Set of created test users to clean up
 */
export async function cleanupCreatedTestUsers(usersRegistry: Set<CreatedUserRecord>): Promise<void> {
   const { chromium } = await import("@playwright/test");
   const browser = await chromium.launch({ headless: true });
   const page = await browser.newPage();

   await deleteCreatedUsers(page, usersRegistry);

   await browser.close();
}