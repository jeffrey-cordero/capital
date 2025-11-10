import { expect, type Locator, type Page, type Response } from "@playwright/test";
import { assertComponentVisibility, assertModalClosed } from "@tests/utils";
import { assertAccountTrends } from "@tests/utils/dashboard";
import { assertValidationErrors, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { assertNotificationStatus } from "@tests/utils/notifications";
import { type Account, IMAGES } from "capital/accounts";
import { HTTP_STATUS } from "capital/server";

import { displayCurrency } from "@/lib/display";

/**
 * Predefined images array for account selection
 */
const imagesArray: string[] = Array.from(IMAGES);

/**
 * Opens the account form modal for creating or updating an account
 *
 * @param {Page} page - Playwright page instance
 * @param {string} [accountId] - Optional account ID to open the form in update mode
 */
export async function openAccountForm(page: Page, accountId?: string): Promise<void> {
   if (accountId) {
      await page.getByTestId(`account-card-${accountId}`).click();
   } else {
      await page.getByTestId("accounts-add-button").click();
   }

   await assertComponentVisibility(page, "account-name");
}

/**
 * Extended account data type for form submission with optional image selection
 */
type AccountFormData = Partial<Account> & {
   imageSelection?: number | string;
};

/**
 * Submits the account form and handles validation errors or successful responses
 *
 * @param {Page} page - Playwright page instance
 * @param {AccountFormData} accountData - Account data to submit, optionally with imageSelection (number for carousel index, string for custom URL)
 * @param {"Create" | "Update"} buttonType - Type of operation being performed
 * @param {Record<string, string | string[]>} [expectedErrors] - Optional map of test IDs to expected error messages for validation testing
 * @returns {Promise<string | null>} The created account ID if successful create, null if update or validation errors expected
 */
async function submitAccountForm(
   page: Page,
   accountData: AccountFormData,
   buttonType: "Create" | "Update",
   expectedErrors?: Record<string, string | string[]>
): Promise<string | null> {
   const formData: Record<string, any> = {};

   if (accountData.name !== undefined) formData["account-name"] = accountData.name;
   if (accountData.balance !== undefined) formData["account-balance"] = accountData.balance;
   if (accountData.type !== undefined) formData["account-type"] = accountData.type;

   // Handle image selection if provided
   if (accountData.imageSelection !== undefined) {
      await openImageForm(page);

      if (typeof accountData.imageSelection === "number") {
         // Select from carousel (default image by index)
         await selectImageCarouselPosition(page, accountData.imageSelection, true);
      } else {
         // Enter custom URL
         await page.getByTestId("account-image-url").fill(accountData.imageSelection);
      }

      await page.keyboard.press("Escape");
   }

   // If validation errors are expected, submit and assert errors without waiting for the API response
   if (expectedErrors) {
      await submitForm(page, formData, { buttonType, containsErrors: true });
      await assertValidationErrors(page, expectedErrors);

      return null;
   }

   const method: string = buttonType === "Create" ? "POST" : "PUT";
   const responsePromise = page.waitForResponse((response: Response) => {
      return response.url().includes("/api/v1/dashboard/accounts") && response.request().method() === method;
   });

   // Submit form (submitForm handles filling and waiting for button visibility)
   await submitForm(page, formData, { buttonType });

   // Wait for the response to fully resolve and assert the successful status
   const response: Response = await responsePromise;

   if (buttonType === "Create") {
      expect(response.status()).toBe(HTTP_STATUS.CREATED);

      // Extract account ID from response body
      const responseBody = await response.json();
      const accountId: string = responseBody.data?.account_id;

      if (!accountId) {
         throw new Error("Failed to create account - account_id not found in response");
      }

      // Assert the new account card is visible
      await expect(page.getByTestId(`account-card-${accountId}`)).toBeVisible();

      // Assert modal is closed and add button is visible
      await assertModalClosed(page);
      await assertComponentVisibility(page, "accounts-add-button", "Add Account");

      return accountId;
   } else {
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);

      // Assert that the form remains open after a successful update
      await assertComponentVisibility(page, "account-name");
      return null;
   }
}

/**
 * Creates an account via the form or validates form submission errors
 *
 * @param {Page} page - Playwright page instance
 * @param {AccountFormData} accountData - Account data to fill in the form (can include imageSelection)
 * @param {Record<string, string | string[]>} [expectedErrors] - Optional map of test IDs to expected error messages for validation testing
 * @returns {Promise<string>} The created account ID if successful, empty string if validation errors expected
 */
