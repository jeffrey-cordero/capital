import { expect, type Page } from "@playwright/test";
import { ACCOUNTS_ROUTE } from "@tests/utils/authentication";
import { submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { type Account } from "capital/accounts";

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

   // Wait for modal to close (create closes modal)
   await page.waitForTimeout(500);

   // Extract account ID from the created card (first account card container, not child elements)
   // Wait for card to appear
   await page.waitForTimeout(500);

   // Find the first card container using a more specific approach
   // Get all divs within the accounts container and filter for exact test ID match
   const allElements = await page.locator("#accounts div").all();

   let accountId: string | null = null;
   for (const element of allElements) {
      const testId = await element.getAttribute("data-testid");
      // Only match exact "account-card-{uuid}" pattern (UUID format: 8-4-4-4-12 hex chars)
      if (testId && /^account-card-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId)) {
         accountId = testId.replace("account-card-", "");
         break;
      }
   }

   if (!accountId) {
      throw new Error("Failed to create account - account card not found");
   }
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
 * Verifies account card information and DOM position
 *
 * @param {Page} page - Playwright page instance
 * @param {Account} account - Account to verify
 * @param {number} [expectedPosition] - Expected position index (0-based)
 */
export async function verifyAccountCard(
   page: Page,
   account: Account,
   expectedPosition?: number
): Promise<void> {
   const card = page.getByTestId(`account-card-${account.account_id}`);
   await expect(card).toBeVisible();

   // Verify card content
   await expect(page.getByTestId(`account-card-name-${account.account_id}`)).toHaveText(account.name);
   await expect(page.getByTestId(`account-card-balance-${account.account_id}`)).toHaveText(displayCurrency(account.balance));
   if (account.type) {
      await expect(page.getByTestId(`account-card-type-${account.account_id}`)).toHaveText(account.type);
   }

   // Verify position if specified
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
 * Verifies account cards appear in the specified order
 *
 * @param {Page} page - Playwright page instance
 * @param {string[]} accountIds - Array of account IDs in expected order
 */
export async function verifyAccountCardsOrder(
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

   // Sort cards by their Y position (top to bottom), then X position (left to right)
   cardElements.sort((a, b) => {
      const yDiff = a.boundingBox.y - b.boundingBox.y;
      if (Math.abs(yDiff) > 10) {
         // Different rows - sort by Y
         return yDiff;
      }
      // Same row - sort by X
      return a.boundingBox.x - b.boundingBox.x;
   });

   // Verify each account is at the correct position
   for (let i = 0; i < accountIds.length; i++) {
      const expectedAccountId = accountIds[i];
      const expectedTestId = `account-card-${expectedAccountId}`;
      expect(cardElements[i].testId).toBe(expectedTestId);
   }
}

/**
 * Verifies transaction account dropdown options and auto-selection
 *
 * @param {Page} page - Playwright page instance
 * @param {Account[]} expectedAccounts - Expected accounts in dropdown
 * @param {string} [autoSelectedAccountId] - Account ID that should be auto-selected
 */
export async function verifyTransactionAccountDropdown(
   page: Page,
   expectedAccounts: Account[],
   autoSelectedAccountId?: string
): Promise<void> {
   // Navigate to accounts page (transactions are displayed on the accounts page)
   await navigateToPath(page, ACCOUNTS_ROUTE);
   await page.waitForTimeout(500); // Wait for page to load

   // Scroll to transactions section and click "Add Transaction" button
   const addButton = page.getByRole("button", { name: /add transaction/i });
   await addButton.waitFor({ state: "visible", timeout: 5000 });
   await addButton.scrollIntoViewIfNeeded();
   await addButton.click();
   await page.waitForTimeout(500); // Wait for modal to open

   // The test ID is on the input element, but we need to click the Select's combobox div
   // Find the Select element by locating it via the label or by finding the parent FormControl
   const inputElement = page.getByTestId("transaction-account-select");
   await inputElement.waitFor({ state: "visible", timeout: 5000 });

   // Find the actual Select element (the clickable combobox) by going up to FormControl and finding Select
   // Or use the label to find the FormControl, then the Select
   const selectElement = page.locator("label:has-text(\"Account\")").locator("..").locator(".MuiSelect-root").first();
   await selectElement.waitFor({ state: "visible", timeout: 5000 });

   if (expectedAccounts.length === 0) {
      // Empty state - dropdown should be visible
      await expect(inputElement).toBeVisible();
      // Click the Select element to open the dropdown
      await selectElement.click({ force: true });
      await page.waitForTimeout(300); // Wait for dropdown menu to open
      await expect(page.getByRole("option", { name: "-- Select Account --" })).toBeVisible();
      await page.keyboard.press("Escape"); // Close dropdown
   } else {
      // Click the Select element to open options
      await selectElement.click({ force: true });
      await page.waitForTimeout(300); // Wait for dropdown menu to open

      // Verify placeholder option exists
      await expect(page.getByRole("option", { name: "-- Select Account --" })).toBeVisible();

      // Verify each account appears in dropdown
      for (const account of expectedAccounts) {
         const option = page.getByRole("option", { name: account.name });
         await expect(option).toBeVisible();
      }

      // Verify auto-selection if specified
      if (autoSelectedAccountId) {
         const selectedAccount = expectedAccounts.find(a => a.account_id === autoSelectedAccountId);
         if (selectedAccount) {
            await expect(selectElement).toContainText(selectedAccount.name);
         }
      }

      // Close dropdown
      await page.keyboard.press("Escape");
   }

   // Close the transaction form modal
   await page.keyboard.press("Escape");
   await page.waitForTimeout(200);
}

/**
 * Opens the account image selection modal by clicking the image button
 *
 * @param {Page} page - Playwright page instance
 */
export async function openAccountImageModal(page: Page): Promise<void> {
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
 * Navigates carousel and selects an image by index
 * Ensures the image modal is open before interacting
 *
 * @param {Page} page - Playwright page instance
 * @param {number} imageIndex - Index of image to select (0-based)
 */
export async function selectImageFromCarousel(
   page: Page,
   imageIndex: number
): Promise<void> {
   // Ensure image modal is open by clicking the image button
   await openAccountImageModal(page);

   // Navigate to the desired image
   const currentStep = await page.locator(".MuiMobileStepper-root").getAttribute("aria-label");
   const currentIndex = currentStep ? parseInt(currentStep.split(" ")[1] || "0") : 0;

   const stepsNeeded = imageIndex - currentIndex;
   const direction = stepsNeeded > 0 ? "right" : "left";
   const buttonTestId = direction === "right" ? "account-image-carousel-right" : "account-image-carousel-left";

   for (let i = 0; i < Math.abs(stepsNeeded); i++) {
      await page.getByTestId(buttonTestId).click();
      await page.waitForTimeout(100);
   }

   // Click on the image to select it
   const avatar = page.locator("[data-selected]").first();
   await avatar.click();
   await page.waitForTimeout(200);
   // Note: Modal stays open after selection - user must close it manually
}

/**
 * Verifies image selection state via data-selected attribute and border CSS
 * Ensures the image modal is open before verifying
 *
 * @param {Page} page - Playwright page instance
 * @param {number} imageIndex - Index of image to verify (used for context, actual verification uses first avatar)
 * @param {boolean} isSelected - Whether image should be selected
 */
export async function verifyImageSelected(
   page: Page,
   imageIndex: number,
   isSelected: boolean
): Promise<void> {
   // Note: imageIndex is provided for context but we verify the currently displayed avatar
   void imageIndex;

   // Ensure image modal is open
   await openAccountImageModal(page);

   const avatar = page.locator("[data-selected]").first();

   if (isSelected) {
      await expect(avatar).toHaveAttribute("data-selected", "true");

      // Verify border CSS
      const borderStyle = await avatar.evaluate((el) => {
         const computedStyle = window.getComputedStyle(el);
         return computedStyle.borderWidth;
      });
      expect(borderStyle).toBe("3px");
   } else {
      const dataSelected = await avatar.getAttribute("data-selected");
      expect(dataSelected).not.toBe("true");

      // Verify no border
      const borderStyle = await avatar.evaluate((el) => {
         const computedStyle = window.getComputedStyle(el);
         return computedStyle.borderWidth;
      });
      expect(borderStyle).toBe("0px");
   }
}

/**
 * Verifies border appears on image click
 *
 * @param {Page} page - Playwright page instance
 * @param {number} imageIndex - Index of image to click
 */
export async function verifyImageBorderOnClick(
   page: Page,
   imageIndex: number
): Promise<void> {
   // Navigate to image and select it (selectImageFromCarousel will open modal)
   await selectImageFromCarousel(page, imageIndex);

   // Verify selection (verifyImageSelected will reopen modal if needed)
   await verifyImageSelected(page, imageIndex, true);
}

/**
 * Verifies border disappears on re-click
 *
 * @param {Page} page - Playwright page instance
 * @param {number} imageIndex - Index of image to re-click
 */
export async function verifyImageBorderOnReClick(
   page: Page,
   imageIndex: number
): Promise<void> {
   // Ensure modal is open
   await openAccountImageModal(page);

   // Navigate to the image if needed
   const currentStep = await page.locator(".MuiMobileStepper-root").getAttribute("aria-label");
   const currentIndex = currentStep ? parseInt(currentStep.split(" ")[1] || "0") : 0;
   const stepsNeeded = imageIndex - currentIndex;
   const direction = stepsNeeded > 0 ? "right" : "left";
   const buttonTestId = direction === "right" ? "account-image-carousel-right" : "account-image-carousel-left";

   for (let i = 0; i < Math.abs(stepsNeeded); i++) {
      await page.getByTestId(buttonTestId).click();
      await page.waitForTimeout(100);
   }

   // Re-click the selected image to deselect it
   const avatar = page.locator("[data-selected]").first();
   await avatar.click();
   await page.waitForTimeout(200);
   await verifyImageSelected(page, imageIndex, false);
}

/**
 * Verifies no border when modal first opens
 * Opens the image modal before verifying
 *
 * @param {Page} page - Playwright page instance
 */
export async function verifyImageNoBorderOnInitialOpen(page: Page): Promise<void> {
   // Open the image modal first
   await openAccountImageModal(page);

   const avatar = page.locator("[data-selected]").first();
   const dataSelected = await avatar.getAttribute("data-selected");
   expect(dataSelected).not.toBe("true");

   // Verify no border
   const borderStyle = await avatar.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.borderWidth;
   });
   expect(borderStyle).toBe("0px");
}

