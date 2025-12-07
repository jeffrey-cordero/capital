import type { Page, Response } from "@playwright/test";
import { expect } from "@tests/fixtures";
import type { Dashboard } from "capital/dashboard";
import type { Article, StockIndicator } from "capital/economy";
import { HTTP_STATUS } from "capital/server";

/**
 * Expected data values from economy.json backup file used in E2E tests
 * These values are based on the static economy data served during test runs
 */
export const EXPECTED_DASHBOARD_DATA = {
   /** Last updated timestamp for stocks data */
   lastUpdated: "2025-12-03 16:16:00 US/Eastern",
   /** Stock data counts */
   stocks: {
      /** Number of top gainer stocks displayed */
      topGainersCount: 20,
      /** Number of top loser stocks displayed */
      topLosersCount: 20,
      /** Number of most active stocks displayed */
      mostActiveCount: 20
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
 * Captures the dashboard API response and returns the parsed data
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<Dashboard>} The dashboard data from the API response
 */
export async function captureDashboardResponse(page: Page): Promise<Dashboard> {
   const responsePromise = page.waitForResponse((response: Response) => {
      return response.url().includes("/api/v1/dashboard") && response.request().method() === "GET";
   });

   const response: Response = await responsePromise;
   expect(response.status()).toBe(HTTP_STATUS.OK);

   const responseBody = await response.json();
   return responseBody.data as Dashboard;
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
   // Assert the select inputs have the correct values
   await expect(page.locator("#option")).toHaveValue(expected.indicator);
   await expect(page.locator("#view")).toHaveValue(expected.view);

   // Assert the date inputs have the correct values
   await expect(page.locator("#from")).toHaveValue(expected.from);
   await expect(page.locator("#to")).toHaveValue(expected.to);
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
   const articleCards = page.locator("[id=\"news\"] > div[data-expanded]");
   const card = articleCards.nth(index);

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
 * Tests expanding and collapsing a news article card
 *
 * @param {Page} page - Playwright page instance
 * @param {Article} article - Article data from API response
 * @param {number} index - Index of the article in the list
 */
export async function testNewsArticleExpansion(page: Page, article: Article, index: number): Promise<void> {
   const articleCards = page.locator("[id=\"news\"] > div[data-expanded]");
   const card = articleCards.nth(index);

   // Initially collapsed
   await expect(card).toHaveAttribute("data-expanded", "false");

   // Expand the article
   const expandButton = card.locator("button[aria-label*=\"Expand\"]").or(card.locator("button").filter({ has: page.locator("svg") }).first());
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
 * Tests navigating to a news article external link
 *
 * @param {Page} page - Playwright page instance
 * @param {Article} article - Article data from API response
 * @param {number} index - Index of the article in the list
 */
export async function testNewsArticleLink(page: Page, article: Article, index: number): Promise<void> {
   const articleCards = page.locator("[id=\"news\"] > div[data-expanded]");
   const card = articleCards.nth(index);

   // Expand the article first
   const expandButton = card.locator("button[aria-label*=\"Expand\"]").or(card.locator("button").filter({ has: page.locator("svg") }).first());
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
 * @param {string} cardTitle - Title of the stock card (Top Gainers, Top Losers, Most Active)
 */
export async function assertStockCard(
   page: Page,
   stock: StockIndicator,
   expectedChipColor: "success" | "error" | "default",
   cardTitle: string
): Promise<void> {
   // Find the stock card section by title
   const cardSection = page.locator(`text=${cardTitle}`).locator("..").locator("..");

   // Find the specific stock ticker link within this section
   const stockLink = cardSection.getByRole("link", { name: stock.ticker });
   await expect(stockLink).toBeVisible();

   // Assert ticker link href
   await expect(stockLink).toHaveAttribute("href", `https://www.google.com/search?q=${stock.ticker}+stock`);

   // Find the parent container of the stock to verify other details
   const stockContainer = stockLink.locator("../..").locator("..");

   // Assert chip with percentage
   const chipPercent = parseFloat(stock.change_percentage).toFixed(2) + "%";
   const chipSelector = expectedChipColor === "success"
      ? ".MuiChip-colorSuccess"
      : expectedChipColor === "error"
         ? ".MuiChip-colorError"
         : ".MuiChip-colorDefault";

   await expect(stockContainer.locator(chipSelector).filter({ hasText: chipPercent })).toBeVisible();

   // Assert price is displayed
   const priceText = `$${Number(stock.price).toFixed(2)}`;
   await expect(stockContainer.getByText(priceText, { exact: false })).toBeVisible();

   // Assert shares volume is displayed
   await expect(stockContainer.getByText("shares")).toBeVisible();
}

/**
 * Tests navigating to a stock's Google search link
 *
 * @param {Page} page - Playwright page instance
 * @param {StockIndicator} stock - Stock data from API response
 * @param {string} cardTitle - Title of the stock card
 */
export async function testStockLink(
   page: Page,
   stock: StockIndicator,
   cardTitle: string
): Promise<void> {
   const cardSection = page.locator(`text=${cardTitle}`).locator("..").locator("..");
   const stockLink = cardSection.getByRole("link", { name: stock.ticker });

   const [newPage] = await Promise.all([
      page.context().waitForEvent("page"),
      stockLink.click()
   ]);

   // Verify the new page URL contains the Google search query
   await expect(newPage.url()).toContain(`google.com/search?q=${stock.ticker}+stock`);
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
   // Find the parent FormControl, then click the visible combobox button
   const selectInput = page.getByTestId("indicator-select");
   const formControl = selectInput.locator("..").locator("..");
   await formControl.getByRole("combobox").click();
   await page.getByRole("option", { name: indicator }).click();
}

/**
 * Switches the view selection (Year/Month)
 *
 * @param {Page} page - Playwright page instance
 * @param {"Year" | "Month"} view - View to select
 */
export async function switchView(page: Page, view: "Year" | "Month"): Promise<void> {
   // Find the parent FormControl, then click the visible combobox button
   const selectInput = page.getByTestId("view-select");
   const formControl = selectInput.locator("..").locator("..");
   await formControl.getByRole("combobox").click();
   await page.getByRole("option", { name: view }).click();
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
   await expect(page.locator(".MuiChip-root").filter({ hasText: expectedYearPercentage })).toBeVisible();

   // Switch to Month view
   await switchView(page, "Month");

   // Assert the main value remains the same
   await expect(page.locator("text=" + expectedValue).first()).toBeVisible();

   // Assert Month view percentage chip
   await expect(page.locator(".MuiChip-root").filter({ hasText: expectedMonthPercentage })).toBeVisible();

   // Switch back to Year view for subsequent tests
   await switchView(page, "Year");
}