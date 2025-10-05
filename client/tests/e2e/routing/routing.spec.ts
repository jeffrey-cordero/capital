import { expect, test } from "@playwright/test";

import {
   createUser,
   DASHBOARD_ROUTE,
   getRouteLinkTitle,
   UNVERIFIED_ROUTES,
   VERIFIED_ROUTES
} from "../../utils/authentication";
import {
   logoutUser,
   navigateToPath,
   testRouteRedirects,
   testUnverifiedRouteRedirects,
   verifySidebarLinkActive
} from "../../utils/navigation";

test.describe("Routing and Navigation", () => {
   test.describe("Authenticated User Routing", () => {
      test.beforeEach(async({ page }) => {
         // Register and authenticate user for each test
         await createUser(page);
      });

      test("should highlight correct sidebar link for all authenticated routes", async({ page }) => {
         for (const route of VERIFIED_ROUTES) {
            await navigateToPath(page, route);
            await verifySidebarLinkActive(page, getRouteLinkTitle(route));
         }
      });

      test("should redirect authenticated user from public routes to dashboard", async({ page }) => {
         await testUnverifiedRouteRedirects(page);
      });

      test("should logout via sidebar and redirect to login", async({ page }) => {
         // Perform logout
         await logoutUser(page, "sidebar");

         // Verify verified routes now redirect to login
         await testRouteRedirects(page, "unverified");
      });

      test("should logout via settings and redirect to login", async({ page }) => {
         await logoutUser(page, "settings");

         // Verify verified routes now redirect to login
         await testRouteRedirects(page, "unverified");
      });

      test("should handle direct navigation to root route", async({ page }) => {
         for (const route of UNVERIFIED_ROUTES) {
            await navigateToPath(page, route);
            await expect(page).toHaveURL(DASHBOARD_ROUTE);
         }
      });
   });

   test.describe("Unauthenticated User Routing", () => {
      test("should highlight correct sidebar link for all unauthenticated routes", async({ page }) => {
         for (const route of UNVERIFIED_ROUTES) {
            await navigateToPath(page, route);
            await verifySidebarLinkActive(page, getRouteLinkTitle(route));
         }
      });

      test("should allow access to public routes when unauthenticated", async({ page }) => {
         // Test root route access
         for (const route of UNVERIFIED_ROUTES) {
            await navigateToPath(page, route);
            await expect(page).toHaveURL(route);
         }

         // Verify unauthenticated user can access public routes
         await testRouteRedirects(page, "unverified");
      });

      test("should redirect unauthenticated user from protected routes to login", async({ page }) => {
         await testRouteRedirects(page, "unverified");
      });
   });
});