/**
 * Verifies active step in MobileStepper matches expected index
 *
 * @param {Page} page - Playwright page instance
 * @param {number} expectedStep - Expected active step index
 */
export async function verifyActiveImageStep(
   page: Page,
   expectedStep: number
): Promise<void> {
   const stepper = page.locator(".MuiMobileStepper-root");
   const ariaLabel = await stepper.getAttribute("aria-label");
   const currentStep = ariaLabel ? parseInt(ariaLabel.split(" ")[1] || "0") : 0;
   expect(currentStep).toBe(expectedStep);
}

/**
 * Verifies account form graph display (balance, percentage chip, flat line)
 *
 * @param {Page} page - Playwright page instance
 * @param {number} expectedBalance - Expected balance value
 * @param {string} expectedPercentage - Expected percentage value (e.g., "0.00%")
 */
export async function verifyAccountFormGraph(
   page: Page,
   expectedBalance: number,
   expectedPercentage: string
): Promise<void> {
   // Verify balance is displayed (implementation depends on graph component structure)
   // Verify percentage chip (implementation depends on graph component structure)
   // Verify flat line graph (implementation depends on graph component structure)
   // These verifications will need to be implemented based on actual graph component structure
   // Placeholder implementation - to be completed based on actual graph component structure
   void page;
   void expectedBalance;
   void expectedPercentage;
}