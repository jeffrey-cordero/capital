import { expect, type Page } from "@playwright/test";
import { ROOT_ROUTE } from "@tests/utils/authentication";

/**
 * Derives the sidebar link title from a route path
 *
 * @param {string} route - The route path (e.g. `"/dashboard"`, `"/login"`, `"/register"`, etc.)
 * @returns {string} The expected sidebar link title (e.g. `"Dashboard"`, `"Login"`, `"Register"`, etc.)
 */
export function getRouteLinkTitle(route: string): string {
   if (route === ROOT_ROUTE) return "Home";

   const segments: string[] = route.split("/");
   const lastSegment: string = segments[segments.length - 1];
   return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
}

/**
 * Opens the sidebar if it's not already open and waits for a specific element to be visible before clicking it
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the element to click after opening the sidebar
 */
export async function clickSidebarLink(page: Page, testId: string): Promise<void> {
   const sidebarToggle = page.getByTestId("sidebar-toggle");

   if (await sidebarToggle.isVisible()) {
      // Open the closed sidebar
      await sidebarToggle.click();
   }

   await expect(page.getByTestId(testId)).toBeVisible();
   await page.getByTestId(testId).click();
}

/**
 * Navigates to the specified path via sidebar navigation
 *
 * @param {Page} page - Playwright page instance
 * @param {string} path - The route path to navigate to
 */
export async function navigateToPath(page: Page, path: string): Promise<void> {
   const linkTitle: string = getRouteLinkTitle(path);

   // Get current URL to check if we need the initial navigation
   const currentUrl: string = page.url();
   const baseUrl: string = currentUrl.includes("localhost") ? currentUrl.split("/").slice(0, 3).join("/") : "";
   const isInitialNavigation: boolean = currentUrl === "about:blank" || currentUrl === baseUrl || !currentUrl.includes("localhost");

   if (isInitialNavigation) {
      // Use network-based navigation
      await page.goto(path, { waitUntil: "networkidle" });
   } else {
      // Use sidebar-based navigation
      await clickSidebarLink(page, `sidebar-link-${linkTitle.toLowerCase()}`);
   }

   // Wait for the navigation to fully complete before returning
   await page.waitForURL(path, { waitUntil: "networkidle" });
}