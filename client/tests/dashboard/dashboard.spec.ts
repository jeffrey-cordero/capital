import type { Dashboard } from "capital/dashboard";
import type { StockTrends } from "capital/economy";

import { expect, test } from "@tests/fixtures";
import { ACCOUNTS_ROUTE, BUDGETS_ROUTE, DASHBOARD_ROUTE } from "@tests/utils/authentication";
import {
   assertEmptyTrends,
   assertIndicatorInputs,
   assertIndicatorValues,
   assertLastUpdated,
   assertNewsArticleCard,
   assertNewsArticleExpansion,
   assertNewsArticleLink,
   assertStockCard,
   assertStockLink,
   captureDashboardResponse,
   EXPECTED_DASHBOARD_DATA,
   getNewsArticleCards,
   switchIndicator
} from "@tests/utils/dashboard/dashboard";
import { clickSidebarLink, navigateToPath } from "@tests/utils/navigation";
import { setupAssignedUser } from "@tests/utils/user-management";

test.describe("Dashboard Overview", () => {
   test.describe("Initial State - Empty Accounts & Budgets", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true, assignedUser);
      });

      test("should display complete empty accounts state", async({ page }) => {
         await expect(page.getByTestId("accounts-trends-heading")).toHaveText("Accounts");
         await expect(page.getByTestId("accounts-net-worth")).toHaveText("$0.00");
         await assertEmptyTrends(page, "accounts");
      });

      test("should display complete empty budgets state", async({ page }) => {
         await expect(page.getByTestId("budgets-trends-heading")).toHaveText("Budgets");
         await expect(page.getByTestId("budgets-trends-subtitle")).toHaveText("Income vs. Expenses");
         await assertEmptyTrends(page, "budgets");
      });
   });

   test.describe("Economy Section", () => {
      let dashboard: Dashboard;

      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         const responsePromise = captureDashboardResponse(page);
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false, false, assignedUser);
         dashboard = await responsePromise;
      });

      test.describe("Last Updated Timestamp", () => {
         test("should display the last updated timestamp", async({ page }) => {
            await assertLastUpdated(page, EXPECTED_DASHBOARD_DATA.lastUpdated);
         });
      });

      test.describe("Economic Indicators Graph", () => {
         test("should display initial state with Federal Interest Rate indicator", async({ page }) => {
            const { federalInterestRate } = EXPECTED_DASHBOARD_DATA.indicators;

            await assertIndicatorInputs(page, {
               indicator: "Federal Interest Rate",
               view: "Year",
               from: federalInterestRate.from,
               to: federalInterestRate.to
            });

            await assertIndicatorValues(
               page,
               federalInterestRate.value,
               federalInterestRate.yearPercent,
               federalInterestRate.monthPercent
            );
         });

         const indicatorSwitchTests = [
            { name: "GDP", data: EXPECTED_DASHBOARD_DATA.indicators.gdp },
            { name: "Inflation", data: EXPECTED_DASHBOARD_DATA.indicators.inflation },
            { name: "Unemployment", data: EXPECTED_DASHBOARD_DATA.indicators.unemployment },
            { name: "Treasury Yield", data: EXPECTED_DASHBOARD_DATA.indicators.treasuryYield }
         ];

         for (const { name, data } of indicatorSwitchTests) {
            test(`should switch to ${name} indicator and display correct values`, async({ page }) => {
               await switchIndicator(page, name);

               await assertIndicatorInputs(page, {
                  indicator: name,
                  view: "Year",
                  from: data.from,
                  to: data.to
               });

               await assertIndicatorValues(page, data.value, data.yearPercent, data.monthPercent);
            });
         }

         test("should display all indicator form inputs correctly", async({ page }) => {
            await switchIndicator(page, "GDP");

            await assertIndicatorInputs(page, {
               indicator: "GDP",
               view: "Year",
               from: EXPECTED_DASHBOARD_DATA.indicators.gdp.from,
               to: EXPECTED_DASHBOARD_DATA.indicators.gdp.to
            });
         });
      });

      test.describe("Stocks", () => {
         const stockSectionTests = [
            { type: "top-gainers", title: "Top Gainers", dataKey: "top_gainers" as const },
            { type: "top-losers", title: "Top Losers", dataKey: "top_losers" as const },
            { type: "most-active", title: "Most Active", dataKey: "most_actively_traded" as const }
         ];

         for (const { type, title, dataKey } of stockSectionTests) {
            test(`should display ${title} with correct data and chip colors`, async({ page }) => {
               const stocksTrends = dashboard.economy.trends.Stocks as StockTrends;
               const stocksData = stocksTrends[dataKey];
               expect(stocksData.length).toBe(EXPECTED_DASHBOARD_DATA.stocks.stocksCount);

               const section = page.getByTestId(`stocks-${type}-container`);

               const stockLinks = section.locator(`[data-testid^='stock-link-${type}-']`);
               await expect(stockLinks).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.stocksCount);

               const chips = section.locator("[data-testid^='stock-percent-chip-']");
               await expect(chips).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.stocksCount);

               for (let i = 0; i < stocksData.length; i++) {
                  const stock = stocksData[i];
                  await assertStockCard(page, stock, type, i);
               }
            });
         }

         test("should navigate to Google search when clicking a stock ticker link", async({ page }) => {
            const stocksTrends = dashboard.economy.trends.Stocks as StockTrends;
            const firstStock = stocksTrends.top_gainers[0];
            await assertStockLink(page, firstStock, "top-gainers", 0);
         });

         test("should display stock card titles correctly", async({ page }) => {
            await expect(page.getByTestId("stocks-top-gainers-title")).toHaveText("Top Gainers");
            await expect(page.getByTestId("stocks-top-losers-title")).toHaveText("Top Losers");
            await expect(page.getByTestId("stocks-most-active-title")).toHaveText("Most Active");
         });
      });
   });

   test.describe("News Section", () => {
      let dashboard: Dashboard;

      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         const responsePromise = captureDashboardResponse(page);
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false, false, assignedUser);
         dashboard = await responsePromise;
      });

      test("should display news articles", async({ page }) => {
         const articleCards = getNewsArticleCards(page);
         const count = await articleCards.count();
         expect(count).toBe(EXPECTED_DASHBOARD_DATA.newsDisplayedCount);
      });

      test("should display and validate all news article content", async({ page }) => {
         const newsArticles = [...dashboard.economy.news.response.data].reverse().slice(0, 20);
         expect(newsArticles.length).toBe(EXPECTED_DASHBOARD_DATA.newsDisplayedCount);

         for (let i = 0; i < newsArticles.length; i++) {
            await assertNewsArticleCard(page, newsArticles[i], i);
         }
      });

      test("should expand and collapse news articles", async({ page }) => {
         const firstArticle = [...dashboard.economy.news.response.data].reverse()[0];
         await assertNewsArticleExpansion(page, firstArticle, 0);
      });

      test("should navigate to external article link when clicked", async({ page }) => {
         const firstArticle = [...dashboard.economy.news.response.data].reverse()[0];
         await assertNewsArticleLink(page, firstArticle, 0);
      });
   });

   test.describe("Sidebar Navigation", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false, false, assignedUser);
      });

      const sectionScrollTests = [
         { section: "economy", link: "sidebar-link-economy" },
         { section: "news", link: "sidebar-link-news" }
      ];

      for (const { section, link } of sectionScrollTests) {
         test(`should scroll to ${section} section when clicking sidebar ${section} link from dashboard`, async({ page }) => {
            await clickSidebarLink(page, link);
            await expect(page.getByTestId(`${section}-section`)).toBeInViewport();
         });
      }

      const navigationTests = [
         { section: "economy", link: "sidebar-link-economy", fromPage: ACCOUNTS_ROUTE, fromName: "accounts" },
         { section: "news", link: "sidebar-link-news", fromPage: BUDGETS_ROUTE, fromName: "budgets" }
      ];

      for (const { section, link, fromPage, fromName } of navigationTests) {
         test(`should navigate to dashboard and scroll to ${section} from ${fromName} page`, async({ page }) => {
            await navigateToPath(page, fromPage);
            await clickSidebarLink(page, link);
            await expect(page).toHaveURL(new RegExp(`/dashboard#${section}`));
            await expect(page.getByTestId(`${section}-section`)).toBeInViewport();
         });
      }
   });
});
