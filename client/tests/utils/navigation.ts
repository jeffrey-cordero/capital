import { expect, type Page } from "@playwright/test";
import { DASHBOARD_ROUTE, LOGIN_ROUTE, SETTINGS_ROUTE } from "@tests/utils/authentication";

/**
 * Derives the sidebar link title from a route path
 *
 * @param {string} route - The route path
 * @returns {string} The expected sidebar link title
 */
export function getRouteLinkTitle(route: string): string {
   if (route === "/") return "Home";

   const segments = route.split("/");
   const lastSegment = segments[segments.length - 1];
   return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
}

/**
 * Navigates to the specified path via sidebar navigation
 *
 * @param {Page} page - Playwright page instance
 * @param {string} path - The route path to navigate to
 */
export async function navigateToPath(page: Page, path: string): Promise<void> {
   const linkTitle = getRouteLinkTitle(path);

   // Get current URL to check if we need initial navigation
   const currentUrl = page.url();
   const baseUrl = currentUrl.includes("localhost") ? currentUrl.split("/").slice(0, 3).join("/") : "";
   const isInitialNavigation = !currentUrl.includes("localhost") || currentUrl === "about:blank";

   // If this is the initial navigation, use page.goto first to load the app
   if (isInitialNavigation || currentUrl === baseUrl) {
      await page.goto(path, { waitUntil: "networkidle" });
      return;
   }

   // Open the sidebar
   await page.getByTestId("sidebar-toggle").click();

   // Click the appropriate sidebar link
   const link = page.getByTestId(`sidebar-link-${linkTitle.toLowerCase()}`);
   await link.click();

   // Wait for navigation to complete
   await expect(page).toHaveURL(path);
}

/**
 * Performs user logout operation through various interfaces
 *
 * @param {Page} page - Playwright page instance
 * @param {"sidebar" | "settings"} method - The logout method to use
 */
export async function logoutUser(page: Page, method: "sidebar" | "settings"): Promise<void> {
   // Ensure we are on the dashboard page before logging out
   await expect(page).toHaveURL(DASHBOARD_ROUTE);

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