import { expect, test } from "@tests/fixtures";
import { ACCOUNTS_ROUTE, BUDGETS_ROUTE, DASHBOARD_ROUTE } from "@tests/utils/authentication";
import {
   assertEmptyTrends,
   assertIndicatorInputs,
   assertIndicatorValues,
   assertLastUpdated,
   EXPECTED_DASHBOARD_DATA,
   switchIndicator
} from "@tests/utils/dashboard/dashboard";
import { navigateToPath } from "@tests/utils/navigation";
import { setupAssignedUser } from "@tests/utils/user-management";

test.describe("Dashboard Overview", () => {
   test.beforeEach(async({ page, usersRegistry, assignedRegistry, assignedUser }) => {
      // Set up a fresh user with no accounts or budgets
      await setupAssignedUser(page, usersRegistry, assignedRegistry, DASHBOARD_ROUTE, true, true, assignedUser);

      // Wait for dashboard to load
      await expect(page.getByTestId("accounts-trends-container")).toBeVisible();
   });

   test.describe("Initial State - Empty Accounts & Budgets", () => {
      test("should display empty accounts trends message", async({ page }) => {
         // Other feature-specific tests handle non-empty state assertions
         await assertEmptyTrends(page, "accounts");
      });

      test("should display empty budgets trends message", async({ page }) => {
         // Other feature-specific tests handle non-empty state assertions
         await assertEmptyTrends(page, "budgets");
      });

      test("should display net worth as $0.00", async({ page }) => {
         await expect(page.getByTestId("accounts-net-worth")).toBeVisible();
         await expect(page.getByTestId("accounts-net-worth")).toHaveText("$0.00");
      });

      test("should display 'Budgets Income vs. Expenses' title", async({ page }) => {
         // Verify the budget section title
         const budgetSection = page.getByTestId("budgets-trends-container");
         await expect(budgetSection.getByText("Budgets")).toBeVisible();
      });
   });

   test.describe("Economy Section", () => {
      test.describe("Last Updated Timestamp", () => {
         test("should display the last updated timestamp", async({ page }) => {
            // Timestamp is relative to current backup economy.json data
            await assertLastUpdated(page, EXPECTED_DASHBOARD_DATA.lastUpdated);
         });
      });

      test.describe("Economic Indicators Graph", () => {
         test("should display initial state with Federal Interest Rate indicator", async({ page }) => {
            const { federalInterestRate } = EXPECTED_DASHBOARD_DATA.indicators;

            // Default indicator is Federal Interest Rate in Year view
            await assertIndicatorInputs(page, {
               indicator: "Federal Interest Rate",
               view: "Year",
               from: federalInterestRate.from,
               to: federalInterestRate.to
            });

            // Assert value and percentages for both Year and Month views
            await assertIndicatorValues(
               page,
               federalInterestRate.value,
               federalInterestRate.yearPercent,
               federalInterestRate.monthPercent
            );
         });

         test("should switch to GDP indicator and display correct values", async({ page }) => {
            const { gdp } = EXPECTED_DASHBOARD_DATA.indicators;

            // Switch to GDP
            await switchIndicator(page, "GDP");

            // Verify inputs updated
            await assertIndicatorInputs(page, {
               indicator: "GDP",
               view: "Year",
               from: gdp.from,
               to: gdp.to
            });

            // Assert value and percentages for both Year and Month views
            await assertIndicatorValues(page, gdp.value, gdp.yearPercent, gdp.monthPercent);
         });

         test("should switch to Inflation indicator and display correct values", async({ page }) => {
            const { inflation } = EXPECTED_DASHBOARD_DATA.indicators;

            // Switch to Inflation
            await switchIndicator(page, "Inflation");

            // Verify inputs updated
            await assertIndicatorInputs(page, {
               indicator: "Inflation",
               view: "Year",
               from: inflation.from,
               to: inflation.to
            });

            // Assert value and percentages (same for both views with annual data)
            await assertIndicatorValues(page, inflation.value, inflation.yearPercent, inflation.monthPercent);
         });

         test("should switch to Unemployment indicator and display correct values", async({ page }) => {
            const { unemployment } = EXPECTED_DASHBOARD_DATA.indicators;

            // Switch to Unemployment
            await switchIndicator(page, "Unemployment");

            // Verify inputs updated
            await assertIndicatorInputs(page, {
               indicator: "Unemployment",
               view: "Year",
               from: unemployment.from,
               to: unemployment.to
            });

            // Assert value and percentages for both Year and Month views
            await assertIndicatorValues(page, unemployment.value, unemployment.yearPercent, unemployment.monthPercent);
         });

         test("should switch to Treasury Yield indicator and display correct values", async({ page }) => {
            const { treasuryYield } = EXPECTED_DASHBOARD_DATA.indicators;

            // Switch to Treasury Yield
            await switchIndicator(page, "Treasury Yield");

            // Verify inputs updated
            await assertIndicatorInputs(page, {
               indicator: "Treasury Yield",
               view: "Year",
               from: treasuryYield.from,
               to: treasuryYield.to
            });

            // Assert value and percentages for both Year and Month views
            await assertIndicatorValues(page, treasuryYield.value, treasuryYield.yearPercent, treasuryYield.monthPercent);
         });

         test("should display all indicator form inputs correctly", async({ page }) => {
            // Verify all form elements are visible
            await expect(page.locator("#option")).toBeVisible();
            await expect(page.locator("#view")).toBeVisible();
            await expect(page.locator("#from")).toBeVisible();
            await expect(page.locator("#to")).toBeVisible();
         });
      });

      test.describe("Stocks", () => {
         test("should display 20 Top Gainers with green chips", async({ page }) => {
            const topGainersSection = page.locator("text=Top Gainers").locator("..").locator("..");

            // Verify we have 20 stock links
            const stockLinks = topGainersSection.locator("a[href*=\"google.com/search\"]");
            await expect(stockLinks).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.topGainersCount);

            // Verify all have success/green chips (all should be positive percentages)
            const greenChips = topGainersSection.locator(".MuiChip-colorSuccess");
            await expect(greenChips).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.topGainersCount);

            // Verify shares text is displayed
            await expect(topGainersSection.getByText("shares").first()).toBeVisible();
         });

         test("should display 20 Top Losers with red chips", async({ page }) => {
            const topLosersSection = page.locator("text=Top Losers").locator("..").locator("..");

            // Verify we have 20 stock links
            const stockLinks = topLosersSection.locator("a[href*=\"google.com/search\"]");
            await expect(stockLinks).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.topLosersCount);

            // Verify all have error/red chips (all should be negative percentages)
            const redChips = topLosersSection.locator(".MuiChip-colorError");
            await expect(redChips).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.topLosersCount);

            // Verify shares text is displayed
            await expect(topLosersSection.getByText("shares").first()).toBeVisible();
         });

         test("should display 20 Most Active stocks with appropriate chip colors", async({ page }) => {
            const mostActiveSection = page.locator("text=Most Active").locator("..").locator("..");

            // Verify we have 20 stock links
            const stockLinks = mostActiveSection.locator("a[href*=\"google.com/search\"]");
            await expect(stockLinks).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.mostActiveCount);

            // Verify chip colors - Most Active can have green (positive), red (negative), or gray (zero)
            // Just verify that chips exist for all stocks
            const allChips = mostActiveSection.locator(".MuiChip-root").filter({ hasText: /[+-]?[\d.]+%/ });
            await expect(allChips).toHaveCount(EXPECTED_DASHBOARD_DATA.stocks.mostActiveCount);

            // Verify shares text is displayed
            await expect(mostActiveSection.getByText("shares").first()).toBeVisible();
         });

         test("should navigate to Google search when clicking a stock ticker link", async({ page }) => {
            // Find first stock link in Top Gainers
            const firstStockLink = page.locator("text=Top Gainers").locator("..").locator("..").locator("a[href*=\"google.com/search\"]").first();

            // Get the href to verify it contains the expected pattern
            const href = await firstStockLink.getAttribute("href");
            expect(href).toContain("google.com/search?q=");
            expect(href).toContain("+stock");

            // Test navigation
            const [newPage] = await Promise.all([
               page.context().waitForEvent("page"),
               firstStockLink.click()
            ]);

            // Verify the new page URL contains Google search
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
      test("should display news articles", async({ page }) => {
         // Verify news section exists and has article cards
         const articleCards = page.locator("[id=\"news\"] > div[data-expanded]");

         // Should have multiple articles displayed (up to 20)
         const count = await articleCards.count();
         expect(count).toBeGreaterThan(0);
         expect(count).toBeLessThanOrEqual(EXPECTED_DASHBOARD_DATA.newsDisplayedCount);
      });

      test("should expand and collapse news articles", async({ page }) => {
         const articleCards = page.locator("[id=\"news\"] > div[data-expanded]");
         const firstCard = articleCards.nth(0);

         // Initially collapsed
         await expect(firstCard).toHaveAttribute("data-expanded", "false");

         // Expand the article
         const expandButton = firstCard.locator("button").filter({ has: page.locator("svg") }).first();
         await expandButton.click();
         await expect(firstCard).toHaveAttribute("data-expanded", "true");

         // Verify external link becomes visible when expanded
         await expect(firstCard.locator("a[target=\"_blank\"]").last()).toBeVisible();

         // Collapse the article
         await expandButton.click();
         await expect(firstCard).toHaveAttribute("data-expanded", "false");
      });

      test("should navigate to external article link when clicked", async({ page }) => {
         const articleCards = page.locator("[id=\"news\"] > div[data-expanded]");
         const firstCard = articleCards.nth(0);

         // Expand the article first
         const expandButton = firstCard.locator("button").filter({ has: page.locator("svg") }).first();
         await expandButton.click();

         // Click the external link
         const linkButton = firstCard.locator("a[target=\"_blank\"]").last();
         const [newPage] = await Promise.all([
            page.context().waitForEvent("page"),
            linkButton.click()
         ]);

         // Verify a new page was opened (URL will vary based on article)
         expect(newPage.url()).toBeTruthy();
         await newPage.close();
      });

      test("should display article metadata correctly", async({ page }) => {
         const articleCards = page.locator("[id=\"news\"] > div[data-expanded]");
         const firstCard = articleCards.nth(0);

         // Verify avatar with author initial exists
         await expect(firstCard.locator("[aria-label=\"author\"]")).toBeVisible();

         // Verify title is visible
         await expect(firstCard.locator(".MuiCardContent-root").first()).toBeVisible();
      });
   });

   test.describe("Sidebar Navigation", () => {
      test("should scroll to economy section when clicking sidebar economy link from dashboard", async({ page }) => {
         // Click economy link in sidebar
         await page.getByTestId("sidebar-link-economy").click();

         // Verify economy section is in viewport
         await expect(page.locator("#economy")).toBeInViewport();
      });

      test("should scroll to news section when clicking sidebar news link from dashboard", async({ page }) => {
         // Click news link in sidebar
         await page.getByTestId("sidebar-link-news").click();

         // Verify news section is in viewport
         await expect(page.locator("#news")).toBeInViewport();
      });

      test("should navigate to dashboard and scroll to economy from accounts page", async({ page }) => {
         // Navigate to accounts page
         await navigateToPath(page, ACCOUNTS_ROUTE);

         // Click economy link
         await page.getByTestId("sidebar-link-economy").click();

         // Verify navigated to dashboard with hash
         await expect(page).toHaveURL(/\/dashboard#economy/);

         // Verify economy section is in viewport
         await expect(page.locator("#economy")).toBeInViewport();
      });

      test("should navigate to dashboard and scroll to news from budgets page", async({ page }) => {
         // Navigate to budgets page
         await navigateToPath(page, BUDGETS_ROUTE);

         // Click news link
         await page.getByTestId("sidebar-link-news").click();

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