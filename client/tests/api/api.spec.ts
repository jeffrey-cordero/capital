import { type Cookie, type Page, type Response, type Route } from "@playwright/test";
import { expect, test } from "@tests/fixtures";
import { assertComponentVisible } from "@tests/utils";
import { createUser, DASHBOARD_ROUTE, LOGIN_ROUTE } from "@tests/utils/authentication";
import { submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { assertNotificationStatus } from "@tests/utils/notifications";
import { createValidLogin } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";

test.describe("API Error Handling", () => {
   test.describe("Network Error Handling", () => {
      test("should handle offline state gracefully", async({ page }) => {
         const message: string = "You are offline. Check your internet connection.";

         // Navigate to the login page
         await navigateToPath(page, LOGIN_ROUTE);

         // Wait for the form to be ready before going offline
         await assertComponentVisible(page, "username");

         // Go offline and submit a valid login request
         await page.context().setOffline(true);
         await submitForm(page, createValidLogin());

         await assertNotificationStatus(page, message, "error");
      });

      test("should handle too many requests gracefully", async({ page }) => {
         const message: string = "Too many requests. Please try again later.";

         // Mock the login endpoint to return a too many requests error
         await page.route("**/api/v1/authentication/login", async(route: Route) => {
            await route.fulfill({
               status: HTTP_STATUS.TOO_MANY_REQUESTS,
               body: JSON.stringify({ errors: { server: message } })
            });
         });

         // Navigate to the login page and submit a valid login request
         await navigateToPath(page, LOGIN_ROUTE);
         await submitForm(page, createValidLogin());

         await assertNotificationStatus(page, message, "error");
      });
   });

   test.describe("Token Refresh Handling", () => {
      /**
       * Arranges the dashboard request to simulate token refresh scenarios using an environment
       * variable to track refresh attempts per test (`PLAYWRIGHT_TEST_ID` environment variable)
       *
       * @param {Page} page - Playwright page instance
       */
      const arrangeDashboardWithTokenRefresh = async(page: Page): Promise<void> => {
         const testId: string = process.env.PLAYWRIGHT_TEST_ID || "default";
         const refreshKey: string = `refreshAttempted_${testId}`;

         await page.route("**/api/v1/dashboard", async(route: Route) => {
            const refreshAttempted: boolean = (global as any)[refreshKey];

            if (!refreshAttempted) {
               // Mock the expiration of the access token while fetching the dashboard data
               (global as any)[refreshKey] = true;

               await route.fulfill({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  body: JSON.stringify({ data: { refreshable: true } })
               });
            } else {
               // A valid refresh request should continue the original dashboard data request
               await route.continue();
            }
         });
      };

      /**
       * Removes the refresh token from browser cookies while preserving other cookies
       *
       * @param {Page} page - Playwright page instance
       */
      const removeRefreshTokenFromCookies = async(page: Page): Promise<void> => {
         // Get all of the cookies from the page context
         const context = page.context();
         const cookies = await context.cookies();

         // Clear all cookies and re-add all of the cookies except for the refresh token
         await context.clearCookies();
         await context.addCookies(cookies.filter((cookie: Cookie) => cookie.name !== "refresh_token"));
      };

      test.beforeEach(async({ page, usersRegistry }) => {
         await createUser(page, {}, true, usersRegistry);
         await arrangeDashboardWithTokenRefresh(page);
      });

      test("should successfully refresh access token and continue original request", async({ page }) => {
         process.env.PLAYWRIGHT_TEST_ID = "successful_refresh";

         // Store the promise for the refresh response
         const refreshPromise = page.waitForResponse("**/api/v1/authentication/refresh");

         // Reload the page to trigger the access token refresh request
         await page.reload();

         // Wait for the refresh response to fully resolve and assert the successful status
         const response: Response = await refreshPromise;
         expect(response.status()).toBe(HTTP_STATUS.OK);

         // Verify the user remains on the dashboard and the original request resumes
         await expect(page).toHaveURL(DASHBOARD_ROUTE);
         await expect(page.getByTestId("empty-accounts-trends-overview")).toBeVisible();
      });

      test("should redirect to login page when refresh token is missing during a token refresh attempt", async({ page }) => {
         process.env.PLAYWRIGHT_TEST_ID = "missing_refresh_token";

         // Clear the refresh token
         await removeRefreshTokenFromCookies(page);

         // Store the promise for the refresh response
         const refreshPromise = page.waitForResponse("**/api/v1/authentication/refresh");

         // Reload to trigger the access token refresh request
         await page.reload();

         // Wait for the refresh response to fully resolve and assert the unauthorized status
         const response: Response = await refreshPromise;
         expect(response.status()).toBe(HTTP_STATUS.UNAUTHORIZED);

         // Verify the user is redirected to the login page
         await expect(page).toHaveURL(LOGIN_ROUTE);
      });
   });
});