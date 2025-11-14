import { expect, type Locator, type Page, type Response } from "@playwright/test";
import { assertComponentIsHidden, assertComponentIsVisible, assertModalIsClosed, closeModal } from "@tests/utils";
import { ACCOUNTS_ROUTE, DASHBOARD_ROUTE } from "@tests/utils/authentication";
import { assertAccountTrends } from "@tests/utils/dashboard";
import { assertValidationErrors, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { assertNotificationStatus } from "@tests/utils/notifications";
import { type Account, IMAGES } from "capital/accounts";
import { IMAGE_FIXTURES } from "capital/mocks/accounts";
import { HTTP_STATUS } from "capital/server";

import { displayCurrency, displayDate } from "@/lib/display";

/**
 * Extended account data type for form submission with optional image selection, where
 * number type implies carousel index selection and string type implies custom URL input
 */
export type AccountFormData = Partial<Account> & { image?: string | number | null; };

/**
 * Options for performing and asserting account operations
 */
export type PerformAccountActionOptions = {
   page: Page;
   accountData: AccountFormData;
   expectedNetWorth?: number;
   accountId?: string;
   baseAccount?: AccountFormData;
   hasImageError?: boolean;
   expectedErrors?: Record<string, string>;
};

/**
 * Predefined images array for account selection
 */
const imagesArray: string[] = Array.from(IMAGES);

/**
 * Extracts all account card IDs from the DOM using data-testid pattern matching
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<string[]>} Array of account IDs in DOM order
 */
export async function getAccountCardIds(page: Page): Promise<string[]> {
   const cards: Locator = page.locator("[data-testid^=\"account-card-\"]");

   return (await cards.evaluateAll(els =>
      els.map(el => el.getAttribute("data-testid"))
   )).filter((id): id is string =>
      id !== null && /^account-card-[\da-f-]{36}$/i.test(id)
   ).map(id => id.replace("account-card-", ""));
}

/**
 * Opens the account form modal for creating or updating an account
 *
 * @param {Page} page - Playwright page instance
 * @param {string} [accountId] - Optional account ID to open the form in update mode
 */
export async function openAccountForm(page: Page, accountId?: string): Promise<void> {
   if (accountId) {
      // Account-specific form
      await page.getByTestId(`account-card-${accountId}`).click();
   } else {
      // New account form
      await page.getByTestId("accounts-add-button").click();
   }

   await assertComponentIsVisible(page, "account-name");
}

/**
 * Submits the account form and handles validation errors or successful responses
 *
 * @param {Page} page - Playwright page instance
 * @param {AccountFormData} accountData - Account data to submit, optionally with image (number for carousel index, string for custom URL)
 * @param {"Create" | "Update"} buttonType - Type of operation being performed
 * @param {Record<string, string>} [expectedErrors] - Optional map of test IDs to expected error messages for validation testing
 * @returns {Promise<string | null>} The created account ID if successful create, null if update or validation errors expected
 */
async function submitAccountForm(
   page: Page,
   accountData: AccountFormData,
   buttonType: "Create" | "Update",
   expectedErrors?: Record<string, string>
): Promise<string | null> {
   const formData: Record<string, any> = {};

   if (accountData.name !== undefined) formData["account-name"] = accountData.name;
   if (accountData.balance !== undefined) formData["account-balance"] = accountData.balance;
   if (accountData.type !== undefined) formData["account-type"] = accountData.type;

   // Handle image selection based on carousel index or custom URL, if applicable
   if (accountData.image !== undefined) {
      await openImageForm(page);

      if (typeof accountData.image === "number") {
         await selectImageCarouselPosition(page, accountData.image, true);
      } else if (typeof accountData.image === "string") {
         await page.getByTestId("account-image-url").fill(accountData.image);
      }

      await page.keyboard.press("Escape");
   }

   if (expectedErrors) {
      await submitForm(page, formData, { buttonType, containsErrors: true });
      await assertValidationErrors(page, expectedErrors);

      return null;
   }

   // Create a promise for the response to be received
   const responsePromise = page.waitForResponse((response: Response) => {
      return response.url().includes("/api/v1/dashboard/accounts")
         && response.request().method() === (buttonType === "Create" ? "POST" : "PUT");
   });
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

      // Assert the new account card is visible and modal is closed
      await assertComponentIsVisible(page, `account-card-${accountId}`);
      await assertModalIsClosed(page);

      return accountId;
   } else {
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);

      // Assert that the form remains open after a successful update
      await assertComponentIsVisible(page, "account-name");

      return null;
   }
}

