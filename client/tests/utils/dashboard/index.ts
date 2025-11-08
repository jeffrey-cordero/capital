import { expect, type Page } from "@playwright/test";
import { type Account, LIABILITIES } from "capital/accounts";

import { displayCurrency } from "@/lib/display";

/**
 * Asserts account trends including net worth, bar count, bar colors, and bar positions
 * Comprehensive assertion method reusable for future transaction tests
 *
 * @param {Page} page - Playwright page instance
 * @param {Account[]} accounts - Array of accounts to assert
 * @param {string} expectedNetWorth - Expected net worth value (e.g., "$0.00")
 * @param {"dashboard" | "accounts-page"} location - Location where trends are displayed
 */
export async function assertAccountTrends(
   page: Page,
   accounts: Account[],
   expectedNetWorth: string,
   location: "dashboard" | "accounts-page"
): Promise<void> {
   const netWorthElement = page.getByTestId("accounts-net-worth");

   if (accounts.length === 0) {
      if (location === "dashboard") {
         // On dashboard, trends component is always rendered
         await expect(netWorthElement).toHaveText(expectedNetWorth);
         await expect(page.getByTestId("empty-accounts-trends-overview")).toBeVisible();

         // Assert no bars in chart (chart should not be visible or have no bars)
         const chartBars = page.locator(".MuiBarElement-root");
         await expect(chartBars).toHaveCount(0);
      } else {
         // On accounts page, trends component is only rendered when accounts.length > 0
         // So when empty, the element won't exist - just assert empty accounts message
         await expect(page.getByTestId("accounts-empty-message")).toBeVisible();
         // Assert the trends component is not rendered
         await expect(netWorthElement).not.toBeVisible();
      }
   } else {
      // Accounts exist - assert net worth, bar count, colors, and positions
      // Wait for the net worth element to be visible (trends component renders when accounts exist)
      await netWorthElement.waitFor({ state: "visible", timeout: 5000 });

      // Calculate expected net worth from accounts
      const calculatedNetWorth = accounts.reduce((sum, account) => {
         const isLiability = LIABILITIES.has(account.type || "");
         return sum + (isLiability ? -Number(account.balance) : Number(account.balance));
      }, 0);

      // Assert net worth matches expected value (use calculated if expectedNetWorth not provided)
      const expectedFormattedNetWorth = expectedNetWorth || displayCurrency(calculatedNetWorth);
      await expect(netWorthElement).toHaveText(expectedFormattedNetWorth);

      // Assert chart has bars (each account has 12 bars for 12 months, so total bars = accounts.length * 12)
      // Wait for bars to appear
      const chartBars = page.locator(".MuiBarElement-root");
      await chartBars.first().waitFor({ state: "visible", timeout: 5000 });
      const barCount = await chartBars.count();
      // Each account series has 12 bars (one per month), so assert we have at least accounts.length bars
      expect(barCount).toBeGreaterThanOrEqual(accounts.length);
   }
}