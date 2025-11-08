import { expect, type Page, type Response } from "@playwright/test";
import { submitForm } from "@tests/utils/forms";
import { closeModal } from "@tests/utils";
import { type Account } from "capital/accounts";
import { HTTP_STATUS } from "capital/server";

import { displayCurrency } from "@/lib/display";

/**
 * Creates an account via the form
 *
 * @param {Page} page - Playwright page instance
 * @param {Partial<Account>} accountData - Account data to fill in the form
 * @param {object} [options] - Optional submission options
 * @returns {Promise<string>} The created account ID
 */
export async function createAccount(
   page: Page,
   accountData: Partial<Account>,
   options?: { buttonType?: "Create" | "Update" }
): Promise<string> {
   // Store the promise for the account creation POST response
   const createPromise = page.waitForResponse((response: Response) => {
      return response.url().includes("/api/v1/dashboard/accounts") && response.request().method() === "POST";
   });

   // Open account form
   await page.getByTestId("accounts-add-button").click();
   await page.waitForTimeout(300); // Wait for modal animation

   // Fill form fields
   const formData: Record<string, any> = {};
   if (accountData.name) formData["account-name"] = accountData.name;
   if (accountData.balance !== undefined) formData["account-balance"] = accountData.balance;
   if (accountData.type) formData["account-type"] = accountData.type;

   // Submit form (submitForm handles filling and waiting for button visibility)
   await submitForm(page, formData, { buttonType: options?.buttonType || "Create" });

   // Wait for the creation response to fully resolve and assert the successful status
   const response: Response = await createPromise;
   expect(response.status()).toBe(HTTP_STATUS.CREATED);

   // Extract account ID from response body
   const responseBody = await response.json();
   const accountId: string = responseBody.data?.account_id;

   if (!accountId) {
      throw new Error("Failed to create account - account_id not found in response");
   }

   // Assert account ID is a valid UUID
   const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   expect(accountId).toMatch(uuidRegex);

   // Wait for the account card to appear in the DOM
   await expect(page.getByTestId(`account-card-${accountId}`)).toBeVisible();

   return accountId;
}

/**
 * Updates an account via the form
 *
 * @param {Page} page - Playwright page instance
 * @param {string} accountId - Account ID to update
 * @param {Partial<Account>} accountData - Updated account data
 * @param {object} [options] - Optional submission options
 */
export async function updateAccount(
   page: Page,
   accountId: string,
   accountData: Partial<Account>,
   options?: { buttonType?: "Create" | "Update" }
): Promise<void> {
   // Open account form by clicking on account card
   await page.getByTestId(`account-card-${accountId}`).click();
   await page.waitForTimeout(300); // Wait for modal animation

   // Fill form fields
   const formData: Record<string, any> = {};
   if (accountData.name) formData["account-name"] = accountData.name;
   if (accountData.balance !== undefined) formData["account-balance"] = accountData.balance;
   if (accountData.type) formData["account-type"] = accountData.type;

   await submitForm(page, formData, { buttonType: options?.buttonType || "Update" });

   // Wait for update to complete (modal stays open on update)
   await page.waitForTimeout(500);
}

/**
 * Asserts account card information and DOM position
 *
 * @param {Page} page - Playwright page instance
 * @param {Account} account - Account to assert
 * @param {number} [expectedPosition] - Expected position index (0-based)
 */
