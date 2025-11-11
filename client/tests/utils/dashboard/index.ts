import { expect, type Locator, type Page } from "@playwright/test";
import { LIABILITIES, type Account } from "capital/accounts";

import { displayCurrency } from "@/lib/display";
import { brand, red } from "@/styles/mui/colors";

/**
 * Asserts account trends including net worth, bar count, bar colors, and bar positions
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<Account>[]} accounts - Array of accounts to assert
 * @param {number} expectedNetWorth - Expected net worth value as a number
 * @param {"dashboard" | "accounts-page"} location - Location where trends are displayed
 */
export async function assertAccountTrends(
   page: Page,
   accounts: Partial<Account>[],
   expectedNetWorth: number,
   location: "dashboard" | "accounts-page"
): Promise<void> {
   const barChartValues: Locator = page.locator("[data-bar-chart-value]");
   const netWorthElement: Locator = page.getByTestId("accounts-net-worth");
   const expectedFormattedNetWorth: string = displayCurrency(expectedNetWorth);

   if (accounts.length === 0) {
      await expect(barChartValues).toHaveCount(0);

      if (location === "dashboard") {
         await expect(netWorthElement).toHaveText(expectedFormattedNetWorth);
         await expect(page.getByTestId("empty-accounts-trends-overview")).toBeVisible();
      } else {
         await expect(netWorthElement).not.toBeVisible();
         await expect(page.getByTestId("accounts-empty-message")).toBeVisible();
         await expect(page.getByTestId("accounts-empty-message")).toHaveText("No available accounts");
      }
   } else {
      // There should be 12 bars for each account
      const currentMonth = new Date().getMonth() + 1;
      await expect(barChartValues).toHaveCount(12 * accounts.length);

      // Assert net worth matches expected value
      await expect(netWorthElement).toHaveText(expectedFormattedNetWorth);

      for (const account of accounts) {
         const bars = page.locator(`.MuiBarElement-series-${account.account_id}`);
         await expect(bars).toHaveCount(12);

         for (let i = 0; i < 12; i++) {
            // Assert the account balance matches the expected value and color relative to the account type
            const bar: Locator = page.locator(`[data-testid="accounts-${account.account_id}-bar-${i}"]`);
            const value: string | null = await bar.getAttribute("data-bar-chart-value");

            const expectedValue = i > currentMonth - 1 ? "null" : account.balance.toString();
            expect(value).toBe(expectedValue);

            const expectedColor = LIABILITIES.has(account.type!) ? red[400] : brand[400];
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
   await dragHandle.scrollIntoViewIfNeeded();
   await dragHandle.hover();

   const handleBox = await dragHandle.boundingBox();
   const targetBox = await dropTarget.boundingBox();
   if (!handleBox || !targetBox) throw new Error("Bounding box missing");

   const startX = handleBox.x + handleBox.width / 2;
   const startY = handleBox.y + handleBox.height / 2;
   const endX = targetBox.x + targetBox.width / 2;
   const endY = targetBox.y + targetBox.height / 2;

   await page.mouse.move(startX, startY);
   await page.mouse.down();
   await page.waitForTimeout(150);
   await page.mouse.move(startX + 12, startY, { steps: 5 });
   await page.mouse.move(endX, endY, { steps: 20 });
   await page.waitForTimeout(300);
   await page.mouse.up();
}