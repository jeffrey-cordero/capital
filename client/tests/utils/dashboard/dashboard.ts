import type { Locator, Page, Response } from "@playwright/test";
import { expect } from "@tests/fixtures";
import { assertComponentIsVisible, assertInputVisibility } from "@tests/utils";
import type { Dashboard } from "capital/dashboard";
import type { Article, StockIndicator } from "capital/economy";
import { HTTP_STATUS } from "capital/server";

import { displayVolume } from "@/lib/display";

/**
 * Expected economy data values from the test backup file
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
   return page.waitForResponse((response: Response) =>
      response.url().includes("/api/v1/dashboard")
         && response.request().method() === "GET")
      .then(async(response) => {
         expect(response.status()).toBe(HTTP_STATUS.OK);
         const responseBody = await response.json();
         return responseBody.data as Dashboard;
      });
}

/**
 * Gets the locator for a stock item within a specific stock section by its index
 *
 * @param {Page} page - Playwright page instance
 * @param {"top-gainers" | "top-losers" | "most-active"} type - Stock section type
 * @param {number} index - Stock index
 * @returns {Locator} Stock item locator
 */
export function getStockItem(page: Page, type: "top-gainers" | "top-losers" | "most-active", index: number): Locator {
   return page.getByTestId(`stocks-${type}-container`).getByTestId(`stock-item-${index}`);
}

/**
 * Gets the locator for a news article card by its index
 *
 * @param {Page} page - Playwright page instance
 * @param {number} index - Article index
 * @returns {Locator} News article card locator
 */
export function getNewsArticleCard(page: Page, index: number): Locator {
   return page.getByTestId(`news-article-container-${index}`);
}

/**
 * Asserts empty trends display for accounts or budgets
 *
 * @param {Page} page - Playwright page instance
 * @param {"accounts" | "budgets"} type - Trends type
 */
export async function assertEmptyTrends(page: Page, type: "accounts" | "budgets"): Promise<void> {
   const expectedText = type === "accounts" ? "No available accounts" : "No available transactions";
   await assertComponentIsVisible(page, `empty-${type}-trends-overview`, expectedText);
}

/**
 * Asserts a news article card displays the correct author, publish date, title, and description
 * for a specific article by its index
 *
 * @param {Page} page - Playwright page instance
 * @param {Article} article - Article data from API
 * @param {number} index - Article index
 */
export async function assertNewsArticleCard(page: Page, article: Article, index: number): Promise<void> {
   const card: Locator = getNewsArticleCard(page, index);
   await expect(card).toBeVisible();

   const title: string = article.title || "No Title";
   const author: string = article.author || article.domain || "No Author";
   const authorInitial: string = author.charAt(0).toUpperCase();
   const publishDate: string = new Date(article.published).toLocaleString();

   await assertComponentIsVisible(page, `news-article-author-avatar-${index}`, authorInitial);
   await assertComponentIsVisible(page, `news-article-author-${index}`, author);
   await assertComponentIsVisible(page, `news-article-publish-date-${index}`, publishDate);
   await assertComponentIsVisible(page, `news-article-title-${index}`, title);
}

/**
 * Asserts news article expansion and collapse behavior for a specific article by its index
 *
 * @param {Page} page - Playwright page instance
 * @param {Article} article - Article data from API
 * @param {number} index - Article index
 */
export async function assertNewsArticleExpansion(page: Page, article: Article, index: number): Promise<void> {
   const card: Locator = getNewsArticleCard(page, index);
   await expect(card).toHaveAttribute("data-expanded", "false");

   // Expand the article
   const expandButton: Locator = page.getByTestId(`news-article-expand-button-${index}`);
   await expandButton.click();
   await expect(card).toHaveAttribute("data-expanded", "true");

   // Ensure the article description and external link button become visible when expanded
   const description: Locator = card.getByTestId(`news-article-description-${index}`);
   const descriptionText: string = article.text.replace(/(?<!\n)\n(?!\n)/g, "\n\n");
   await expect(description).toHaveText(descriptionText);

   const linkButton: Locator = card.getByTestId(`news-article-link-${index}`);
   await expect(linkButton).toHaveAttribute("href", article.url);
   await expect(linkButton).toHaveAttribute("target", "_blank");
}