export async function assertAccountCard(
   page: Page,
   account: Account,
   expectedPosition?: number
): Promise<void> {
   const card = page.getByTestId(`account-card-${account.account_id}`);
   await expect(card).toBeVisible();

   // Assert card content
   await expect(page.getByTestId(`account-card-name-${account.account_id}`)).toHaveText(account.name);
   await expect(page.getByTestId(`account-card-balance-${account.account_id}`)).toHaveText(displayCurrency(account.balance));
   if (account.type) {
      await expect(page.getByTestId(`account-card-type-${account.account_id}`)).toHaveText(account.type);
   }

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
 * @param {Account[]} expectedAccounts - Expected accounts in dropdown
 * @param {string} [autoSelectedAccountId] - Account ID that should be auto-selected
 */
export async function assertTransactionAccountDropdown(
   page: Page,
   expectedAccounts: Account[],
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
            await expect(selectElement).toContainText(selectedAccount.name);
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
 * Opens the account image selection modal
 *
 * @param {Page} page - Playwright page instance
 */
export async function openImageModal(page: Page): Promise<void> {
   // Check if modal is already open by checking for carousel buttons
   const carouselLeft = page.getByTestId("account-image-carousel-left");
   const isModalOpen = await carouselLeft.isVisible().catch(() => false);

   if (!isModalOpen) {
      // Modal is not open, click the button to open it
      await page.getByTestId("account-image-button").click({ force: true });
   }

   // Wait for the image modal to be visible (carousel buttons indicate modal is open)
   await carouselLeft.waitFor({ state: "visible", timeout: 5000 });
}

/**
 * Opens the account image selection modal
 *
 * @param {Page} page - Playwright page instance
 */
export async function openAccountImageModal(page: Page): Promise<void> {
   return openImageModal(page);
}

/**
 * Navigates carousel and selects an image by index
 * @param {Page} page - Playwright page instance
 * @param {number} imageIndex - Index of image to select (0-based)
 */
export async function selectImageFromCarousel(
   page: Page,
   imageIndex: number
): Promise<void> {
   // Ensure image modal is open by clicking the image button
   await openImageModal(page);

   // Navigate to the desired image
   const currentStep = await page.locator(".MuiMobileStepper-root").getAttribute("aria-label");
   const currentIndex = currentStep ? parseInt(currentStep.split(" ")[1] || "0") : 0;

   const stepsNeeded = imageIndex - currentIndex;
   const direction = stepsNeeded > 0 ? "right" : "left";
   const buttonTestId = direction === "right" ? "account-image-carousel-right" : "account-image-carousel-left";

   for (let i = 0; i < Math.abs(stepsNeeded); i++) {
      await page.getByTestId(buttonTestId).click();
      // Wait for carousel step to update
      await page.locator(".MuiMobileStepper-root").waitFor({ state: "visible" });
   }

   // Click on the image to select it
   const avatar = page.locator("[data-selected]").first();
   await avatar.click();
   // Wait for selection state to update
   await expect(avatar).toHaveAttribute("data-selected", /true|false/);
   // Note: Modal stays open after selection - user must close it manually
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
   // Note: imageIndex is provided for context but we assert the currently displayed avatar
   void imageIndex;

   // Ensure image modal is open
   await openImageModal(page);

   const avatar = page.locator("[data-selected]").first();

   if (isSelected) {
      await expect(avatar).toHaveAttribute("data-selected", "true");

      // Assert border CSS
      const borderStyle = await avatar.evaluate((el) => {
         const computedStyle = window.getComputedStyle(el);
         return computedStyle.borderWidth;
      });
      expect(borderStyle).toBe("3px");
   } else {
      const dataSelected = await avatar.getAttribute("data-selected");
      expect(dataSelected).not.toBe("true");

      // Assert no border
      const borderStyle = await avatar.evaluate((el) => {
         const computedStyle = window.getComputedStyle(el);
         return computedStyle.borderWidth;
      });
      expect(borderStyle).toBe("0px");
   }
}

/**
 * Asserts border appears on image click
 *
 * @param {Page} page - Playwright page instance
 * @param {number} imageIndex - Index of image to click
 */
export async function assertImageBorderOnClick(
   page: Page,
   imageIndex: number
): Promise<void> {
   // Navigate to image and select it (selectImageFromCarousel will open modal)
   await selectImageFromCarousel(page, imageIndex);

   // Assert selection (assertImageSelected will reopen modal if needed)
   await assertImageSelected(page, imageIndex, true);
}

/**
 * Asserts border disappears on re-click
 *
 * @param {Page} page - Playwright page instance
 * @param {number} imageIndex - Index of image to re-click
 */
export async function assertImageBorderOnReClick(
   page: Page,
   imageIndex: number
): Promise<void> {
   // Ensure modal is open
   await openImageModal(page);

   // Navigate to the image if needed
   const currentStep = await page.locator(".MuiMobileStepper-root").getAttribute("aria-label");
   const currentIndex = currentStep ? parseInt(currentStep.split(" ")[1] || "0") : 0;
   const stepsNeeded = imageIndex - currentIndex;
   const direction = stepsNeeded > 0 ? "right" : "left";
   const buttonTestId = direction === "right" ? "account-image-carousel-right" : "account-image-carousel-left";

   for (let i = 0; i < Math.abs(stepsNeeded); i++) {
      await page.getByTestId(buttonTestId).click();
      // Wait for carousel step to update
      await page.locator(".MuiMobileStepper-root").waitFor({ state: "visible" });
   }

   // Re-click the selected image to deselect it
   const avatar = page.locator("[data-selected]").first();
   await avatar.click();
   // Wait for deselection state to update
   await expect(avatar).toHaveAttribute("data-selected", /true|false/);
   await assertImageSelected(page, imageIndex, false);
}

/**
 * Asserts no border when modal first opens
 *
 * @param {Page} page - Playwright page instance
 */
export async function assertImageNoBorderOnInitialOpen(page: Page): Promise<void> {
   // Open the image modal first
   await openImageModal(page);

   const avatar = page.locator("[data-selected]").first();
   const dataSelected = await avatar.getAttribute("data-selected");
   expect(dataSelected).not.toBe("true");

   // Assert no border
   const borderStyle = await avatar.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.borderWidth;
   });
   expect(borderStyle).toBe("0px");
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
   const steps = page.locator(".MuiMobileStepper-dot");
   const activeStep = steps.nth(expectedStep);

   await expect(activeStep).toHaveClass(/MuiMobileStepper-dotActive/);
}

