import type { Page } from "@playwright/test";
import { expect, test } from "@tests/fixtures";
import {
   DASHBOARD_ROUTE,
   LOGIN_ROUTE,
   logoutUser,
   SETTINGS_ROUTE,
   UNVERIFIED_ROUTES,
   VERIFIED_ROUTES
} from "@tests/utils/authentication";
import { clickSidebarLink, getRouteLinkTitle, navigateToPath } from "@tests/utils/navigation";
import { assertThemeState, getCurrentAndOppositeTheme, toggleTheme } from "@tests/utils/dashboard/settings";
import { setupAssignedUser } from "@tests/utils/user-management";
import { assertInputVisibility } from "@tests/utils";

test.describe("Routing and Navigation", () => {
   /**
    * Asserts that the sidebar link for a route is currently active
    *
    * @param {Page} page - Playwright page instance
    * @param {string} route - Route path to verify
    */
   const assertSidebarLinkActive = async(page: Page, route: string): Promise<void> => {
      const linkTitle: string = getRouteLinkTitle(route);
      await clickSidebarLink(page, `sidebar-link-${linkTitle.toLowerCase()}`);

      // Assert that the link is visible and active
      await expect(page.getByTestId(`sidebar-link-${linkTitle.toLowerCase()}`)).toHaveAttribute("data-active", "true");
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
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
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

   test.describe("Theme Toggle", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false);
      });

      test("should toggle theme via sidebar switch and persist across routes", async({ page }) => {
         // Get current and new theme
         const { opposite: newTheme } = await getCurrentAndOppositeTheme(page);

         // Toggle theme
         await toggleTheme(page, "sidebar", newTheme);

         for (const route of VERIFIED_ROUTES) {
            await navigateToPath(page, route);
            await expect(page).toHaveURL(route);
            await assertThemeState(page, newTheme);

            // Reload and verify persistence
            await page.reload();
            await assertThemeState(page, newTheme);

            if (route === SETTINGS_ROUTE) {
               // Assert the input value matches the new theme in the settings page
               await assertInputVisibility(page, "details-theme", "Theme", newTheme);
            }
         }
      });
   });
});