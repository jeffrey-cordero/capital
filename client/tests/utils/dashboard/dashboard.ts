import type { Locator, Page } from "@playwright/test";
import { expect } from "@tests/fixtures";
import { assertInputVisibility } from "@tests/utils";
import type { Article, StockIndicator } from "capital/economy";

/**
 * Expected economy data values from backup file for E2E tests
 */
export const EXPECTED_DASHBOARD_DATA = {
   /** Last updated timestamp for stocks data */
   lastUpdated: "2025-12-03 16:16:00 US/Eastern",
   /** Stock data counts (all sections should have the same count) */
   stocks: {
      stocksCount: 20
   },
   /** Total news articles in the API response */
   newsArticlesCount: 25,
   /** Number of news articles actually displayed (top 20 after reversing) */
   newsDisplayedCount: 20,
   /** Economic indicator expected values */
   indicators: {
      /** Federal Interest Rate indicator data */
      federalInterestRate: {
         /** Start date of data range */
         from: "1954-07-01",
         /** End date of data range */
         to: "2025-11-01",
         /** Latest value display */
         value: "3.88%",
         /** Percentage change in Year view */
         yearPercent: "203.12%",
         /** Percentage change in Month view */
         monthPercent: "385.00%"
      },
      /** GDP indicator data */
      gdp: {
         from: "2002-01-01",
         to: "2025-04-01",
         value: "$5,943.38B",
         yearPercent: "60.08%",
         monthPercent: "69.76%"
      },
      /** Inflation indicator data */
      inflation: {
         from: "1960-01-01",
         to: "2024-01-01",
         value: "2.95%",
         yearPercent: "102.30%",
         monthPercent: "102.30%" // Annual data, same for both views
      },
      /** Unemployment indicator data */
      unemployment: {
         from: "1948-01-01",
         to: "2025-09-01",
         value: "4.40%",
         yearPercent: "10.00%",
         monthPercent: "29.41%"
      },
      /** Treasury Yield indicator data */
      treasuryYield: {
         from: "1953-04-01",
         to: "2025-11-01",
         value: "4.09%",
         yearPercent: "57.92%",
         monthPercent: "44.52%"
      }
   }
} as const;

/**
 * Gets the locator for a specific stock section container
 *
 * @param {Page} page - Playwright page instance
 * @param {"top-gainers" | "top-losers" | "most-active"} type - Stock section type
 * @returns {Locator} Locator for the stock section container
 */
export function getStockSection(page: Page, type: "top-gainers" | "top-losers" | "most-active"): Locator {
   return page.getByTestId(`stocks-${type}-container`);
}

/**
 * Gets the locator for a specific stock item within a section
 *
 * @param {Page} page - Playwright page instance
 * @param {"top-gainers" | "top-losers" | "most-active"} type - Stock section type
 * @param {number} index - Index of the stock
 * @returns {Locator} Locator for the stock item
 */
export function getStockItem(page: Page, type: "top-gainers" | "top-losers" | "most-active", index: number): Locator {
   return getStockSection(page, type).getByTestId(`stock-item-${index}`);
}

/**
 * Gets the locator for a specific news article card by index
 *
 * @param {Page} page - Playwright page instance
 * @param {number} index - Index of the news article
 * @returns {Locator} Locator for the news article card
 */
export function getNewsArticleCard(page: Page, index: number): Locator {
   return page.getByTestId(`news-article-container-${index}`);
}

/**
 * Gets the locator for all news article cards
 *
 * @param {Page} page - Playwright page instance
 * @returns {Locator} Locator for all news article cards
 */
export function getNewsArticleCards(page: Page): Locator {
   return page.locator("[data-testid^=\"news-article-container-\"]");
}

/**
 * Asserts the visibility and values of economic indicator form inputs
 *
 * @param {Page} page - Playwright page instance
 * @param {Object} expected - Expected values for indicator inputs
 * @param {string} expected.indicator - Expected indicator selection
 * @param {string} expected.view - Expected view selection (Year/Month)
 * @param {string} expected.from - Expected from date value
 * @param {string} expected.to - Expected to date value
 */
export async function assertIndicatorInputs(
   page: Page,
   expected: { indicator: string; view: string; from: string; to: string }
): Promise<void> {
   await assertInputVisibility(page, "indicator-select", "Indicator", expected.indicator);
   await assertInputVisibility(page, "view-select", "View", expected.view);

   await assertInputVisibility(page, "from-date", "From", expected.from);
   await assertInputVisibility(page, "to-date", "To", expected.to);
}