/**
 * Creates an account via the form or validates form submission errors
 *
 * @param {Page} page - Playwright page instance
 * @param {AccountFormData} accountData - Account data to fill in the form
 * @param {Record<string, string>} [expectedErrors] - Optional map of test IDs to expected error messages for validation testing
 * @returns {Promise<string>} The created account ID if successful, empty string if validation errors expected
 */
export async function createAccount(
   page: Page,
   accountData: AccountFormData,
   expectedErrors?: Record<string, string>
): Promise<string> {
   await openAccountForm(page);

   return await submitAccountForm(page, accountData, "Create", expectedErrors) || "";
}

/**
 * Updates an account via the form
 *
 * @param {Page} page - Playwright page instance
 * @param {string} accountId - Account ID to update
 * @param {AccountFormData} accountData - Updated account data
 * @param {Record<string, string>} [expectedErrors] - Optional map of test IDs to expected error messages for validation testing
 * @param {boolean} [exitModal] - Whether to exit the modal after updating the account
 */
export async function updateAccount(
   page: Page,
   accountId: string,
   accountData: AccountFormData,
   expectedErrors?: Record<string, string>,
   exitModal?: boolean
): Promise<void> {
   await openAccountForm(page, accountId);
   await submitAccountForm(page, accountData, "Update", expectedErrors);

   if (exitModal) {
      await closeModal(page);
   }
}

/**
 * Asserts account card information and DOM positioning
 *
 * @param {Page} page - Playwright page instance
 * @param {AccountFormData} account - Account to assert
 * @param {boolean} [expectImageError] - Whether to expect an image error
 */
export async function assertAccountCard(
   page: Page,
   account: AccountFormData,
   expectImageError?: boolean
): Promise<void> {
   const formInputs = [
      { testId: `account-card-name-${account.account_id}`, value: account.name },
      { testId: `account-card-balance-${account.account_id}`, value: displayCurrency(account.balance) },
      { testId: `account-card-type-${account.account_id}`, value: account.type || "Checking" },
      { testId: `account-card-last-updated-${account.account_id}`, value: `Updated ${displayDate(new Date().toISOString())}` }
   ];

   const card: Locator = page.getByTestId(`account-card-${account.account_id}`);
   await expect(card).toBeVisible();

   for (const input of formInputs) {
      await assertComponentIsVisible(page, input.testId, input.value);
   }

   const imageContainer: Locator = page.getByTestId(`account-card-image-${account.account_id}`);
   await expect(imageContainer).toBeVisible();

   const image: Locator = imageContainer.locator("img");
   await expect(image).toBeVisible();

   let expectedImageSrc: string = "";
   const imageSrc: string | null = await image.getAttribute("src");

   if (expectImageError) {
      // Assert fallback error.svg image (logo in red color) and error message notification
      expectedImageSrc = "/svg/error.svg";
      const errorMessage: string = `There was an issue fetching the account image for ${account.name}`;
      await assertNotificationStatus(page, errorMessage, "error");
   } else {
      if (account.image === undefined) {
         // Default image (logo in blue color)
         expectedImageSrc =  "/svg/logo.svg";
      } else if (typeof account.image === "number") {
         // Predefined image from carousel based on the image index
         expectedImageSrc = `/images/${imagesArray[account.image]}.png`;
      } else {
         // Custom URL
         expectedImageSrc = account.image!;
      }
   }

   expect(imageSrc).toBe(expectedImageSrc);
}

/**
 * Asserts account cards appear in the specified order
 *
 * @param {Page} page - Playwright page instance
 * @param {string[]} accountIds - Array of account IDs in expected order
 */
export async function assertAccountCardsOrder(page: Page, accountIds: string[]): Promise<void> {
   const cardIds = await getAccountCardIds(page);

   for (let i = 0; i < cardIds.length; i++) {
      expect(cardIds[i]).toBe(accountIds[i]);
   }
}

/**
 * Asserts transaction account dropdown options and auto-selection
 *
 * @param {Page} page - Playwright page instance
 * @param {AccountFormData[]} expectedAccounts - Expected accounts in dropdown
 * @param {string} [autoSelectedAccountId] - Account ID that should be auto-selected
 */