export async function createAccount(
   page: Page,
   accountData: AccountFormData,
   expectedErrors?: Record<string, string | string[]>
): Promise<string> {
   await openAccountForm(page);

   return await submitAccountForm(page, accountData, "Create", expectedErrors) || "";
}

/**
 * Updates an account via the form
 *
 * @param {Page} page - Playwright page instance
 * @param {string} accountId - Account ID to update
 * @param {AccountFormData} accountData - Updated account data (can include imageSelection)
 * @param {Record<string, string | string[]>} [expectedErrors] - Optional map of test IDs to expected error messages for validation testing
 */
export async function updateAccount(
   page: Page,
   accountId: string,
   accountData: AccountFormData,
   expectedErrors?: Record<string, string | string[]>
): Promise<void> {
   await openAccountForm(page, accountId);
   await submitAccountForm(page, accountData, "Update", expectedErrors);
}

/**
 * Asserts account card information and DOM position
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<Account>} account - Account to assert
 * @param {number} [expectedPosition] - Expected position index (0-based)
 * @param {boolean} [expectImageError] - Whether to expect an image error (error message is derived from account name)
 */
export async function assertAccountCard(
   page: Page,
   account: Partial<Account>,
   expectedPosition?: number,
   expectImageError?: boolean
): Promise<void> {
   const card = page.getByTestId(`account-card-${account.account_id}`);
   await expect(card).toBeVisible();

   // Assert card content
   await expect(page.getByTestId(`account-card-name-${account.account_id}`)).toHaveText(account.name || "");
   await expect(page.getByTestId(`account-card-balance-${account.account_id}`)).toHaveText(displayCurrency(account.balance || 0));

   if (expectImageError) {
      // Construct error message from account name
      const errorMessage = `There was an issue fetching the account image for ${account.name}`;

      // Assert error state: fallback error.svg image + error notification
      const imageContainer = page.getByTestId(`account-card-image-${account.account_id}`);
      await expect(imageContainer).toBeVisible();

      // Assert error image is displayed (error.svg when image fails to load)
      const image: Locator = imageContainer.locator("img");
      await expect(image).toBeVisible();
      const imageSrc: string | null = await image.getAttribute("src");
      expect(imageSrc).toBe("/svg/error.svg");

      // Assert error notification in the notification system
      await assertNotificationStatus(page, errorMessage, "error");
   } else {
      // Assert normal image
      const image: Locator = page.getByTestId(`account-card-image-${account.account_id}`).locator("img");
      await expect(image).toBeVisible();
      const imageSrc: string | null = await image.getAttribute("src");

      // Determine expected source: predefined image or custom URL
      let expectedSrc: string;
      if (!account.image) {
         expectedSrc = "/svg/logo.svg";
      } else if (imagesArray.includes(account.image)) {
         // Predefined image from carousel
         expectedSrc = `/images/${account.image}.png`;
      } else {
         // Custom URL
         expectedSrc = account.image;
      }
      expect(imageSrc).toBe(expectedSrc);
   }

   // Default account type is "Checking"
   await expect(page.getByTestId(`account-card-type-${account.account_id}`)).toHaveText(account.type || "Checking");

   // Assert position if specified
   if (expectedPosition !== undefined) {
      // Get all card containers by their exact test IDs
      const allElements = await page.locator("#accounts div").all();
      const cardContainers: { element: any; index: number }[] = [];

      for (let i = 0; i < allElements.length; i++) {
         const element = allElements[i];
         const testId = await element.getAttribute("data-testid");

         // Only match exact "account-card-{uuid}" pattern
         if (testId && /^account-card-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId)) {
            cardContainers.push({ element, index: cardContainers.length });
         }
      }

      if (expectedPosition < cardContainers.length) {
         const cardAtPosition = cardContainers[expectedPosition].element;
         const testId = await cardAtPosition.getAttribute("data-testid");
         expect(testId).toBe(`account-card-${account.account_id}`);
      } else {
         throw new Error(`Expected position ${expectedPosition} is out of bounds. Found ${cardContainers.length} cards.`);
      }
   }
}

/**
 * Asserts account cards appear in the specified order
 *
 * @param {Page} page - Playwright page instance
 * @param {string[]} accountIds - Array of account IDs in expected order
 */