/**
 * Asserts stock card displays the correct link, percentage chip, price, and volume
 * for a specific stock by its index within a specific stock section
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
   const stockItem: Locator = getStockItem(page, type as "top-gainers" | "top-losers" | "most-active", index);

   const stockLink: Locator = stockItem.getByTestId(`stock-link-${type}-${index}`);
   await expect(stockLink).toBeVisible();
   await expect(stockLink).toHaveAttribute("href", `https://www.google.com/search?q=${stock.ticker}+stock`);

   const expectedChipColor: "success" | "error" | "default" = getExpectedChipColor(stock.change_percentage);
   const chipTestId: string = `stock-percent-chip-${expectedChipColor}-${index}`;
   const chipPercent: string = parseFloat(stock.change_percentage).toFixed(2) + "%";
   await expect(stockItem.getByTestId(chipTestId).filter({ hasText: chipPercent })).toBeVisible();

   const changeAmount: number = Number(stock.change_amount);
   const priceChange: string = `${changeAmount < 0 ? "-" : "+"}${Math.abs(changeAmount).toFixed(2)}`;
   const priceText: string = `$${stock.price.toFixed(2)} (${priceChange})`;
   const priceTestId: string = `stock-price-${type}-${index}`;
   await expect(stockItem.getByTestId(priceTestId)).toHaveText(priceText);

   const volumeText: string = `${displayVolume(Number(stock.volume))} shares`;
   const volumeTestId: string = `stock-volume-${type}-${index}`;
   await expect(stockItem.getByTestId(volumeTestId)).toHaveText(volumeText);
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
   const formattedTimestamp: string = new Date(date + " " + time).toLocaleString();

   await assertComponentIsVisible(page, "last-updated-label", "Last updated");
   await assertComponentIsVisible(page, "last-updated-timestamp", formattedTimestamp);
}

/**
 * Switches the economic indicator selection
 *
 * @param {Page} page - Playwright page instance
 * @param {string} indicator - Indicator name
 */
export async function switchIndicator(page: Page, indicator: string): Promise<void> {
   const selectCombobox: Locator = page.locator("#mui-component-select-option").first();
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
   const selectCombobox: Locator = page.locator("#mui-component-select-view").first();
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
   await assertComponentIsVisible(page, "indicator-value", expectedValue);
   await assertComponentIsVisible(page, "indicator-percent-chip", expectedYearPercentage);

   await switchView(page, "Month");
   await assertComponentIsVisible(page, "indicator-value", expectedValue);
   await assertComponentIsVisible(page, "indicator-percent-chip", expectedMonthPercentage);

   await switchView(page, "Year");
}

/**
 * Asserts complete indicator state including values, percentages, and form inputs,
 * which requires the current view to be Year
 *
 * @param {Page} page - Playwright page instance
 * @param {string} indicator - Indicator name
 */
export async function assertIndicatorState(page: Page, indicator: string): Promise<void> {
   const indicatorMap: Record<string, keyof typeof EXPECTED_DASHBOARD_DATA.indicators> = {
      "Federal Interest Rate": "federalInterestRate",
      "GDP": "gdp",
      "Inflation": "inflation",
      "Unemployment": "unemployment",
      "Treasury Yield": "treasuryYield"
   };

   const key = indicatorMap[indicator];
   const data = EXPECTED_DASHBOARD_DATA.indicators[key];
   const { from, to, value, yearPercent, monthPercent } = data;

   await assertIndicatorValues(page, value, yearPercent, monthPercent);
   await assertIndicatorInputs(page, { indicator, view: "Year", from, to });
}