export async function assertTransactionAccountDropdown(
   page: Page,
   expectedAccounts: AccountFormData[],
   autoSelectedAccountId?: string
): Promise<void> {
   if (autoSelectedAccountId) {
      await openAccountForm(page, autoSelectedAccountId);
   }

   // Scroll to transactions section and click "Add Transaction" button
   const addButton: Locator = page.getByRole("button", { name: /add transaction/i });
   await addButton.scrollIntoViewIfNeeded();
   await addButton.click();

   const inputElement: Locator = page.getByTestId("transaction-account-select");
   const selectElement: Locator = page.locator("label:has-text(\"Account\")").locator("..").locator(".MuiSelect-root");

   // Open the select dropdown
   await selectElement.click({ force: true });
   await expect(page.getByRole("option", { name: "-- Select Account --" })).toBeVisible();

   if (expectedAccounts.length === 0) {
      await expect(inputElement).toHaveValue("");
   } else {
      for (const account of expectedAccounts) {
         // Assert all accounts are visible in the dropdown with their name
         const option: Locator = page.getByRole("option", { name: account.name });
         await expect(option).toBeVisible();
         await expect(option).toContainText(account.name || "");
      }

      // Assert auto-selection if specified, where input element should hold the account ID
      if (autoSelectedAccountId) {
         const selectedAccount = expectedAccounts.find(a => a.account_id === autoSelectedAccountId);

         if (selectedAccount) {
            await expect(inputElement).toHaveValue(autoSelectedAccountId);
            await expect(selectElement).toContainText(selectedAccount.name!);
         } else {
            throw new Error(`Account with ID ${autoSelectedAccountId} not found in expected accounts`);
         }
      }

      // Close the select dropdown
      await page.keyboard.press("Escape");
   }

   // Close the transaction form
   await page.keyboard.press("Escape");
}

/**
 * Asserts the visibility state of the image carousel navigation controls
 *
 * @param {Page} page - Playwright page instance
 * @param {boolean} shouldBeVisible - Whether the image carousel navigation controls should be visible
 */
export async function assertImageCarouselVisibility(page: Page, shouldBeVisible: boolean): Promise<void> {
   if (shouldBeVisible) {
      await assertComponentIsVisible(page, "account-image-carousel-left");
   } else {
      await assertComponentIsHidden(page, "account-image-carousel-left");
   }
}

/**
 * Asserts active step in MobileStepper matches expected index
 *
 * @param {Page} page - Playwright page instance
 * @param {number} expectedStep - Expected active step index
 */
export async function assertActiveImageStep(page: Page, expectedStep: number): Promise<void> {
   await expect(page.locator(".MuiMobileStepper-dot").nth(expectedStep)).toHaveClass(/MuiMobileStepper-dotActive/);
}

/**
 * Opens the account image selection form, which is a child component of the account form
 *
 * @param {Page} page - Playwright page instance
 */
export async function openImageForm(page: Page): Promise<void> {
   if (!(await page.getByTestId("account-image-button").isVisible())) {
      // Open the account form if the image button is not visible
      await openAccountForm(page);
   }

   await page.getByTestId("account-image-button").click();
   await assertImageCarouselVisibility(page, true);
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
 * Asserts carousel navigation with loopback behavior and asserts each image
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

   // Navigate through all images and assert loopback
   for (let i = 0; i < totalImages; i++) {
      const expectedStep: number = direction === "right" ? (
         // Loop back to the first image if on the last image
         i === totalImages - 1 ? 0 : i + 1
      ) : (
         // Loop back to the last image if on the first image
         totalImages - i - 1
      );

      // Click the navigation button and assert the active step and selected image
      await page.getByTestId(buttonTestId).click();
      await assertActiveImageStep(page, expectedStep);
      await assertImageSelected(page, expectedStep, false);
   }

   // Assert the first image is always looped back to after navigation (loopback behavior)
   await assertImageSelected(page, 0, false);
}

/**
 * Navigates carousel and selects an image to view and optionally select by index
 *
 * @param {Page} page - Playwright page instance
 * @param {number} imageIndex - Index of image to select (0-based)
 * @param {boolean} [select] - Whether to select the image (default: `false`)
 */
