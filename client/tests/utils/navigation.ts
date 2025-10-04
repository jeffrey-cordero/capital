/**
 * Navigation test utilities for routing and page transition testing
 *
 * This module provides helper functions for testing navigation flows,
 * route protection, sidebar interactions, and user logout functionality
 */

import { expect, type Page } from "@playwright/test";

import {
   DASHBOARD_ROUTE,
   LOGIN_ROUTE,
   SETTINGS_ROUTE,
   UNVERIFIED_ROUTES,
   VERIFIED_ROUTES
} from "./authentication";

/**
 * Navigates to the specified path and waits for navigation to complete
 *
 * Waits until network is idle to ensure all resources are loaded before proceeding
 *
 * @param {Page} page - Playwright page instance
 * @param {string} path - The route path to navigate to
 * @returns {Promise<void>}
 */
export const navigateToPath = async(page: Page, path: string): Promise<void> => {
   await page.goto(path, { waitUntil: "networkidle" });
};

/**
 * Verifies that the Home sidebar item is highlighted, indicating current page
 *
 * Checks for the presence of the Home text with primary color styling
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<void>}
 */
export const verifyHomeSidebarHighlight = async(page: Page): Promise<void> => {
   await expect(page.locator(".text-primary", { hasText: "Home" })).toBeVisible();
};

/**
 * Tests that all unverified routes redirect to home when user is authenticated
 *
 * Iterates through all public routes and verifies authenticated users
 * are redirected to the dashboard
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
 * Performs user logout operation through various interfaces
 *
 * Supports logout via sidebar or settings page, verifying the user
 * is on the dashboard before logout and redirected to login after
 *
 * @param {Page} page - Playwright page instance
 * @param {"sidebar" | "settings"} method - The logout method to use
 * @returns {Promise<void>}
 */
export const logoutUser = async(page: Page, method: "sidebar" | "settings"): Promise<void> => {
   // Ensure we are on the home page before logging out
   await expect(page).toHaveURL(DASHBOARD_ROUTE);
   await verifyHomeSidebarHighlight(page);

   if (method === "sidebar") {
      // Logout via the sidebar navigation
      await page.getByTestId("sidebar-toggle").click();
      await page.getByTestId("sidebar-logout").click();
   } else if (method === "settings") {
      // Logout via the settings page
      await navigateToPath(page, SETTINGS_ROUTE);
      await page.getByTestId("settings-logout").click();
      await page.getByTestId("settings-logout-confirm").click();
   }

   // Verify logout was successful by checking redirect to login
   await expect(page).toHaveURL(LOGIN_ROUTE);
};

/**
 * Verifies that verified routes redirect to login when user is not authenticated
 *
 * Iterates through all protected routes and verifies unauthenticated users
 * are redirected to the login page
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<void>}
 */
export const testRouteRedirects = async(page: Page, type: "verified" | "unverified"): Promise<void> => {
   const routes = type === "verified" ? VERIFIED_ROUTES : UNVERIFIED_ROUTES;
   const redirectRoute = type === "verified" ? DASHBOARD_ROUTE : LOGIN_ROUTE;

   for (const path of routes) {
      await navigateToPath(page, path);
      await expect(page).toHaveURL(redirectRoute);
   }
};