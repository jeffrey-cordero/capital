import { expect, test } from "@playwright/test";
import { createUser, DASHBOARD_ROUTE, LOGIN_ROUTE } from "@tests/utils/authentication";
import { submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { dismissNotification, verifySuccessNotification } from "@tests/utils/utils";
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

         // Verify network error is displayed and can be dismissed
         await verifySuccessNotification(page, "You are offline. Check your internet connection.", "error");
         await dismissNotification(page);

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

         // Verify too many requests error is displayed and can be dismissed
         await verifySuccessNotification(page, message, "error");
         await dismissNotification(page);
      });
   });

   test.describe("Token Refresh Handling", () => {
      /**
       * Mocks the dashboard request to simulate token refresh scenarios using Playwright environment
       * variable to track refresh attempts per test
       *
       * @param {any} page - Playwright page object
       */
      const mockDashboardWithTokenRefresh = async(page: any): Promise<void> => {
         const testId = process.env.PLAYWRIGHT_TEST_ID || "default";
         const refreshKey = `refreshAttempted_${testId}`;

         await page.route("**/api/v1/dashboard", async(route: any) => {
            const refreshAttempted = (global as any)[refreshKey];

            if (!refreshAttempted) {
               // Mock the expiration of the access token while fetching the dashboard data to indicate a need for a refresh token request
               (global as any)[refreshKey] = true;

               await route.fulfill({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  body: JSON.stringify({ data: { refreshable: true } })
               });
            } else {
               // A valid refresh request should continue the dashboard data request
               await route.continue();
            }
         });
      };

      /**
       * Removes the refresh token from browser cookies while preserving other cookies
       *
       * @param {any} page - Playwright page object
       */
      const removeRefreshTokenFromCookies = async(page: any): Promise<void> => {
         // Get all cookies
         const context = page.context();
         const cookies = await context.cookies();

         // Clear all cookies and re-add only the filtered cookies
         await context.clearCookies();
         await context.addCookies(cookies.filter((cookie: any) => cookie.name !== "refresh_token"));
      };

      test.beforeEach(async({ page }) => {
         // Mock the dashboard request to simulate token refresh scenarios
         await mockDashboardWithTokenRefresh(page);
      });

      test("should successfully refresh token and continue original request", async({ page }) => {
         // Set unique test ID for this test
         process.env.PLAYWRIGHT_TEST_ID = "successful_refresh";

         // Navigate to login page and login with a new user
         await navigateToPath(page, LOGIN_ROUTE);
         await createUser(page);

         // Set up waitForResponse first
         const refreshPromise = page.waitForResponse("**/api/v1/authentication/refresh");

         // Reload the page, which triggers the refresh request
         await page.reload();

         // Wait for the response and assert
         const refreshResponse = await refreshPromise;

         // Capture status and body immediately
         const status = refreshResponse.status();
         const bodyText = await refreshResponse.text();
         const jsonBody = JSON.parse(bodyText);

         // Assertions
         expect(status).toBe(HTTP_STATUS.OK);
         expect(jsonBody).toMatchObject({ data: { success: true } });

         // Verify the user is redirected to the dashboard after a successful token refresh
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
         await expect(page.getByTestId("empty-accounts-trends-overview")).toBeVisible();
      });

      test("should redirect to login page when refresh token is missing", async({ page }) => {
         // Set unique test ID for this test
         process.env.PLAYWRIGHT_TEST_ID = "missing_refresh_token";

         // Navigate to login page and login with a new user
         await navigateToPath(page, LOGIN_ROUTE);
         await createUser(page);

         // Clear the refresh token
         await removeRefreshTokenFromCookies(page);

         // Set up waitForResponse first
         const refreshPromise = page.waitForResponse("**/api/v1/authentication/refresh");

         // Reload to trigger the token refresh request
         await page.reload();

         // Wait for the response and assert
         const refreshResponse = await refreshPromise;

         // Capture status immediately
         const status = refreshResponse.status();

         // Assertions
         expect(status).toBe(HTTP_STATUS.UNAUTHORIZED);

         // Verify the user is redirected to the login page
         await expect(page).toHaveURL(LOGIN_ROUTE);
      });
   });
});