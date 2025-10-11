/**
 * API error handling tests
 *
 * Tests how the UI handles various API error conditions including
 * server errors, validation errors, and network issues
 */

import { expect, test } from "@playwright/test";

// Define HTTP status codes locally to avoid import issues
const HTTP_STATUS = {
   OK: 200,
   CREATED: 201,
   NO_CONTENT: 204,
   REDIRECT: 302,
   BAD_REQUEST: 400,
   UNAUTHORIZED: 401,
   FORBIDDEN: 403,
   NOT_FOUND: 404,
   CONFLICT: 409,
   TOO_MANY_REQUESTS: 429,
   INTERNAL_SERVER_ERROR: 500
};

import { createUser, DASHBOARD_ROUTE, LOGIN_ROUTE, REGISTER_ROUTE } from "@tests/utils/authentication";
import { submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { createValidLogin, createValidRegistration } from "capital/mocks/user";

test.describe("API Error Handling", () => {
   test.describe("Authentication Errors", () => {
      test("should handle server error during login", async({ page }) => {
         // Setup: Navigate to login page
         await navigateToPath(page, LOGIN_ROUTE);

         // Mock API to return server error
         await page.route("**/api/v1/authentication/login", route => {
            route.fulfill({
               status: HTTP_STATUS.INTERNAL_SERVER_ERROR, // Internal Server Error
               body: JSON.stringify({
                  code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
                  errors: { server: "Internal Server Error" }
               })
            });
         });

         // Action: Submit login form
         await submitForm(page, createValidLogin());

         // Assertion: Verify error notification is displayed
         await expect(page.getByTestId("notification")).toBeVisible();
         await expect(page.getByTestId("notification")).toContainText("Internal Server Error");
         await expect(page.getByTestId("notification")).toHaveAttribute("data-type", "error");
      });

      test("should handle validation errors during registration", async({ page }) => {
      // Setup: Navigate to registration page
         await navigateToPath(page, REGISTER_ROUTE);

         // Mock API to return validation error
         await page.route("**/api/v1/users", route => {
            route.fulfill({
               status: HTTP_STATUS.BAD_REQUEST,
               body: JSON.stringify({
                  code: HTTP_STATUS.BAD_REQUEST,
                  errors: {
                     username: "Username contains invalid characters",
                     email: "Email format is invalid"
                  }
               })
            });
         });

         // Action: Submit registration form with valid data
         // (Server-side validation should still fail due to our mock)
         await submitForm(page, createValidRegistration());

         // Assertion: Verify field-specific errors are displayed
         await expect(page.locator(".MuiFormControl-root:has([data-testid=\"username\"]) p.Mui-error"))
            .toContainText("Username contains invalid characters");

         await expect(page.locator(".MuiFormControl-root:has([data-testid=\"email\"]) p.Mui-error"))
            .toContainText("Email format is invalid");
      });

      test("should handle conflict errors during registration", async({ page }) => {
         // Setup: Navigate to registration page
         await navigateToPath(page, REGISTER_ROUTE);

         // Mock API to return conflict error
         await page.route("**/api/v1/users", route => {
            route.fulfill({
               status: HTTP_STATUS.CONFLICT,
               body: JSON.stringify({
                  code: HTTP_STATUS.CONFLICT,
                  errors: {
                     username: "Username already exists",
                     email: "Email already exists"
                  }
               })
            });
         });

         // Action: Submit registration form
         await submitForm(page, createValidRegistration());

         // Assertion: Verify conflict errors are displayed
         await expect(page.locator(".MuiFormControl-root:has([data-testid=\"username\"]) p.Mui-error"))
            .toContainText("Username already exists");

         await expect(page.locator(".MuiFormControl-root:has([data-testid=\"email\"]) p.Mui-error"))
            .toContainText("Email already exists");
      });
   });

   test.describe("Network Error Handling", () => {
      test("should handle offline state gracefully", async({ page }) => {
         // Setup: Navigate to login page
         await navigateToPath(page, LOGIN_ROUTE);

         // Set browser to offline mode
         await page.context().setOffline(true);

         // Action: Submit login form
         await submitForm(page, createValidLogin());

         // Assertion: Verify network error is displayed
         await expect(page.getByTestId("notification")).toBeVisible();
         await expect(page.getByTestId("notification")).toContainText("You are offline. Check your internet connection.");

         // Cleanup: Set browser back to online mode
         await page.context().setOffline(false);
      });

      test("should handle too many requests gracefully", async({ page }) => {
         const message = "Too many requests. Please try again later.";
         // Mock API to return too many requests error
         await page.route("**/api/v1/authentication/login", route => {
            route.fulfill({
               status: HTTP_STATUS.TOO_MANY_REQUESTS,
               body: JSON.stringify({ code: HTTP_STATUS.TOO_MANY_REQUESTS, errors: { server: message } })
            });
         });

         // Setup: Navigate to login page
         await navigateToPath(page, LOGIN_ROUTE);

         // Action: Submit login form
         await submitForm(page, createValidLogin());

         // Assertion: Verify too many requests error is displayed
         await expect(page.getByTestId("notification")).toBeVisible();
         await expect(page.getByTestId("notification")).toContainText(message);
      });
   });

   test.describe("Token Refresh Handling", () => {
      test("should handle token expiration and refresh", async({ page }) => {
         // Setup: Navigate to login page and login
         await navigateToPath(page, LOGIN_ROUTE);
         await createUser(page);

         // Mock the refresh endpoint
         let refreshCalled = false;
         let refreshAttempted = false;
         await page.route("**/api/v1/authentication/refresh", async(route) => {
            refreshCalled = true;
            await route.fulfill({
               status: HTTP_STATUS.OK,
               body: JSON.stringify({ code: HTTP_STATUS.OK, data: { success: refreshAttempted } })
            });
         });

         // Mock the authentication endpoint
         await page.route("**/api/v1/authentication", async(route) => {
            if (!refreshAttempted) {
               refreshAttempted = true;
               await route.fulfill({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  body: JSON.stringify({ code: HTTP_STATUS.UNAUTHORIZED, data: { refreshable: true } })
               });
            } else {
               await route.fulfill({
                  status: HTTP_STATUS.OK,
                  body: JSON.stringify({ code: HTTP_STATUS.OK, data: { authenticated: refreshCalled } })
               });
            }
         });

         // Now reload or navigate — routes are already active
         await page.reload();

         // Wait for the refresh call
         const refreshResponse = await page.waitForResponse("**/api/v1/authentication/refresh");
         expect(refreshResponse.ok()).toBe(true);
         expect(refreshCalled).toBe(true);

         // Navigate to dashboard should work as intended
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
         await expect(page.getByTestId("empty-accounts-trends-overview")).toHaveText("No available accounts");
      });
   });
});