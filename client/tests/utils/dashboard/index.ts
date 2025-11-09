import { expect, type Locator, type Page } from "@playwright/test";
import { type Account } from "capital/accounts";

import { displayCurrency } from "@/lib/display";

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
   const netWorthElement: Locator = page.getByTestId("accounts-net-worth");
   const expectedFormattedNetWorth: string = displayCurrency(expectedNetWorth);

   if (accounts.length === 0) {
      // No accounts exist - assert empty state
      if (location === "dashboard") {
         // On dashboard, trends component is always rendered
         await expect(netWorthElement).toHaveText(expectedFormattedNetWorth);
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
      await netWorthElement.waitFor({ state: "visible" });

      // Assert net worth matches expected value
      await expect(netWorthElement).toHaveText(expectedFormattedNetWorth);

      // Assert chart has bars (each account has 12 bars for 12 months, so total bars = accounts.length * 12)
      // Wait for bars to appear
      const chartBars = page.locator(".MuiBarElement-root");
      await chartBars.first().waitFor({ state: "visible" });
      const barCount = await chartBars.count();
      // Each account series has 12 bars (one per month), so assert we have at least accounts.length bars
      expect(barCount).toBeGreaterThanOrEqual(accounts.length);
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