export async function selectImageCarouselPosition(page: Page, imageIndex: number, select: boolean = false): Promise<void> {
   const activeStep: number = await getActiveImageStep(page);
   const stepsNeeded: number = imageIndex - activeStep;

   // Navigate to the left or right depending on the number of steps needed for the desired image position
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
export async function assertImageSelected(page: Page, imageIndex: number, isSelected: boolean): Promise<void> {
   await assertActiveImageStep(page, imageIndex);

   // Assert the image is visible and the source is correct relative to the default images array
   const image: Locator = page.getByTestId("account-image-carousel-image");
   await expect(image).toBeVisible();

   // Assert the image source is correct relative to default images array
   const expectedImageSrc: string = `/images/${imagesArray[imageIndex]}.png`;
   await expect(image.locator("img")).toHaveAttribute("src", expectedImageSrc);

   // Assert the data-selected attribute and border style
   await expect(image).toHaveAttribute("data-selected", isSelected ? "true" : "false");
   const borderStyle: string = await image.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.borderWidth;
   });
   expect(borderStyle).toBe(isSelected ? "3px" : "0px");
}

/**
 * Asserts invalid image URL validation and unblocks the invalid image form using the specified method to
 * return back to the account form
 *
 * @param {Page} page - Playwright page instance
 * @param {"clear" | "default-image" | "valid-url"} unblockMethod - Method to unblock the invalid image form after validation
 */
export async function assertAndUnblockInvalidImageURL(
   page: Page,
   unblockMethod: "clear" | "default-image" | "valid-url"
): Promise<void> {
   // Fill an invalid URL into the image URL input field
   await page.getByTestId("account-image-url").fill(IMAGE_FIXTURES.invalid);

   // Try to close the image form with Escape, which should be blocked due to invalid URL to notify the user
   await page.keyboard.press("Escape");
   await assertImageCarouselVisibility(page, true);
   await assertValidationErrors(page, { "account-image-url": "URL must be valid" });

   // Unblock the image form based on the method
   if (unblockMethod === "clear") {
      // Clear the invalid URL
      await page.getByTestId("account-image-url").fill("");
   } else if (unblockMethod === "default-image") {
      // Select the default image from the carousel
      await selectImageCarouselPosition(page, 0, true);
   } else if (unblockMethod === "valid-url") {
      // Enter a valid URL
      await page.getByTestId("account-image-url").fill(IMAGE_FIXTURES.valid);
   }

   // Close the image form after a successful input validation
   await page.keyboard.press("Escape");
   await assertImageCarouselVisibility(page, false);
}

/**
 * Unified helper to assert net worth updates on both dashboard and accounts page
 *
 * @param {Page} page - Playwright page instance
 * @param {AccountFormData[]} accounts - Array of accounts to display
 * @param {number} expectedNetWorth - Expected net worth value, which must be calculated explicitly by caller
 */
export async function assertNetWorth(page: Page, accounts: AccountFormData[], expectedNetWorth: number): Promise<void> {
   await navigateToPath(page, DASHBOARD_ROUTE);
   await assertAccountTrends(page, accounts, expectedNetWorth, "dashboard");

   await navigateToPath(page, ACCOUNTS_ROUTE);
   await assertAccountTrends(page, accounts, expectedNetWorth, "accounts");
}

/**
 * Deletes an account via the form, showing confirmation dialog
 *
 * @param {Page} page - Playwright page instance
 * @param {string} accountId - Account ID to delete
 */
export async function deleteAccount(page: Page, accountId: string): Promise<void> {
   await openAccountForm(page, accountId);

   // Wait for delete button to appear
   await assertComponentIsVisible(page, "account-delete-button");

   // Click the delete button to open the confirmation dialog
   await page.getByTestId("account-delete-button").click();
   await assertComponentIsVisible(page, "account-delete-button-confirm");

   // Confirm the deletion and wait for the response
   const responsePromise = page.waitForResponse((response: Response) => {
      return response.url().includes("/api/v1/dashboard/accounts") && response.request().method() === "DELETE";
   });

   await page.getByTestId("account-delete-button-confirm").click();

   const response = await responsePromise;
   expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);

   // Assert the account form is closed and the account card is hidden
   await assertModalIsClosed(page);
   await assertComponentIsHidden(page, `account-card-${accountId}`);
}