import type { Locator } from "@playwright/test";
import { expect, test } from "@tests/fixtures";
import { assertComponentIsVisible } from "@tests/utils";
import { DASHBOARD_ROUTE, VERIFIED_ROUTES } from "@tests/utils/authentication";
import {
   assertEmptyTrends,
   assertIndicatorState,
   assertLastUpdated,
   assertNewsArticleCard,
   assertNewsArticleExpansion,
   assertStockCard,
   captureDashboardResponse,
   EXPECTED_DASHBOARD_DATA,
   switchIndicator
} from "@tests/utils/dashboard/dashboard";
import { clickSidebarLink, navigateToPath } from "@tests/utils/navigation";
import { assertNotificationStatus } from "@tests/utils/notifications";
import { setupAssignedUser } from "@tests/utils/user-management";
import type { Dashboard } from "capital/dashboard";
import type { Article, StockIndicator, StockTrends } from "capital/economy";
import { HTTP_STATUS } from "capital/server";

test.describe("Dashboard", () => {
   test.describe("Trends Section", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true, assignedUser);
      });

      const emptyStateTests = [
         { section: "accounts", heading: "Accounts", subtitle: "$0.00" },
         { section: "budgets", heading: "Budgets", subtitle: "Income vs. Expenses" }
      ];

      for (const { section, heading, subtitle } of emptyStateTests) {
         test(`should display complete empty ${section} state`, async({ page }) => {
            await assertComponentIsVisible(page, `${section}-trends-heading`, heading);
            await assertComponentIsVisible(page, `${section}-trends-subtitle`, subtitle);
            await assertEmptyTrends(page, section as "accounts" | "budgets");
         });
      }
   });

   test.describe("Economy Section", () => {
      let dashboard: Dashboard;
      let stocksTrends: StockTrends;

      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         const responsePromise = captureDashboardResponse(page);
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false, false, assignedUser);
         dashboard = await responsePromise;
         stocksTrends = dashboard.economy.trends.Stocks as StockTrends;
      });

      test.describe("Last Updated Timestamp", () => {
         test("should display the last updated timestamp", async({ page }) => {
            await assertLastUpdated(page, EXPECTED_DASHBOARD_DATA.lastUpdated);
         });
      });

      test.describe("Economic Indicators Graph", () => {
         test("should display initial state with Federal Interest Rate indicator", async({ page }) => {
            await assertIndicatorState(page, "Federal Interest Rate");
         });

         for (const name of ["GDP", "Inflation", "Unemployment", "Treasury Yield"]) {
            test(`should switch to ${name} indicator and display correct values`, async({ page }) => {
               await switchIndicator(page, name);
               await assertIndicatorState(page, name);
            });
         }
      });

      test.describe("Stocks", () => {
         const stockSectionTests = [
            { type: "top-gainers", title: "Top Gainers", dataKey: "top_gainers" as const },
            { type: "top-losers", title: "Top Losers", dataKey: "top_losers" as const },
            { type: "most-active", title: "Most Active", dataKey: "most_actively_traded" as const }
         ];

         for (const { type, title, dataKey } of stockSectionTests) {
            test(`should display ${title} section with correct stock data and chip colors`, async({ page }) => {
               await assertComponentIsVisible(page, `stocks-${type}-title`, title);

               const stocksData: StockIndicator[] = stocksTrends[dataKey];
               expect(stocksData.length).toBe(EXPECTED_DASHBOARD_DATA.stocks.stocksCount);

               const section: Locator = page.getByTestId(`stocks-${type}-container`);
               const stockLinks: Locator = section.locator(`[data-testid^='stock-link-${type}-']`);
               await expect(stockLinks).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.stocksCount);

               const chips: Locator = section.locator("[data-testid^='stock-percent-chip-']");
               await expect(chips).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.stocksCount);

               for (let i = 0; i < stocksData.length; i++) {
                  const stock: StockIndicator = stocksData[i];
                  await assertStockCard(page, stock, type, i);
               }
            });
         }
      });
   });

   test.describe("News Section", () => {
      let dashboard: Dashboard;
      let newsArticles: Article[];

      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         const responsePromise = captureDashboardResponse(page);
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false, false, assignedUser);
         dashboard = await responsePromise;
         newsArticles = [...dashboard.economy.news.response.data].reverse().slice(0, 20);
      });

      test("should display and validate the content of all news articles", async({ page }) => {
         const totalArticles: number = newsArticles.length;
         expect(totalArticles).toBe(EXPECTED_DASHBOARD_DATA.newsDisplayedCount);

         for (let i = 0; i < totalArticles; i++) {
            await assertNewsArticleCard(page, newsArticles[i], i);
         }
      });

      test("should expand and collapse the first news article", async({ page }) => {
         await assertNewsArticleExpansion(page, newsArticles[0], 0);
      });
   });

   test.describe("Sidebar Section", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false, false, assignedUser);
      });

      const sectionScrollTests = [
         { section: "economy", link: "sidebar-link-economy" },
         { section: "news", link: "sidebar-link-news" }
      ];

      for (const route of VERIFIED_ROUTES) {
         for (const { section, link } of sectionScrollTests) {
            test(`should navigate to ${route} and scroll to ${section} section when clicking sidebar ${section} link`, async({ page }) => {
               if (route !== DASHBOARD_ROUTE) {
                  await navigateToPath(page, route);
               }

               await clickSidebarLink(page, link);
               await expect(page).toHaveURL(new RegExp(`/dashboard#${section}`));
               await expect(page.getByTestId(`${section}-section`)).toBeInViewport();
            });
         }
      }
   });

   test.describe("API Failures", () => {
      const errorMessage: string = "Internal Server Error";

      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false, false, assignedUser);
      });

      test("should display error notification and show loading spinner when API fails", async({ page }) => {
         // Mock the dashboard API to return an internal server error after the initial user assignment
         await page.route("**/api/v1/dashboard", async(route) => {
            await route.fulfill({
               status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
               contentType: "application/json",
               body: JSON.stringify({
                  errors: {
                     server: errorMessage
                  }
               })
            });
         });

         // Reload the page to trigger the API failure
         await page.reload();

         // Assert the error notification and infinite loading spinner are visible
         await assertNotificationStatus(page, errorMessage, "error");
         const spinner: Locator = page.getByTestId("loading-spinner");
         await expect(spinner).toBeVisible();

         // After a long timeout, the sections should still be detatched and the spinner should still be visible
         await page.waitForTimeout(5000);
         await expect(spinner).toBeVisible();

         for (const section of ["economy", "stocks", "news"] as const) {
            await page.getByTestId(`${section}-section`).waitFor({ state: "detached" });
         }
      });
   });
});