/**
 * Asserts empty trends display for accounts or budgets
 *
 * @param {Page} page - Playwright page instance
 * @param {"accounts" | "budgets"} type - Type of trends to assert
 */
export async function assertEmptyTrends(page: Page, type: "accounts" | "budgets"): Promise<void> {
   const expectedText = type === "accounts" ? "No available accounts" : "No available transactions";
   await expect(page.getByTestId(`empty-${type}-trends-overview`)).toBeVisible();
   await expect(page.getByTestId(`empty-${type}-trends-overview`)).toHaveText(expectedText);
}

/**
 * Asserts a news article card displays correct information
 *
 * @param {Page} page - Playwright page instance
 * @param {Article} article - Article data from API response
 * @param {number} index - Index of the article in the list
 */
export async function assertNewsArticleCard(page: Page, article: Article, index: number): Promise<void> {
   const card = getNewsArticleCard(page, index);

   // Assert card is visible
   await expect(card).toBeVisible();

   // Assert author initial in avatar
   const author = article.author || article.domain || "No Author";
   const authorInitial = author.charAt(0).toUpperCase();
   await expect(card.locator("[aria-label=\"author\"]")).toHaveText(authorInitial);

   // Assert publish date
   const publishDate = new Date(article.published).toLocaleString();
   await expect(card.getByText(publishDate)).toBeVisible();

   // Assert title is visible
   await expect(card.getByText(article.title)).toBeVisible();
}

/**
 * Asserts expanding and collapsing a news article card
 *
 * @param {Page} page - Playwright page instance
 * @param {Article} article - Article data from API response
 * @param {number} index - Index of the article in the list
 */
export async function assertNewsArticleExpansion(page: Page, article: Article, index: number): Promise<void> {
   const card = getNewsArticleCard(page, index);

   // Initially collapsed
   await expect(card).toHaveAttribute("data-expanded", "false");

   // Expand the article
   const expandButton = page.getByTestId(`news-article-expand-button-${index}`);
   await expandButton.click();
   await expect(card).toHaveAttribute("data-expanded", "true");

   // Assert full description is visible
   const description = article.text.replace(/(?<!\n)\n(?!\n)/g, "\n\n");
   await expect(card.getByText(description, { exact: false })).toBeVisible();

   // Assert external link is visible and has correct href
   const linkButton = card.locator("a[target=\"_blank\"]").last();
   await expect(linkButton).toHaveAttribute("href", article.url);

   // Collapse the article
   await expandButton.click();
   await expect(card).toHaveAttribute("data-expanded", "false");
}

/**
 * Asserts navigating to a news article external link
 *
 * @param {Page} page - Playwright page instance
 * @param {Article} article - Article data from API response
 * @param {number} index - Index of the article in the list
 */
export async function assertNewsArticleLink(page: Page, article: Article, index: number): Promise<void> {
   const card = getNewsArticleCard(page, index);

   // Expand the article first
   const expandButton = page.getByTestId(`news-article-expand-button-${index}`);
   await expandButton.click();

   // Click the external link
   const linkButton = card.locator("a[target=\"_blank\"]").last();
   const [newPage] = await Promise.all([
      page.context().waitForEvent("page"),
      linkButton.click()
   ]);

   // Verify the new page URL matches the article URL
   await expect(newPage).toHaveURL(article.url);
   await newPage.close();
}

/**
 * Asserts stock card displays correct information with proper chip color
 *
 * @param {Page} page - Playwright page instance
 * @param {StockIndicator} stock - Stock data from API response
 * @param {"success" | "error" | "default"} expectedChipColor - Expected MUI chip color variant
 * @param {string} type - Stock section type (top-gainers, top-losers, most-active)
 * @param {number} index - Index of the stock in the list
 */
export async function assertStockCard(
   page: Page,
   stock: StockIndicator,
   expectedChipColor: "success" | "error" | "default",
   type: string,
   index: number
): Promise<void> {
   const stockItem = getStockItem(page, type as "top-gainers" | "top-losers" | "most-active", index);

   const stockLink = stockItem.getByTestId(`stock-link-${type}-${index}`);
   await expect(stockLink).toBeVisible();
   await expect(stockLink).toHaveAttribute("href", `https://www.google.com/search?q=${stock.ticker}+stock`);

   const chipPercent = parseFloat(stock.change_percentage).toFixed(2) + "%";
   const chipTestId = `stock-percent-chip-${expectedChipColor}-${index}`;
   await expect(stockItem.getByTestId(chipTestId).filter({ hasText: chipPercent })).toBeVisible();

   const priceText = `$${Number(stock.price).toFixed(2)}`;
   await expect(stockItem.getByText(priceText, { exact: false })).toBeVisible();

   await expect(stockItem.getByText("shares")).toBeVisible();
}

