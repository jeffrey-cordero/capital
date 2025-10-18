import { expect, type Page } from "@playwright/test";
import {
   DASHBOARD_ROUTE,
   LOGIN_ROUTE,
   SETTINGS_ROUTE,
   UNVERIFIED_ROUTES,
   VERIFIED_ROUTES
} from "@tests/utils/authentication";

/**
 * Navigates to the specified path and waits for navigation to complete, waits
 * until network is idle to ensure all resources are loaded before proceeding
 *
 * @param {Page} page - Playwright page instance
 * @param {string} path - The route path to navigate to
 * @returns {Promise<void>}
 */
export const navigateToPath = async(page: Page, path: string): Promise<void> => {
   await page.goto(path, { waitUntil: "networkidle" });
};

/**
 * Verifies that a specific sidebar link is marked as active, opens the sidebar,
 * checks that the specified link has the active state, then closes the sidebar
 *
 * @param {Page} page - Playwright page instance
 * @param {string} linkTitle - The title of the link to verify (e.g., "Dashboard", "Login", "Accounts")
 * @returns {Promise<void>}
 */
export const verifySidebarLinkActive = async(page: Page, linkTitle: string): Promise<void> => {
   await page.getByTestId("sidebar-toggle").click();
   const link = page.getByTestId(`sidebar-link-${linkTitle.toLowerCase()}`);
   await expect(link).toBeVisible();
   await expect(link).toHaveAttribute("data-active", "true");

   // Close sidebar to clean up state
   await page.keyboard.press("Escape");
};

/**
 * Tests that all unverified routes redirect to dashboard when user is
 * authenticated, iterates through all public routes and verifies authenticated
 * users are redirected to the dashboard
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<void>}
 */
export const testUnverifiedRouteRedirects = async(page: Page): Promise<void> => {
   for (const path of UNVERIFIED_ROUTES) {
      await navigateToPath(page, path);
      await expect(page).toHaveURL(DASHBOARD_ROUTE);
   }
};

/**
 * Performs user logout operation through various interfaces, supports logout via
 * sidebar or settings page, verifying the user is on the dashboard before logout
 * and redirected to root after
 *
 * @param {Page} page - Playwright page instance
 * @param {"sidebar" | "settings"} method - The logout method to use
 * @returns {Promise<void>}
 */
export const logoutUser = async(page: Page, method: "sidebar" | "settings"): Promise<void> => {
   // Ensure we are on the dashboard page before logging out
   await expect(page).toHaveURL(DASHBOARD_ROUTE);
   await verifySidebarLinkActive(page, "Dashboard");

   if (method === "sidebar") {
      // Logout via the sidebar navigation (need to reopen since verification closed it)
      await page.getByTestId("sidebar-toggle").click();
      await page.getByTestId("sidebar-logout").click();
   } else if (method === "settings") {
      // Logout via the settings page
      await navigateToPath(page, SETTINGS_ROUTE);
      await page.getByRole("button", { name: "Logout" }).click();
      await page.getByTestId("settings-logout-confirm").click();
   }

   // Verify logout was successful by checking redirect to the login page
   await expect(page).toHaveURL(LOGIN_ROUTE);
};

/**
 * Verifies route redirects based on authentication state, for verified routes:
 * verifies unauthenticated users are redirected to dashboard, for unverified
 * routes: verifies authenticated users are redirected to login page
 *
 * @param {Page} page - Playwright page instance
 * @param {"verified" | "unverified"} type - The type of routes to test
 * @returns {Promise<void>}
 */
export const testRouteRedirects = async(page: Page, type: "verified" | "unverified"): Promise<void> => {
   const routes = type === "verified" ? UNVERIFIED_ROUTES : VERIFIED_ROUTES;
   const redirectRoute = type === "verified" ? DASHBOARD_ROUTE : LOGIN_ROUTE;

   for (const path of routes) {
      await navigateToPath(page, path);
      await expect(page).toHaveURL(redirectRoute);
   }
};