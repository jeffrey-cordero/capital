import type { Locator, Page } from "@playwright/test";
import { expect } from "@tests/fixtures";
import { assertInputVisibility } from "@tests/utils";
import type { Article, StockIndicator } from "capital/economy";
import type { Dashboard } from "capital/dashboard";
import { HTTP_STATUS } from "capital/server";
import { displayVolume } from "@/lib/display";

/**
 * Expected economy data values from backup file for end-to-end tests
 */
export const EXPECTED_DASHBOARD_DATA = {
   lastUpdated: "2025-12-03 16:16:00 US/Eastern",
   stocks: {
      stocksCount: 20
   },
   newsArticlesCount: 25,
   newsDisplayedCount: 20,
   indicators: {
      federalInterestRate: {
         from: "1954-07-01",
         to: "2025-11-01",
         value: "3.88%",
         yearPercent: "203.12%",
         monthPercent: "385.00%"
      },
      gdp: {
         from: "2002-01-01",
         to: "2025-04-01",
         value: "$5,943.38B",
         yearPercent: "60.08%",
         monthPercent: "69.76%"
      },
      inflation: {
         from: "1960-01-01",
         to: "2024-01-01",
         value: "2.95%",
         yearPercent: "102.30%",
         monthPercent: "102.30%"
      },
      unemployment: {
         from: "1948-01-01",
         to: "2025-09-01",
         value: "4.40%",
         yearPercent: "10.00%",
         monthPercent: "29.41%"
      },
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
 * Captures the dashboard API response and returns the parsed dashboard data
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<Dashboard>} Dashboard data from API response
 */
export async function captureDashboardResponse(page: Page): Promise<Dashboard> {
   return page.waitForResponse((response) => response.url().includes("/api/v1/dashboard") && response.request().method() === "GET")
      .then(async(response) => {
         expect(response.status()).toBe(HTTP_STATUS.OK);
         const responseBody = await response.json();
         return responseBody.data as Dashboard;
      });
}

/**
 * Gets the locator for a stock section
 *
 * @param {Page} page - Playwright page instance
 * @param {"top-gainers" | "top-losers" | "most-active"} type - Stock section type
 * @returns {Locator} Stock section locator
 */
export function getStockSection(page: Page, type: "top-gainers" | "top-losers" | "most-active"): Locator {
   return page.getByTestId(`stocks-${type}-container`);
}

/**
 * Gets the locator for a stock item
 *
 * @param {Page} page - Playwright page instance
 * @param {"top-gainers" | "top-losers" | "most-active"} type - Stock section type
 * @param {number} index - Stock index
 * @returns {Locator} Stock item locator
 */
export function getStockItem(page: Page, type: "top-gainers" | "top-losers" | "most-active", index: number): Locator {
   return getStockSection(page, type).getByTestId(`stock-item-${index}`);
}

/**
 * Gets the locator for a news article card
 *
 * @param {Page} page - Playwright page instance
 * @param {number} index - Article index
 * @returns {Locator} News article card locator
 */
export function getNewsArticleCard(page: Page, index: number): Locator {
   return page.getByTestId(`news-article-container-${index}`);
}

/**
 * Gets locators for all news article cards
 *
 * @param {Page} page - Playwright page instance
 * @returns {Locator} All news article cards locator
 */
export function getNewsArticleCards(page: Page): Locator {
   return page.locator("[data-testid^=\"news-article-container-\"]");
}

/**
 * Asserts empty trends display for accounts or budgets
 *
 * @param {Page} page - Playwright page instance
 * @param {"accounts" | "budgets"} type - Trends type
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
 * @param {Article} article - Article data from API
 * @param {number} index - Article index
 */
export async function assertNewsArticleCard(page: Page, article: Article, index: number): Promise<void> {
   const card = getNewsArticleCard(page, index);
   await expect(card).toBeVisible();

   const author = article.author || article.domain || "No Author";
   const authorInitial = author.charAt(0).toUpperCase();
   const publishDate = new Date(article.published).toLocaleString();

   await expect(card.getByTestId(`news-article-author-avatar-${index}`)).toHaveText(authorInitial);
   await expect(card.getByTestId(`news-article-author-${index}`)).toHaveText(author);
   await expect(card.getByTestId(`news-article-publish-date-${index}`)).toHaveText(publishDate);
   await expect(card.getByTestId(`news-article-title-${index}`)).toHaveText(article.title);
}

/**
 * Asserts news article expansion and collapse behavior
 *
 * @param {Page} page - Playwright page instance
 * @param {Article} article - Article data from API
 * @param {number} index - Article index
 */
export async function assertNewsArticleExpansion(page: Page, article: Article, index: number): Promise<void> {
   const card = getNewsArticleCard(page, index);

   await expect(card).toHaveAttribute("data-expanded", "false");

   const expandButton = page.getByTestId(`news-article-expand-button-${index}`);
   await expandButton.click();
   await expect(card).toHaveAttribute("data-expanded", "true");

   const description = article.text.replace(/(?<!\n)\n(?!\n)/g, "\n\n");
   await expect(card.getByText(description, { exact: false })).toBeVisible();

   const linkButton = card.getByTestId(`news-article-link-${index}`);
   await expect(linkButton).toHaveAttribute("href", article.url);

   await expandButton.click();
   await expect(card).toHaveAttribute("data-expanded", "false");
}

/**
 * Asserts news article external link navigation
 *
 * @param {Page} page - Playwright page instance
 * @param {Article} article - Article data from API
 * @param {number} index - Article index
 */
export async function assertNewsArticleLink(page: Page, article: Article, index: number): Promise<void> {
   const card = getNewsArticleCard(page, index);

   const expandButton = page.getByTestId(`news-article-expand-button-${index}`);
   await expandButton.click();

   const linkButton = card.getByTestId(`news-article-link-${index}`);
   const [newPage] = await Promise.all([
      page.context().waitForEvent("page"),
      linkButton.click()
   ]);

   await expect(newPage).toHaveURL(article.url);
   await newPage.close();
}

/**
 * Asserts stock card displays correct information
 *
 * @param {Page} page - Playwright page instance
 * @param {StockIndicator} stock - Stock data from API
 * @param {string} type - Stock section type
 * @param {number} index - Stock index
 */
export async function assertStockCard(
   page: Page,
   stock: StockIndicator,
   type: string,
   index: number
): Promise<void> {
   const stockItem = getStockItem(page, type as "top-gainers" | "top-losers" | "most-active", index);

   const stockLink = stockItem.getByTestId(`stock-link-${type}-${index}`);
   await expect(stockLink).toBeVisible();
   await expect(stockLink).toHaveAttribute("href", `https://www.google.com/search?q=${stock.ticker}+stock`);

   const expectedChipColor = getExpectedChipColor(stock.change_percentage);
   const chipPercent = parseFloat(stock.change_percentage).toFixed(2) + "%";
   const chipTestId = `stock-percent-chip-${expectedChipColor}-${index}`;
   await expect(stockItem.getByTestId(chipTestId).filter({ hasText: chipPercent })).toBeVisible();

   const priceText = `$${Number(stock.price).toFixed(2)}`;
   await expect(stockItem.getByText(priceText, { exact: false })).toBeVisible();

   const volumeText = `${displayVolume(Number(stock.volume))} shares`;
   await expect(stockItem.getByText(volumeText)).toBeVisible();
}

/**
 * Asserts stock link navigation to Google search
 *
 * @param {Page} page - Playwright page instance
 * @param {StockIndicator} stock - Stock data from API
 * @param {string} type - Stock section type
 * @param {number} index - Stock index
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
 * Calculates the expected chip color for a stock
 *
 * @param {string} changePercentage - Change percentage string
 * @returns {"success" | "error" | "default"} Expected chip color variant
 */
export function getExpectedChipColor(changePercentage: string): "success" | "error" | "default" {
   const value = parseFloat(changePercentage);
   switch (true) {
      case value > 0:
         return "success";
      case value < 0:
         return "error";
      default:
         return "default";
   }
}

/**
 * Asserts last updated timestamp display
 *
 * @param {Page} page - Playwright page instance
 * @param {string} lastUpdated - Last updated timestamp from API
 */
export async function assertLastUpdated(page: Page, lastUpdated: string): Promise<void> {
   const [date, time] = lastUpdated.split(" ");
   const formattedTimestamp = new Date(date + " " + time).toLocaleString();

   await expect(page.getByTestId("last-updated-label")).toHaveText("Last updated");
   await expect(page.getByTestId("last-updated-timestamp")).toHaveText(formattedTimestamp);
}

/**
 * Switches the economic indicator selection
 *
 * @param {Page} page - Playwright page instance
 * @param {string} indicator - Indicator name
 */
export async function switchIndicator(page: Page, indicator: string): Promise<void> {
   const selectCombobox = page.locator("#mui-component-select-option").first();
   await selectCombobox.click();
   await page.getByRole("option", { name: indicator, exact: true }).click();
}

/**
 * Switches the view selection
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
 * Asserts indicator form inputs are visible with correct values
 *
 * @param {Page} page - Playwright page instance
 * @param {Object} expected - Expected input values
 * @param {string} expected.indicator - Expected indicator selection
 * @param {string} expected.view - Expected view selection
 * @param {string} expected.from - Expected from date
 * @param {string} expected.to - Expected to date
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
 * Asserts indicator value and percentage chip for both Year and Month views
 *
 * @param {Page} page - Playwright page instance
 * @param {string} expectedValue - Expected value text
 * @param {string} expectedYearPercentage - Expected Year view percentage
 * @param {string} expectedMonthPercentage - Expected Month view percentage
 */
export async function assertIndicatorValues(
   page: Page,
   expectedValue: string,
   expectedYearPercentage: string,
   expectedMonthPercentage: string
): Promise<void> {
   await expect(page.getByTestId("indicator-value")).toContainText(expectedValue);
   await expect(page.getByTestId("indicator-percent-chip")).toHaveText(expectedYearPercentage);

   await switchView(page, "Month");
   await expect(page.getByTestId("indicator-value")).toContainText(expectedValue);
   await expect(page.getByTestId("indicator-percent-chip")).toHaveText(expectedMonthPercentage);

   await switchView(page, "Year");
}
