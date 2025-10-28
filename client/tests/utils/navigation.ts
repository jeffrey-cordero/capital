import { type Page } from "@playwright/test";

import { ROOT_ROUTE } from "./authentication";

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
      await page.getByTestId("sidebar-toggle").click();
      await page.getByTestId(`sidebar-link-${linkTitle.toLowerCase()}`).click();
   }

   // Wait for the navigation to fully complete before returning
   await page.waitForURL(path, { waitUntil: "networkidle" });
}