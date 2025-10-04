import { expect, test } from "@playwright/test";

import { DASHBOARD_ROUTE, ROOT_ROUTE, submitRegistrationForm, UNVERIFIED_ROUTES } from "../../utils/authentication";
import { VALID_REGISTRATION } from "../../utils/forms";
import {
   logoutUser,
   navigateToPath,
   testRouteRedirects,
   testUnverifiedRouteRedirects,
   verifyHomeSidebarHighlight
} from "../../utils/navigation";
import { createUniqueIdentifier } from "../../utils/utils";

test.describe("Routing and Navigation", () => {
   test.describe("Authenticated User Routing", () => {
      test.beforeEach(async({ page }) => {
         // Register and authenticate user for each test
         const username = createUniqueIdentifier("username");
         const email = createUniqueIdentifier("email");
         // Auto-redirects to the dashboard route on successful registration
         await submitRegistrationForm(page, { ...VALID_REGISTRATION, username, email });
      });

      test("should highlight Home in sidebar when on /home route", async({ page }) => {
         await verifyHomeSidebarHighlight(page);
      });

      test("should redirect authenticated user from public routes to /home", async({ page }) => {
         await testUnverifiedRouteRedirects(page);
      });

      test("should logout via sidebar and redirect to login", async({ page }) => {
         // Perform logout
         await logoutUser(page, "sidebar");

         // Verify verified routes now redirect to login
         await testRouteRedirects(page, "verified");
      });

      test("should logout via settings and redirect to login", async({ page }) => {
         await logoutUser(page, "settings");

         // Verify verified routes now redirect to login
         await testRouteRedirects(page, "verified");
      });

      test("should handle direct navigation to root route", async({ page }) => {
         for (const route of UNVERIFIED_ROUTES) {
            await navigateToPath(page, route);
            await expect(page).toHaveURL(DASHBOARD_ROUTE);
         }
      });
   });

   test.describe("Unauthenticated User Routing", () => {
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