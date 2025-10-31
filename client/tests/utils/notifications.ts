import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Verifies that a notification appears with the expected message, type, and can be dismissed
 *
 * @param {Page} page - Playwright page instance
 * @param {string} expectedMessage - The expected notification message text
 * @param {"success" | "error" | "warning" | "info"} type - The type of notification
 */
export async function assertNotificationStatus(page: Page, expectedMessage: string, type: "success" | "error" | "warning" | "info"): Promise<void> {
   const notificationLocator: Locator = page.getByTestId("notification");

   // Assert all of the notification properties
   await expect(notificationLocator).toBeVisible();
   await expect(notificationLocator).toContainText(expectedMessage);
   await expect(notificationLocator).toHaveAttribute("data-type", type);

   // Close the notification and assert it is no longer visible
   await notificationLocator.getByTestId("CloseIcon").click();
   await expect(notificationLocator).not.toBeVisible();
}