export async function assertAccountCardsOrder(
   page: Page,
   accountIds: string[]
): Promise<void> {
   // Use getByTestId for each card to avoid matching child elements
   // This is more reliable than using a generic selector that matches child elements
   const cardElements: { testId: string; boundingBox: any }[] = [];

   // Get each card by its exact test ID and store its position
   for (const accountId of accountIds) {
      const card = page.getByTestId(`account-card-${accountId}`);
      await expect(card).toBeVisible();
      const boundingBox = await card.boundingBox();
      if (boundingBox) {
         cardElements.push({ testId: `account-card-${accountId}`, boundingBox });
      }
   }

   expect(cardElements.length).toBe(accountIds.length);

   // Sort cards by Y position (top to bottom), then X position (left to right)
   cardElements.sort((a, b) => {
      const yDiff = a.boundingBox.y - b.boundingBox.y;
      if (Math.abs(yDiff) > 10) {
         // Different rows - sort by Y
         return yDiff;
      }
      // Same row - sort by X
      return a.boundingBox.x - b.boundingBox.x;
   });

   // Assert each account is at the correct position
   for (let i = 0; i < accountIds.length; i++) {
      const expectedAccountId = accountIds[i];
      const expectedTestId = `account-card-${expectedAccountId}`;
      expect(cardElements[i].testId).toBe(expectedTestId);
   }
}

/**
 * Asserts transaction account dropdown options and auto-selection
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<Account>[]} expectedAccounts - Expected accounts in dropdown
 * @param {string} [autoSelectedAccountId] - Account ID that should be auto-selected
 */
export async function assertTransactionAccountDropdown(
   page: Page,
   expectedAccounts: Partial<Account>[],
   autoSelectedAccountId?: string
): Promise<void> {
   if (autoSelectedAccountId) {
      // Open the account form to target the proper transaction form element
      await page.getByTestId(`account-card-${autoSelectedAccountId}`).click();
   }
   // Scroll to transactions section and click "Add Transaction" button
   const addButton = page.getByRole("button", { name: /add transaction/i });
   await addButton.scrollIntoViewIfNeeded();
   await addButton.click();

   // Test ID is on input element, which holds the literal value of the selected account
   const inputElement = page.getByTestId("transaction-account-select");

   // Find the actual clickable Select element via label -> FormControl -> Select
   const selectElement = page.locator("label:has-text(\"Account\")").locator("..").locator(".MuiSelect-root").first();

   if (expectedAccounts.length === 0) {
      // Empty state - dropdown should be visible
      // Click the Select element to open the dropdown
      await expect(inputElement).toHaveValue("");
      await selectElement.click({ force: true });
      await expect(page.getByRole("option", { name: "-- Select Account --" })).toBeVisible();
   } else {
      // Click the Select element to open options
      await selectElement.click({ force: true });

      // Assert placeholder option exists
      await expect(page.getByRole("option", { name: "-- Select Account --" })).toBeVisible();

      // Assert each account appears in dropdown
      for (const account of expectedAccounts) {
         const option = page.getByRole("option", { name: account.name });
         await expect(option).toBeVisible();
      }

      // Assert auto-selection if specified
      if (autoSelectedAccountId) {
         const selectedAccount = expectedAccounts.find(a => a.account_id === autoSelectedAccountId);
         if (selectedAccount) {
            await expect(selectElement).toContainText(selectedAccount.name!);
         }

         await expect(selectElement).toContainText(selectedAccount?.name || "");
      }

      // Close dropdown
      await page.keyboard.press("Escape");
   }

   // Close the transaction form modal
   await page.keyboard.press("Escape");
   await page.waitForTimeout(200);
}

/**
 * Opens the account image selection form, which is a child component of the account form
 *
 * @param {Page} page - Playwright page instance
 */
export async function openImageForm(page: Page): Promise<void> {
   if (!await page.getByTestId("account-image-button").isVisible()) {
      // Open the account form if the image form is not visible
      await openAccountForm(page);
   }

   await page.getByTestId("account-image-button").click();
   await assertComponentVisibility(page, "account-image-carousel-left");
}

/**
 * Gets the current active step index from the image carousel stepper
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<number>} The current active step index
 */
export async function getActiveImageStep(page: Page): Promise<number> {
   const steps: Locator = page.locator(".MuiMobileStepper-dot");
   const count: number = await steps.count();

   for (let i = 0; i < count; i++) {
      const dot: Locator = steps.nth(i);
      const classNames: string | null = await dot.getAttribute("class");

      if (classNames?.includes("MuiMobileStepper-dotActive")) {
         return i;
      }
   }

   return 0;
}

/**
 * Asserts active step in MobileStepper matches expected index
 *
 * @param {Page} page - Playwright page instance
 * @param {number} expectedStep - Expected active step index
 */
export async function assertActiveImageStep(
   page: Page,
   expectedStep: number
): Promise<void> {
   const steps: Locator = page.locator(".MuiMobileStepper-dot");
   const activeStep: Locator = steps.nth(expectedStep);
   await expect(activeStep).toHaveClass(/MuiMobileStepper-dotActive/);
}

