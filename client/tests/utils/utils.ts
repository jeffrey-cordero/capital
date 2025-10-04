/**
 * Common test utilities for notifications, identifiers, and general test helpers
 *
 * This module provides shared utility functions for testing
 * including unique identifier generation and notification handling
 */

import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Gets the notification locator for notifications
 *
 * Targets the data-testid="notification" attribute on notification elements
 *
 * @param {Page} page - Playwright page instance
 * @returns {Locator} Locator for the notification container
 */
export const getNotificationLocator = (page: Page): Locator => {
   return page.getByTestId("notification");
};

/**
 * Verifies that a success notification appears with the expected message and type
 *
 * Checks that the notification is visible, contains the expected message,
 * and has the correct type attribute
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
 * Dismisses any visible notification notifications
 *
 * Clicks the close icon on the notification and verifies it is no longer visible
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<void>}
 */
export const dismissNotification = async(page: Page): Promise<void> => {
   const notificationLocator = getNotificationLocator(page);
   await notificationLocator.locator("svg[data-testid='CloseIcon']").click();
   await expect(notificationLocator).not.toBeVisible();
};

/**
 * Generates a truly unique identifier for testing purposes.
 *
 * Combines timestamp and random suffix to ensure uniqueness across test runs.
 * Returns a username or email format based on the type parameter.
 *
 * @param {"username" | "email"} type - The type of identifier to generate
 * @returns {string} Unique identifier string in format "timestamp-random" or "timestamp-random@example.com"
 */
export const createUniqueIdentifier = (type: "username" | "email"): string => {
   const timestamp = Date.now();
   const randomSuffix = Math.random().toString(36).substring(2, 8);
   const identifier = `${timestamp}-${randomSuffix}`;

   // Limit the username to 30 characters for validation purposes
   return type === "username" ? identifier.substring(0, 30) : `${identifier}@example.com`;
};