/**
 * Asserts navigating to a stock's Google search link
 *
 * @param {Page} page - Playwright page instance
 * @param {StockIndicator} stock - Stock data from API response
 * @param {string} type - Stock section type (top-gainers, top-losers, most-active)
 * @param {number} index - Index of the stock in the list
 */
export async function assertStockLink(
   page: Page,
   stock: StockIndicator,
   type: string,
   index: number
): Promise<void> {
   const stockItem = getStockItem(page, type as "top-gainers" | "top-losers" | "most-active", index);
   const stockLink = stockItem.getByTestId(`stock-link-${type}-${index}`);

   const [newPage] = await Promise.all([
      page.context().waitForEvent("page"),
      stockLink.click()
   ]);

   expect(newPage.url()).toContain(`google.com/search?q=${stock.ticker}+stock`);
   await newPage.close();
}

/**
 * Calculates the expected chip color for a stock based on change percentage
 *
 * @param {string} changePercentage - The change percentage string (e.g., "123.45%")
 * @returns {"success" | "error" | "default"} The expected chip color variant
 */
export function getExpectedChipColor(changePercentage: string): "success" | "error" | "default" {
   const value = parseFloat(changePercentage);
   if (value > 0) return "success";
   if (value < 0) return "error";
   return "default";
}

/**
 * Asserts the last updated timestamp is displayed correctly
 *
 * @param {Page} page - Playwright page instance
 * @param {string} lastUpdated - Last updated timestamp string from API
 */
export async function assertLastUpdated(page: Page, lastUpdated: string): Promise<void> {
   const [date, time] = lastUpdated.split(" ");
   const formattedTimestamp = new Date(date + " " + time).toLocaleString();

   await expect(page.getByText("Last updated")).toBeVisible();
   await expect(page.getByText(formattedTimestamp)).toBeVisible();
}

/**
 * Switches the economic indicator selection
 *
 * @param {Page} page - Playwright page instance
 * @param {string} indicator - Indicator name to select
 */
export async function switchIndicator(page: Page, indicator: string): Promise<void> {
   const selectCombobox = page.locator("#mui-component-select-option").first();
   await selectCombobox.click();
   await page.getByRole("option", { name: indicator, exact: true }).click();
}

/**
 * Switches the view selection (Year/Month)
 *
 * @param {Page} page - Playwright page instance
 * @param {"Year" | "Month"} view - View to select
 */
export async function switchView(page: Page, view: "Year" | "Month"): Promise<void> {
   const selectCombobox = page.locator("#mui-component-select-view").first();
   await selectCombobox.click();
   await page.getByRole("option", { name: view, exact: true }).click();
}

/**
 * Asserts the economic indicator value and percentage chip for both Year and Month views
 *
 * @param {Page} page - Playwright page instance
 * @param {string} expectedValue - Expected value text (e.g., "$5,943.38B" or "3.88%")
 * @param {string} expectedYearPercentage - Expected percentage chip text for Year view (e.g., "60.08%")
 * @param {string} expectedMonthPercentage - Expected percentage chip text for Month view (e.g., "69.76%")
 */
export async function assertIndicatorValues(
   page: Page,
   expectedValue: string,
   expectedYearPercentage: string,
   expectedMonthPercentage: string
): Promise<void> {
   // Assert the main value is displayed (same for both views)
   await expect(page.locator("text=" + expectedValue).first()).toBeVisible();

   // Assert Year view percentage chip
   await expect(page.getByTestId("indicator-percent-chip")).toHaveText(expectedYearPercentage);

   // Switch to Month view
   await switchView(page, "Month");

   // Assert the main value remains the same
   await expect(page.locator("text=" + expectedValue).first()).toBeVisible();

   // Assert Month view percentage chip
   await expect(page.getByTestId("indicator-percent-chip")).toHaveText(expectedMonthPercentage);

   // Switch back to Year view for subsequent tests
   await switchView(page, "Year");
}