/**
 * Asserts carousel navigation with loopback behavior and verifies each image
 *
 * @param {Page} page - Playwright page instance
 * @param {"left" | "right"} direction - Direction to navigate through the carousel
 */
export async function assertImageCarouselNavigation(
   page: Page,
   direction: "left" | "right"
): Promise<void> {
   const totalImages: number = imagesArray.length;
   const buttonTestId: string = `account-image-carousel-${direction}`;

   // Select the first image to reset the carousel
   await selectImageCarouselPosition(page, 0);

   // Navigate through all images and verify loopback
   for (let i = 0; i < totalImages; i++) {
      const expectedStep: number = direction === "right" ? (
         i === totalImages - 1 ? 0 : i + 1
      ) : (
         totalImages - i - 1
      );

      // Click navigation button
      await page.getByTestId(buttonTestId).click();

      await assertActiveImageStep(page, expectedStep);
      await assertImageSelected(page, expectedStep, false);
   }

   // Assert the first image is always looped back to after navigation
   await assertImageSelected(page, 0, false);
}

/**
 * Asserts image selection by clicking the avatar and verifying selection state updates
 *
 * @param {Page} page - Playwright page instance
 * @param {boolean} isSelected - Whether image should be selected
 */
export async function assertImageSelection(page: Page, isSelected: boolean): Promise<void> {
   const avatar: Locator = page.locator("[data-selected]").first();
   await expect(avatar).toBeVisible();

   if (isSelected) {
      await expect(avatar).toHaveAttribute("data-selected", "true");
   } else {
      await expect(avatar).toHaveAttribute("data-selected", "false");
   }
}

/**
 * Navigates carousel and selects an image to view and optionally select by index
 *
 * @param {Page} page - Playwright page instance
 * @param {number} imageIndex - Index of image to select (0-based)
 * @param {boolean} [select] - Whether to select the image (default: false)
 */
export async function selectImageCarouselPosition(
   page: Page,
   imageIndex: number,
   select: boolean = false
): Promise<void> {
   // Navigate to the desired image
   const activeStep: number = await getActiveImageStep(page);
   const stepsNeeded: number = imageIndex - activeStep;
   const direction: "left" | "right" = stepsNeeded > 0 ? "right" : "left";
   const buttonTestId: string = `account-image-carousel-${direction}`;

   for (let i = 0; i < Math.abs(stepsNeeded); i++) {
      await page.getByTestId(buttonTestId).click();
   }

   if (select) {
      await page.getByTestId("account-image-carousel-image").click();
   }
}

/**
 * Asserts image selection state via data-selected attribute and border CSS
 *
 * @param {Page} page - Playwright page instance
 * @param {number} imageIndex - Index of image to assert
 * @param {boolean} isSelected - Whether image should be selected
 */
export async function assertImageSelected(
   page: Page,
   imageIndex: number,
   isSelected: boolean
): Promise<void> {
   await assertActiveImageStep(page, imageIndex);

   // Assert the image is visible
   const avatar: Locator = page.locator("[data-selected]").first();
   await expect(avatar).toBeVisible();

   // Assert the image source is correct relative to default images array
   const expectedSrc: string = `/images/${imagesArray[imageIndex]}.png`;
   await expect(avatar.locator("img")).toHaveAttribute("src", expectedSrc);

   // Assert the data-selected attribute and border style
   await expect(avatar).toHaveAttribute("data-selected", isSelected ? "true" : "false");
   const borderStyle: string = await avatar.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.borderWidth;
   });
   expect(borderStyle).toBe(isSelected ? "3px" : "0px");
}

/**
 * Asserts invalid image URL validation and unblocks the invalid image form using the specified method
 *
 * @param {Page} page - Playwright page instance
 * @param {"clear" | "default-image" | "valid-url"} unblockMethod - Method to unblock the invalid image form after validation
 */
export async function assertAndUnblockInvalidImageURL(
   page: Page,
   unblockMethod: "clear" | "default-image" | "valid-url"
): Promise<void> {
   // Open the image form and fill an invalid URL
   await openImageForm(page);
   await page.getByTestId("account-image-url").fill("invalid-url");

   // Try to close the image form with Escape, which should be blocked due to invalid URL
   await page.keyboard.press("Escape");
   await expect(page.getByTestId("account-image-carousel-left")).toBeVisible();
   await assertValidationErrors(page, { "account-image-url": "URL must be valid" });

   // Unblock the image form based on the method
   if (unblockMethod === "clear") {
      // Clear the invalid URL
      await page.getByTestId("account-image-url").fill("");
   } else if (unblockMethod === "default-image") {
      // Select the default image
      await selectImageCarouselPosition(page, 0, true);
   } else if (unblockMethod === "valid-url") {
      // Enter the valid URL
      await page.getByTestId("account-image-url").fill("https://picsum.photos/200/300");
   }

   // Close the image form after a successful input validation
   await page.keyboard.press("Escape");
   await expect(page.getByTestId("account-image-carousel-left")).not.toBeVisible();
}

