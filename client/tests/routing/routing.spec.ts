import { expect, test, type Page } from "@playwright/test";
import {
   createUser,
   DASHBOARD_ROUTE,
   LOGIN_ROUTE,
   UNVERIFIED_ROUTES,
   VERIFIED_ROUTES
} from "@tests/utils/authentication";
import { getRouteLinkTitle, logoutUser, navigateToPath } from "@tests/utils/navigation";

test.describe("Routing and Navigation", () => {
   /**
    * Asserts route redirects based on authentication state
    *
    * @param {Page} page - Playwright page instance
    * @param {"verified" | "unverified"} type - The type of routes to test
    */
   const assertRouteRedirects = async(page: Page, type: "verified" | "unverified"): Promise<void> => {
      const routes = type === "verified" ? UNVERIFIED_ROUTES : VERIFIED_ROUTES;
      const redirectRoute = type === "verified" ? DASHBOARD_ROUTE : LOGIN_ROUTE;

      for (const path of routes) {
         await page.goto(path, { waitUntil: "networkidle" });
         await expect(page).toHaveURL(redirectRoute);
      }
   };

   test.describe("Authenticated User Routing", () => {
      /**
       * Asserts that all unverified routes redirect to dashboard when user is authenticated
       *
       * @param {Page} page - Playwright page instance
       */
      const assertUnverifiedRouteRedirects = async(page: Page): Promise<void> => {
         for (const path of UNVERIFIED_ROUTES) {
            await page.goto(path, { waitUntil: "networkidle" });
            await expect(page).toHaveURL(DASHBOARD_ROUTE);
         }
      };

      /**
       * Verifies that a specific sidebar link is marked as active
       *
       * @param {Page} page - Playwright page instance
       * @param {string} route - The route path to verify
       */
      const verifySidebarLinkActive = async(page: Page, route: string): Promise<void> => {
         const linkTitle = getRouteLinkTitle(route);
         await page.getByTestId("sidebar-toggle").click();
         const link = page.getByTestId(`sidebar-link-${linkTitle.toLowerCase()}`);
         await expect(link).toBeVisible();
         await expect(link).toHaveAttribute("data-active", "true");
         await page.keyboard.press("Escape");
      };

      test.beforeEach(async({ page }) => {
         // Register and authenticate user for each test
         await createUser(page);
      });

      test("should highlight correct sidebar link for all authenticated routes", async({ page }) => {
         for (const route of VERIFIED_ROUTES) {
            await navigateToPath(page, route);
            await verifySidebarLinkActive(page, route);
         }
      });

      test("should redirect authenticated user from public routes to dashboard", async({ page }) => {
         await assertUnverifiedRouteRedirects(page);
      });

      test("should logout via sidebar and redirect to login", async({ page }) => {
         await logoutUser(page, "sidebar");
         await assertRouteRedirects(page, "unverified");
      });

      test("should logout via settings and redirect to login", async({ page }) => {
         await logoutUser(page, "settings");
         await assertRouteRedirects(page, "unverified");
      });

      test("should handle direct navigation to root route", async({ page }) => {
         for (const route of UNVERIFIED_ROUTES) {
            await page.goto(route, { waitUntil: "networkidle" });
            await expect(page).toHaveURL(DASHBOARD_ROUTE);
         }
      });
   });

   test.describe("Unauthenticated User Routing", () => {
      /**
       * Verifies that a specific sidebar link is marked as active
       *
       * @param {Page} page - Playwright page instance
       * @param {string} route - The route path to verify
       */
      const verifySidebarLinkActive = async(page: Page, route: string): Promise<void> => {
         const linkTitle = getRouteLinkTitle(route);
         await page.getByTestId("sidebar-toggle").click();
         const link = page.getByTestId(`sidebar-link-${linkTitle.toLowerCase()}`);
         await expect(link).toBeVisible();
         await expect(link).toHaveAttribute("data-active", "true");
         await page.keyboard.press("Escape");
      };

      test("should highlight correct sidebar link for all unauthenticated routes", async({ page }) => {
         for (const route of UNVERIFIED_ROUTES) {
            await navigateToPath(page, route);
            await verifySidebarLinkActive(page, route);
         }
      });

      test("should allow access to public routes when unauthenticated", async({ page }) => {
         for (const route of UNVERIFIED_ROUTES) {
            await page.goto(route, { waitUntil: "networkidle" });
            await expect(page).toHaveURL(route);
         }
         await assertRouteRedirects(page, "unverified");
      });

      test("should redirect unauthenticated user from protected routes to login", async({ page }) => {
         await assertRouteRedirects(page, "unverified");
      });
   });
});