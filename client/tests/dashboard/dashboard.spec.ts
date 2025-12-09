import type { Dashboard } from "capital/dashboard";

import { expect, test } from "@tests/fixtures";
import { ACCOUNTS_ROUTE, BUDGETS_ROUTE, DASHBOARD_ROUTE } from "@tests/utils/authentication";
import {
   assertEmptyTrends,
   assertIndicatorInputs,
   assertIndicatorValues,
   assertLastUpdated,
   captureDashboardResponse,
   EXPECTED_DASHBOARD_DATA,
   getNewsArticleCard,
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
         await expect(page.getByTestId("accounts-trends-heading")).toBeVisible();
         await expect(page.getByTestId("accounts-net-worth")).toBeVisible();
         await expect(page.getByTestId("accounts-net-worth")).toHaveText("$0.00");
         await assertEmptyTrends(page, "accounts");
      });

      test("should display complete empty budgets state", async({ page }) => {
         await expect(page.getByTestId("budgets-trends-heading")).toBeVisible();
         await expect(page.getByTestId("budgets-trends-subtitle")).toBeVisible();
         await assertEmptyTrends(page, "budgets");
      });
   });

   test.describe("Economy Section", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false, false, assignedUser);
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
            { type: "top-gainers", title: "Top Gainers", expectedChipColor: "success" },
            { type: "top-losers", title: "Top Losers", expectedChipColor: "error" },
            { type: "most-active", title: "Most Active", expectedChipColor: null }
         ];

         for (const { type, title, expectedChipColor } of stockSectionTests) {
            test(`should display 20 ${title} with ${expectedChipColor ? expectedChipColor === "success" ? "green" : "red" : "appropriate"} chips`, async({ page }) => {
               const section = page.getByTestId(`stocks-${type}-container`);

               const stockLinks = section.locator(`[data-testid^='stock-link-${type}-']`);
               await expect(stockLinks).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.stocksCount);

               const chips = section.locator("[data-testid^='stock-percent-chip-']");
               await expect(chips).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.stocksCount);

               if (expectedChipColor) {
                  for (let i = 0; i < EXPECTED_DASHBOARD_DATA.stocks.stocksCount; i++) {
                     const chip = section.locator(`[data-testid^='stock-percent-chip-'][data-chip-color='${expectedChipColor}']`).nth(i);
                     await expect(chip).toBeVisible();
                  }
               } else {
                  for (let i = 0; i < EXPECTED_DASHBOARD_DATA.stocks.stocksCount; i++) {
                     const chip = section.locator("[data-testid^='stock-percent-chip-']").nth(i);
                     const chipColor = await chip.getAttribute("data-chip-color");
                     expect(["success", "error", "default"]).toContain(chipColor);
                  }
               }

               await expect(section.getByText("shares").first()).toBeVisible();
            });
         }

         test("should navigate to Google search when clicking a stock ticker link", async({ page }) => {
            const firstStockLink = page.getByTestId("stock-link-top-gainers-0");

            const href = await firstStockLink.getAttribute("href");
            expect(href).toContain("google.com/search?q=");
            expect(href).toContain("+stock");

            const [newPage] = await Promise.all([
               page.context().waitForEvent("page"),
               firstStockLink.click()
            ]);

            expect(newPage.url()).toContain("google.com/search");
            await newPage.close();
         });

         test("should display stock card titles correctly", async({ page }) => {
            await expect(page.getByText("Top Gainers")).toBeVisible();
            await expect(page.getByText("Top Losers")).toBeVisible();
            await expect(page.getByText("Most Active")).toBeVisible();
         });
      });
   });

   test.describe("News Section", () => {
      let dashboard: Dashboard;

      test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
         const responsePromise = captureDashboardResponse(page);
         await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, false, false, assignedUser);

         const response = await responsePromise;
         const dashboardData = await response.json();
         dashboard = dashboardData;
      });

      test("should display news articles", async({ page }) => {
         const articleCards = getNewsArticleCards(page);

         const count = await articleCards.count();
         expect(count).toBeGreaterThan(0);
         expect(count).toBeLessThanOrEqual(EXPECTED_DASHBOARD_DATA.newsDisplayedCount);
      });

      test("should display and validate all news article content", async({ page }) => {
         const newsArticles = [...dashboard.economy.news.response.data].reverse().slice(0, 20);
         expect(newsArticles.length).toBe(EXPECTED_DASHBOARD_DATA.newsDisplayedCount);

         for (let i = 0; i < newsArticles.length; i++) {
            const article = newsArticles[i];
            const card = getNewsArticleCard(page, i);

            await expect(card).toBeVisible();

            const author = article.author || article.domain || "No Author";
            const authorInitial = author.charAt(0).toUpperCase();
            const publishDate = new Date(article.published).toLocaleString();

            await expect(card.getByTestId(`news-article-author-avatar-${i}`)).toHaveText(authorInitial);
            await expect(card.getByTestId(`news-article-author-${i}`)).toHaveText(author);
            await expect(card.getByTestId(`news-article-publish-date-${i}`)).toHaveText(publishDate);
            await expect(card.getByTestId(`news-article-title-${i}`)).toHaveText(article.title);
         }
      });

      test("should expand and collapse news articles", async({ page }) => {
         const firstCard = getNewsArticleCard(page, 0);

         await expect(firstCard).toHaveAttribute("data-expanded", "false");

         const expandButton = page.getByTestId("news-article-expand-button-0");
         await expandButton.click();
         await expect(firstCard).toHaveAttribute("data-expanded", "true");

         await expect(firstCard.locator("a[target=\"_blank\"]").last()).toBeVisible();

         await expandButton.click();
         await expect(firstCard).toHaveAttribute("data-expanded", "false");
      });

      test("should navigate to external article link when clicked", async({ page }) => {
         const firstCard = getNewsArticleCard(page, 0);

         const expandButton = page.getByTestId("news-article-expand-button-0");
         await expandButton.click();

         const linkButton = firstCard.locator("a[target=\"_blank\"]").last();
         const [newPage] = await Promise.all([
            page.context().waitForEvent("page"),
            linkButton.click()
         ]);

         expect(newPage.url()).toBeTruthy();
         await newPage.close();
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
            // Click link in sidebar using helper
            await clickSidebarLink(page, link);

            // Verify section is in viewport
            await expect(page.locator(`#${section}`)).toBeInViewport();
         });
      }

      test("should navigate to dashboard and scroll to economy from accounts page", async({ page }) => {
         // Navigate to accounts page
         await navigateToPath(page, ACCOUNTS_ROUTE);

         // Click economy link using helper
         await clickSidebarLink(page, "sidebar-link-economy");

         // Verify navigated to dashboard with hash
         await expect(page).toHaveURL(/\/dashboard#economy/);

         // Verify economy section is in viewport
         await expect(page.locator("#economy")).toBeInViewport();
      });

      test("should navigate to dashboard and scroll to news from budgets page", async({ page }) => {
         // Navigate to budgets page
         await navigateToPath(page, BUDGETS_ROUTE);

         // Click news link using helper
         await clickSidebarLink(page, "sidebar-link-news");

         // Verify navigated to dashboard with hash
         await expect(page).toHaveURL(/\/dashboard#news/);

         // Verify news section is in viewport
         await expect(page.locator("#news")).toBeInViewport();
      });

      test("should display economy and news sections with proper headings", async({ page }) => {
         // Verify the economy section contains expected elements
         const economySection = page.locator("#economy");
         await expect(economySection).toBeVisible();

         // Verify the stocks section is within economy
         const stocksSection = page.locator("#stocks");
         await expect(stocksSection).toBeVisible();

         // Verify the news section exists
         const newsSection = page.locator("#news");
         await expect(newsSection).toBeVisible();
      });
   });
});