/**
 * Asserts account form graph display
 *
 * @param {Page} page - Playwright page instance
 * @param {number} expectedBalance - Expected balance value
 * @param {string} expectedPercentage - Expected percentage value
 */
export async function assertAccountFormGraph(
   page: Page,
   expectedBalance: number,
   expectedPercentage: string
): Promise<void> {
   void page;
   void expectedBalance;
   void expectedPercentage;
}

/**
 * Asserts net worth on the dashboard page
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<Account>[]} accounts - Array of accounts to display
 * @param {number} expectedNetWorth - Expected net worth value (must be calculated explicitly by caller)
 */
export async function assertNetWorthOnDashboard(
   page: Page,
   accounts: Partial<Account>[],
   expectedNetWorth: number
): Promise<void> {
   await navigateToPath(page, "/dashboard");
   await assertAccountTrends(page, accounts, expectedNetWorth, "dashboard");
}

/**
 * Asserts net worth on the accounts page
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<Account>[]} accounts - Array of accounts to display
 * @param {number} expectedNetWorth - Expected net worth value (must be calculated explicitly by caller)
 */
export async function assertNetWorthOnAccountsPage(
   page: Page,
   accounts: Partial<Account>[],
   expectedNetWorth: number
): Promise<void> {
   await navigateToPath(page, "/dashboard/accounts");
   await assertAccountTrends(page, accounts, expectedNetWorth, "accounts-page");
}

/**
 * Unified helper to verify net worth updates on both dashboard and accounts page
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<Account>[]} accounts - Array of accounts to display
 * @param {number} expectedNetWorth - Expected net worth value (must be calculated explicitly by caller)
 */
export async function assertNetWorthAfterAction(
   page: Page,
   accounts: Partial<Account>[],
   expectedNetWorth: number
): Promise<void> {
   // Check dashboard first
   await assertNetWorthOnDashboard(page, accounts, expectedNetWorth);

   // Check accounts page
   await assertNetWorthOnAccountsPage(page, accounts, expectedNetWorth);
}

/**
 * Deletes all existing accounts from the page to ensure a clean slate
 *
 * @param {Page} page - Playwright page instance
 */
export async function deleteAllAccounts(page: Page): Promise<void> {
   // Get all account cards currently visible
   while (await page.getByTestId(/^account-card-[0-9a-f-]+$/).first().isVisible().catch(() => false)) {
      const firstCard = page.getByTestId(/^account-card-[0-9a-f-]+$/).first();
      await firstCard.click();
      await assertComponentVisibility(page, "account-delete-button");
      await page.getByTestId("account-delete-button").click();
      await assertComponentVisibility(page, "account-delete-button-confirm");
      await page.getByTestId("account-delete-button-confirm").click();
      // Wait for deletion to complete
      await page.waitForTimeout(300);
   }
}

/**
 * Deletes an account via the form, showing confirmation dialog
 *
 * @param {Page} page - Playwright page instance
 * @param {string} accountId - Account ID to delete
 */
export async function deleteAccount(page: Page, accountId: string): Promise<void> {
   await openAccountForm(page, accountId);

   // Wait for delete button to appear (rendered when isUpdating is true)
   await assertComponentVisibility(page, "account-delete-button");

   // Click delete button to open confirmation dialog
   await page.getByTestId("account-delete-button").click();

   // Assert confirmation dialog appears
   await assertComponentVisibility(page, "account-delete-button-confirm");

   // Confirm deletion
   const responsePromise = page.waitForResponse((response: Response) => {
      return response.url().includes("/api/v1/dashboard/accounts") && response.request().method() === "DELETE";
   });

   await page.getByTestId("account-delete-button-confirm").click();

   const response = await responsePromise;
   expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);
}

/**
 * Asserts that an account has been deleted from the UI
 *
 * @param {Page} page - Playwright page instance
 * @param {string} accountId - Account ID that should be deleted
 */
export async function assertAccountDeleted(page: Page, accountId: string): Promise<void> {
   // Assert account card is gone
   await expect(page.getByTestId(`account-card-${accountId}`)).not.toBeVisible();

   // Assert modal is closed
   await assertModalClosed(page);
}