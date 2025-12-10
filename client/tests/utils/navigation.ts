import { expect, type Locator, type Page } from "@playwright/test";
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
 * Opens the sidebar if it's not already open
 *
 * @param {Page} page - Playwright page instance
 */
export async function openSidebar(page: Page): Promise<void> {
   const sidebarToggle: Locator = page.getByTestId("sidebar-toggle");
   const sidebarOpen: boolean = await sidebarToggle.getAttribute("data-sidebar-open") === "true";

   if (!sidebarOpen) {
      await sidebarToggle.click();
   }
}

/**
 * Opens sidebar and clicks the specified element
 *
 * @param {Page} page - Playwright page instance
 * @param {string} testId - The test ID of the element to click
 */
export async function clickSidebarLink(page: Page, testId: string): Promise<void> {
   await openSidebar(page);

   const link: Locator = page.getByTestId(testId);
   await link.scrollIntoViewIfNeeded();
   await expect(link).toBeVisible();
   await link.click({ force: true });
   await expect(link).toBeHidden();
}

/**
 * Navigates to the specified path via sidebar or direct navigation
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