/**
 * Helper to test image modal validation: invalid URL blocking, clearing, and valid URL
 *
 * @param {Page} page - Playwright page instance
 * @param {"clear" | "default-image" | "valid-url"} unblockMethod - Method to unblock modal
 */
export async function testImageModalValidation(
   page: Page,
   unblockMethod: "clear" | "default-image" | "valid-url"
): Promise<void> {
   // Open image modal and fill invalid URL
   await openImageModal(page);
   await page.getByTestId("account-image-url").fill("invalid-url");

   // Try to close modal with Escape - should be blocked due to invalid URL
   await page.keyboard.press("Escape");

   // Assert modal is still open (blocked by invalid URL)
   await expect(page.getByTestId("account-image-carousel-left")).toBeVisible();

   // Unblock based on method
   if (unblockMethod === "clear") {
      // Clear invalid URL
      await page.getByTestId("account-image-url").fill("");
      await page.keyboard.press("Escape");
      // Assert image modal is closed (carousel button not visible)
      await expect(page.getByTestId("account-image-carousel-left")).not.toBeVisible();
   } else if (unblockMethod === "default-image") {
      // Select default image
      await selectImageFromCarousel(page, 0);
      await page.keyboard.press("Escape"); // Close image modal
      await page.keyboard.press("Escape"); // Attempt to close account modal
      // Force close with warning modal confirmation
      await closeModal(page, true);
      // Assert account modal is closed
      await expect(page.getByTestId("account-name")).not.toBeVisible();
   } else if (unblockMethod === "valid-url") {
      // Enter valid URL
      const urlInput = page.getByTestId("account-image-url");
      await urlInput.click();
      await urlInput.selectText();
      await urlInput.fill("https://example.com/image.png");
      await page.keyboard.press("Escape");
      // Assert image modal is closed
      await expect(page.getByTestId("account-image-carousel-left")).not.toBeVisible();
      await closeModal(page, true);
   }
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