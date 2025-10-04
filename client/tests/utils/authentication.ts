/**
 * Authentication test utilities for managing user registration, login, and route verification
 *
 * This module provides constants and helper functions for testing authentication flows
 * including registration, login, route protection, and session management
 */

import { expect, type Page } from "@playwright/test";
import { submitForm } from "./forms";
import { navigateToPath } from "./navigation";
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
 * Checks if user is currently authenticated by verifying if the current URL includes the dashboard route
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<boolean>} Promise resolving to true if user is authenticated, false otherwise
 */
export const isUserAuthenticated = async(page: Page): Promise<boolean> => {
   return page.url().includes(DASHBOARD_ROUTE);
};

/**
 * Submits registration form and optionally logs in the user via notification
 *
 * This function handles the complete registration flow including form submission,
 * success notification verification, and optional automatic login
 *
 * @param {Page} page - Playwright page instance
 * @param {RegisterPayload} registrationData - Registration form data containing username, email, password, etc
 * @param {boolean} logOutAfterRegistration - Whether to log out the user after registration
 * @returns {Promise<void>}
 */
export const submitRegistrationForm = async(page: Page, registrationData: RegisterPayload, logOutAfterRegistration: boolean = false): Promise<void> => {
   await navigateToPath(page, REGISTER_ROUTE);
   await submitForm(page, registrationData);
   await expect(page).toHaveURL(DASHBOARD_ROUTE);

   if (logOutAfterRegistration) {
      // Logout the user, typically used to create mock users
      await page.getByTestId("sidebar-toggle").click();
      await page.getByTestId("sidebar-logout").click();
      await expect(page).toHaveURL(ROOT_ROUTE);
   }
};