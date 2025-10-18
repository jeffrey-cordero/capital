import { expect, test } from "@playwright/test";
import { HTTP_STATUS } from "capital/server";

import { createUser, DASHBOARD_ROUTE, LOGIN_ROUTE } from "@tests/utils/authentication";
import { submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { createValidLogin } from "capital/mocks/user";

test.describe("API Error Handling", () => {
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
               body: JSON.stringify({ errors: { server: message } })
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

         // Now reload to fetch authentication state
         await page.reload();

         await page.route("**/api/v1/authentication/refresh", async(route) => {
            refreshCalled = true;
            await route.fulfill({
               status: HTTP_STATUS.OK,
               body: JSON.stringify({ data: { success: refreshAttempted } })
            });
         });

         // Mock the authentication endpoint
         await page.route("**/api/v1/authentication", async(route) => {
            if (!refreshAttempted) {
               refreshAttempted = true;
               await route.fulfill({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  body: JSON.stringify({ data: { refreshable: true } })
               });
            } else {
               await route.fulfill({
                  status: HTTP_STATUS.OK,
                  body: JSON.stringify({ data: { authenticated: refreshCalled } })
               });
            }
         });

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