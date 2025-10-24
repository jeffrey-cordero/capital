import { expect, test } from "@playwright/test";
import { createUser, DASHBOARD_ROUTE, LOGIN_ROUTE } from "@tests/utils/authentication";
import { submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { createValidLogin } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";

test.describe("API Error Handling", () => {
   test.describe("Network Error Handling", () => {
      test("should handle offline state gracefully", async({ page }) => {
         // Setup: Navigate to login page
         await navigateToPath(page, LOGIN_ROUTE);

         // Set browser to offline mode
         await page.context().setOffline(true);

         // Submit login form
         await submitForm(page, createValidLogin());

         // Verify network error is displayed
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

         // Submit login form
         await submitForm(page, createValidLogin());

         // Verify too many requests error is displayed
         await expect(page.getByTestId("notification")).toBeVisible();
         await expect(page.getByTestId("notification")).toContainText(message);
      });
   });

   test.describe("Token Refresh Handling", () => {
      test("should handle a successfully make a refresh token request and continue the original request or redirect to login page", async({ page }) => {
         let refreshAttempted = false;

         // Mock the dashboard request to return a refreshable flag for expired access token
         await page.route("**/api/v1/dashboard", async(route) => {
            if (!refreshAttempted) {
               // Mock the expiration of the access token while fetching the dashboard data to indicate a need for a refresh token request
               refreshAttempted = true;
               await route.fulfill({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  body: JSON.stringify({ data: { refreshable: true } })
               });
            } else {
               // A valid refresh request should continue the dashboard data request
               await route.continue();
            }
         });

         // Setup: Navigate to login page and login
         await navigateToPath(page, LOGIN_ROUTE);
         await createUser(page);

         // Now reload to fetch authentication state
         await page.reload();
         let refreshResponse = await page.waitForResponse("**/api/v1/authentication/refresh");
         expect(refreshResponse.status()).toBe(HTTP_STATUS.OK);
         expect(await refreshResponse.json()).toMatchObject({ data: { success: true } });

         // Navigate to dashboard should work as intended
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
         await expect(page.getByTestId("empty-accounts-trends-overview")).toBeVisible();

         // Now clear the refresh token
         refreshAttempted = false;
         const context = page.context();
         const cookies = await context.cookies();

         // Filter out only the ones you want to keep
         const filtered = cookies.filter(cookie => cookie.name !== "refresh_token");

         // Clear all cookies, then re-add only the filtered ones
         await context.clearCookies();
         await context.addCookies(filtered);

         // Test refresh token handling with a missing refresh token, which should redirect to the login page
         await page.reload();

         refreshResponse = await page.waitForResponse("**/api/v1/authentication/refresh");
         expect(refreshResponse.status()).toBe(HTTP_STATUS.UNAUTHORIZED);

         // Verify the user is redirected to the login page
         await expect(page).toHaveURL(LOGIN_ROUTE);
      });
   });
});