import { expect, type Locator, type Page } from "@playwright/test";
import { assertComponentIsVisible } from "@tests/utils";
import { type Account, LIABILITIES } from "capital/accounts";

import { displayCurrency } from "@/lib/display";
import { brand, red } from "@/styles/mui/colors";

/**
 * Asserts account trends including net worth, bar count, bar colors, and bar positions
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<Account>[]} accounts - Array of accounts to assert
 * @param {number} expectedNetWorth - Expected net worth value as a number
 * @param {"dashboard" | "accounts"} location - Location where trends are displayed
 * @param {(number | null)[][]} [monthlyBalances] - Optional array of 12-month balance arrays
 */
export async function assertAccountTrends(
   page: Page,
   accounts: Partial<Account>[],
   expectedNetWorth: number,
   location: "dashboard" | "accounts",
   monthlyBalances?: (number | null)[][]
): Promise<void> {
   const barChartValues: Locator = page.locator("[data-bar-chart-value]");
   const netWorthElement: Locator = page.getByTestId("accounts-net-worth");
   const expectedFormattedNetWorth: string = displayCurrency(expectedNetWorth);

   if (accounts.length === 0) {
      await expect(barChartValues).toHaveCount(0);

      if (location === "dashboard") {
         await expect(netWorthElement).toHaveText(expectedFormattedNetWorth);
         await assertComponentIsVisible(page, "empty-accounts-trends-overview");
      } else {
         await expect(netWorthElement).not.toBeVisible();
         await assertComponentIsVisible(page, "accounts-empty-message");
         await expect(page.getByTestId("accounts-empty-message")).toHaveText("No available accounts");
      }
   } else {
      // There should be a bar for each account every month of the current year
      const currentMonth: number = new Date().getMonth() + 1;
      await expect(barChartValues).toHaveCount(12 * accounts.length);

      // Assert net worth (current aggregation of all account balances)
      await expect(netWorthElement).toHaveText(expectedFormattedNetWorth);

      // Assert all bar chart colors (blue for assets, red for liabilities) and values (final expected value of the given month)
      for (let accountIndex = 0; accountIndex < accounts.length; accountIndex++) {
         const account: Partial<Account> = accounts[accountIndex];
         const bars: Locator = page.locator(`.MuiBarElement-series-${account.account_id}`);
         await expect(bars).toHaveCount(12);

         for (let i = 0; i < 12; i++) {
            const bar: Locator = page.locator(`[data-testid="accounts-${account.account_id}-bar-${i}"]`);
            const value: string | null = await bar.getAttribute("data-bar-chart-value");

            // Use monthly balances if provided, otherwise use current balance for all past months
            let expectedValue: string = "";

            if (monthlyBalances && monthlyBalances[accountIndex]) {
               const monthBalance: number | null = monthlyBalances[accountIndex][i];
               expectedValue = monthBalance === null ? "null" : monthBalance.toString();
            } else {
               expectedValue = i > currentMonth - 1 ? "null" : account.balance.toString();
            }

            expect(value).toBe(expectedValue);

            const expectedColor: string = LIABILITIES.has(account.type!) ? red[400] : brand[400];
            await expect(bar).toHaveAttribute("data-bar-chart-color", expectedColor);
         }
      }
   }
}

/**
 * Performs drag and drop operation from drag handle to drop target
 *
 * @param {Page} page - Playwright page instance
 * @param {Locator} dragHandle - Locator for the drag handle element
 * @param {Locator} dropTarget - Locator for the drop target element
 */
export async function dragAndDrop(
   page: Page,
   dragHandle: Locator,
   dropTarget: Locator
): Promise<void> {
   // Scroll the drag handle into view and hover over it to ensure it's visible
   await dragHandle.scrollIntoViewIfNeeded();
   await dragHandle.hover();

   // Get the bounding boxes of the drag handle and drop target elements
   const handleBox = await dragHandle.boundingBox();
   const targetBox = await dropTarget.boundingBox();

   if (!handleBox || !targetBox) {
      throw new Error("Bounding box missing");
   }

   // Determine the starting and ending coordinates for the drag and drop operation
   const startX = handleBox.x + handleBox.width / 2;
   const startY = handleBox.y + handleBox.height / 2;
   const endX = targetBox.x + targetBox.width / 2;
   const endY = targetBox.y + targetBox.height / 2;

   // Perform the drag and drop operation by mimicking a user mouse click and drag
   await page.mouse.move(startX, startY);
   await page.mouse.down();
   await page.waitForTimeout(150);
   await page.mouse.move(startX + 12, startY, { steps: 5 });
   await page.mouse.move(endX, endY, { steps: 20 });
   await page.waitForTimeout(300);
   await page.mouse.up();
}