import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@tests/fixtures";
import {
   createUser,
   DASHBOARD_ROUTE,
   LOGIN_ROUTE,
   logoutUser,
   UNVERIFIED_ROUTES,
   VERIFIED_ROUTES
} from "@tests/utils/authentication";
import { getRouteLinkTitle, navigateToPath } from "@tests/utils/navigation";

test.describe("Routing and Navigation", () => {
   /**
    * Asserts that the sidebar link for a route is currently active
    *
    * @param {Page} page - Playwright page instance
    * @param {string} route - Route path to verify
    */
   const assertSidebarLinkActive = async(page: Page, route: string): Promise<void> => {
      const linkTitle: string = getRouteLinkTitle(route);

      // Open the sidebar
      await page.getByTestId("sidebar-toggle").click();

      // Assert that the link is visible and active
      const link: Locator = page.getByTestId(`sidebar-link-${linkTitle.toLowerCase()}`);

      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("data-active", "true");

      // Close the sidebar for further testing
      await page.keyboard.press("Escape");
   };

   /**
    * Asserts that sidebar links are currently active after sidebar-based navigation for each route
    *
    * @param {Page} page - Playwright page instance
    * @param {readonly string[]} routes - Routes to check
    */
   const assertSidebarLinksActive = async(page: Page, routes: readonly string[]): Promise<void> => {
      for (const route of routes) {
         await navigateToPath(page, route);
         await assertSidebarLinkActive(page, route);
      }
   };

   /**
    * Assert that redirects occur for routes based on authentication state and highlights
    * the redirected sidebar link after network-based navigation
    *
    * @param {Page} page - Playwright page instance
    * @param {"verified" | "unverified"} type - Route set to evaluate
    */
   const assertRouteRedirects = async(page: Page, type: "verified" | "unverified"): Promise<void> => {
      const routes: readonly string[] = type === "verified" ? UNVERIFIED_ROUTES : VERIFIED_ROUTES;
      const redirectRoute: string = type === "verified" ? DASHBOARD_ROUTE : LOGIN_ROUTE;

      for (const route of routes) {
         await page.goto(route, { waitUntil: "networkidle" });
         await expect(page).toHaveURL(redirectRoute);
         await assertSidebarLinkActive(page, redirectRoute);
      }
   };

   /**
    * Assert that direct navigation to routes keeps the current page URL and highlights
    * the direct navigation sidebar link after network-based navigation
    *
    * @param {Page} page - Playwright page instance
    * @param {readonly string[]} routes - Routes to check
    */
   const assertDirectNavigation = async(page: Page, routes: readonly string[]): Promise<void> => {
      for (const route of routes) {
         await page.goto(route, { waitUntil: "networkidle" });
         await expect(page).toHaveURL(route);
         await assertSidebarLinkActive(page, route);
      }
   };

   test.describe("Authenticated User Routing", () => {
      test.beforeEach(async({ page, usersRegistry }) => {
         await createUser(page, {}, true, usersRegistry);
      });

      test("should highlight the sidebar link for all protected routes", async({ page }) => {
         await assertSidebarLinksActive(page, VERIFIED_ROUTES);
      });

      test("should allow direct access to the protected routes", async({ page }) => {
         await assertDirectNavigation(page, VERIFIED_ROUTES);
      });

      test("should redirect an authenticated user from the public routes to the dashboard", async({ page }) => {
         await assertRouteRedirects(page, "verified");
      });

      test("should logout an authenticated user via the sidebar and redirect to the login page", async({ page }) => {
         await logoutUser(page, "sidebar");
         await assertRouteRedirects(page, "unverified");
      });

      test("should logout an authenticated user via the settings page and redirect to the login page", async({ page }) => {
         await logoutUser(page, "settings");
         await assertRouteRedirects(page, "unverified");
      });
   });

   test.describe("Unauthenticated User Routing", () => {
      test("should highlight the sidebar link for all public routes", async({ page }) => {
         await assertSidebarLinksActive(page, UNVERIFIED_ROUTES);
      });

      test("should allow direct access to the public routes", async({ page }) => {
         await assertDirectNavigation(page, UNVERIFIED_ROUTES);
      });

      test("should redirect an unauthenticated user from protected routes to the login page", async({ page }) => {
         await assertRouteRedirects(page, "unverified");
      });
   });
});