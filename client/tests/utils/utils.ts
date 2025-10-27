import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Gets the notification locator for notifications, targets the
 * data-testid="notification" attribute on notification elements
 *
 * @param {Page} page - Playwright page instance
 * @returns {Locator} Locator for the notification container
 */
const getNotificationLocator = (page: Page): Locator => {
   return page.getByTestId("notification");
};

/**
 * Verifies that a success notification appears with the expected message and type,
 * checks that the notification is visible, contains the expected message, and has
 * the correct type attribute
 *
 * @param {Page} page - Playwright page instance
 * @param {string} expectedMessage - The expected notification message text
 * @param {"success" | "error" | "warning" | "info"} type - The type of notification
 * @returns {Promise<void>}
 */
export const verifySuccessNotification = async(page: Page, expectedMessage: string, type: "success" | "error" | "warning" | "info"): Promise<void> => {
   const notificationLocator = getNotificationLocator(page);
   await expect(notificationLocator).toBeVisible();
   await expect(notificationLocator).toContainText(expectedMessage);
   await expect(notificationLocator).toHaveAttribute("data-type", type);
};

/**
 * Dismisses any visible notification notifications, clicks the close icon on the
 * notification and verifies it is no longer visible
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<void>}
 */
export const dismissNotification = async(page: Page): Promise<void> => {
   const notificationLocator = getNotificationLocator(page);
   await notificationLocator.locator("svg[data-testid='CloseIcon']").click();
   await expect(notificationLocator).not.toBeVisible();
};
