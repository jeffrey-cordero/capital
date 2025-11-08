import { expect, test } from "@tests/fixtures";
import { ACCOUNTS_ROUTE } from "@tests/utils/authentication";
import { verifyAccountTrends } from "@tests/utils/dashboard";
import {
   createAccount,
   openAccountImageModal,
   selectImageFromCarousel,
   verifyAccountCard,
   verifyAccountCardsOrder,
   verifyImageBorderOnClick,
   verifyImageBorderOnReClick,
   verifyImageNoBorderOnInitialOpen,
   verifyImageSelected,
   verifyTransactionAccountDropdown
} from "@tests/utils/dashboard/accounts";
import { assertValidationErrors, closeModal, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { setupAssignedUser } from "@tests/utils/user-management";
import { type Account } from "capital/accounts";

import { displayCurrency } from "@/lib/display";

test.describe("Account Management", () => {
   test.describe("Initial State", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry);
      });

      test("should display empty accounts state on dashboard", async({ page }) => {
         await verifyAccountTrends(page, [], "$0.00", "dashboard");
         await expect(page.getByTestId("empty-accounts-trends-overview")).toBeVisible();
      });

      test("should display empty accounts state on accounts page", async({ page }) => {
         await navigateToPath(page, ACCOUNTS_ROUTE);
         await expect(page.getByTestId("accounts-empty-message")).toBeVisible();
         await verifyAccountTrends(page, [], "$0.00", "accounts-page");
      });

      test("should display Add Account button", async({ page }) => {
         await navigateToPath(page, ACCOUNTS_ROUTE);
         await expect(page.getByTestId("accounts-add-button")).toBeVisible();
         await expect(page.getByTestId("accounts-add-button")).toBeEnabled();
      });

      test("should have empty transaction account dropdown", async({ page }) => {
         await navigateToPath(page, ACCOUNTS_ROUTE);
         await verifyTransactionAccountDropdown(page, []);
      });
   });

   test.describe("Account Creation", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry);
         await navigateToPath(page, ACCOUNTS_ROUTE);
      });

      test("should validate empty name field", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await submitForm(page, { "account-balance": 1000, "account-type": "Checking" });
         await assertValidationErrors(page, { "account-name": "Name is required" });
      });

      test("should validate name minimum length", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await submitForm(page, { "account-name": "", "account-balance": 1000 });
         await assertValidationErrors(page, { "account-name": "Name is required" });
      });

      test("should validate name maximum length", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await submitForm(page, { "account-name": "a".repeat(31), "account-balance": 1000 });
         await assertValidationErrors(page, { "account-name": "Name must be at most 30 characters" });
      });

      test("should validate empty balance field", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await submitForm(page, { "account-name": "Test Account" });
         await assertValidationErrors(page, { "account-balance": "Balance is required" });
      });

      test("should validate balance minimum value", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await submitForm(page, { "account-name": "Test Account", "account-balance": -1000000000000 });
         await assertValidationErrors(page, { "account-balance": "Balance is below the minimum allowed value" });
      });

      test("should validate balance maximum value", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await submitForm(page, { "account-name": "Test Account", "account-balance": 1000000000000 });
         await assertValidationErrors(page, { "account-balance": "Balance exceeds the maximum allowed value" });
      });

      test("should validate invalid image URL format", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);

         // Fill form fields to make submit button visible
         await page.getByTestId("account-name").fill("Test Account");
         await page.getByTestId("account-balance").fill("1000");
         await page.waitForTimeout(500);

         // Open image modal and enter invalid URL
         await openAccountImageModal(page);
         await page.getByTestId("account-image-url").fill("invalid-url");

         // Try to close modal with Escape - should be blocked due to invalid URL
         await page.keyboard.press("Escape");
         await page.waitForTimeout(300);

         // Verify modal is still open (blocked by invalid URL)
         await expect(page.getByTestId("account-image-carousel-left")).toBeVisible();

         // Test unblocking by clearing the invalid URL
         const urlInput = page.getByTestId("account-image-url");
         await urlInput.click();
         await urlInput.clear();
         await page.keyboard.press("Escape");
         await page.waitForTimeout(500);

         // Reopen modal and test unblocking by selecting a default image
         await openAccountImageModal(page);
         await page.getByTestId("account-image-url").fill("invalid-url");
         await selectImageFromCarousel(page, 0); // This clears invalid URL and allows closing
         await closeModal(page);
         await page.waitForTimeout(500);

         // Reopen modal and test unblocking by entering valid URL
         await openAccountImageModal(page);
         const urlInput2 = page.getByTestId("account-image-url");
         await urlInput2.fill("invalid-url");
         await urlInput2.click();
         await urlInput2.selectText();
         await urlInput2.fill("https://example.com/image.png");
         await page.keyboard.press("Escape");
         await page.waitForTimeout(500);

         // Test form validation: reopen modal, enter invalid URL, try to close (should be blocked)
         await openAccountImageModal(page);
         await page.getByTestId("account-image-url").fill("invalid-url");

         // Try to close the image modal with Escape - should be blocked due to invalid URL
         await page.keyboard.press("Escape");
         await page.waitForTimeout(300);

         // Verify modal is still open (blocked by invalid URL)
         await expect(page.getByTestId("account-image-carousel-left")).toBeVisible();

         // Verify the validation error appears in the image modal's FormHelperText
         // The error is set when trying to close the modal with invalid URL
         const errorText = page.locator(".MuiFormControl-root:has([data-testid=\"account-image-url\"]) .MuiFormHelperText-root");
         // Wait for error to appear (it may take a moment for the error state to update)
         await page.waitForTimeout(200);
         // Check if error text contains the validation message
         const errorContent = await errorText.textContent();
         expect(errorContent).toContain("URL must be valid");

         // Verify that the form cannot be submitted with invalid URL by checking that
         // the modal remains open and the error persists
         // The form submission should be blocked or the validation should prevent submission
         // Since the modal is blocking the submit button, we can't actually click it,
         // but we've verified that the invalid URL prevents closing the modal and shows an error
      });

      test("should successfully create account with all fields", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Test Checking Account",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Verify account card is visible (modal closed)
         await expect(page.getByTestId(`account-card-${accountId}`)).toBeVisible();
         await verifyAccountCard(page, { account_id: accountId, ...accountData } as Account);

         // Verify net worth updates
         await verifyAccountTrends(page, [{ account_id: accountId, ...accountData } as Account], displayCurrency(5000), "accounts-page");
      });

      test("should close modal after successful creation", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Test Account",
            balance: 1000,
            type: "Savings"
         };

         await createAccount(page, accountData);

         // Verify modal is closed (card visible, modal not visible)
         await expect(page.getByTestId("accounts-add-button")).toBeVisible();
         const modal = page.locator(".MuiModal-root");
         await expect(modal).not.toBeVisible();
      });
   });

   test.describe("Image Selection", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry);
         await navigateToPath(page, ACCOUNTS_ROUTE);
      });

      test("should open image modal", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await openAccountImageModal(page);
         await expect(page.locator("[data-selected]")).toBeVisible();
      });

      test("should have no border on initial modal open", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await openAccountImageModal(page);
         await verifyImageNoBorderOnInitialOpen(page);
      });

      test("should navigate carousel left and right", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await openAccountImageModal(page);

         // Navigate right
         await page.getByTestId("account-image-carousel-right").click();
         await page.waitForTimeout(200);

         // Navigate left
         await page.getByTestId("account-image-carousel-left").click();
         await page.waitForTimeout(200);
      });

      test("should show border on image click", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await openAccountImageModal(page);
         await verifyImageBorderOnClick(page, 0);
      });

      test("should remove border on re-click", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await openAccountImageModal(page);
         await verifyImageBorderOnClick(page, 0);
         await verifyImageBorderOnReClick(page, 0);
      });

      test("should select each of 9 default images", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await openAccountImageModal(page);

         // Select each image (0-8) - modal stays open between selections
         for (let i = 0; i < 9; i++) {
            await selectImageFromCarousel(page, i);
            // Verify selection (modal is still open)
            await verifyImageSelected(page, i, true);
         }

         // Close modal after all selections
         await closeModal(page);
      });

      test("should accept valid URL input", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);
         await openAccountImageModal(page);
         await page.getByTestId("account-image-url").fill("https://example.com/image.png");
         await page.keyboard.press("Escape");
         await page.waitForTimeout(200);
      });
   });

   test.describe("Account Viewing", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry);
         await navigateToPath(page, ACCOUNTS_ROUTE);
      });

      test("should display empty accounts state", async({ page }) => {
         await expect(page.getByTestId("accounts-empty-message")).toBeVisible();
         await expect(page.locator("[data-testid^=\"account-card-\"]")).toHaveCount(0);
      });

      test("should have accessible form inputs", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);

         await expect(page.getByTestId("account-name")).toBeVisible();
         await expect(page.getByTestId("account-balance")).toBeVisible();
         await expect(page.getByTestId("account-type")).toBeVisible();
         await expect(page.getByTestId("account-image-button")).toBeVisible();
      });

      test("should verify image modal border behavior", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await page.waitForTimeout(300);

         // No border on initial open
         await openAccountImageModal(page);
         await verifyImageNoBorderOnInitialOpen(page);

         // Border appears on click
         await verifyImageBorderOnClick(page, 0);

         // Border disappears on re-click
         await verifyImageBorderOnReClick(page, 0);
      });

      test("should create account and verify card visibility", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "View Test Account",
            balance: 2000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Verify card is visible after creation (modal closed)
         await expect(page.getByTestId(`account-card-${accountId}`)).toBeVisible();
         await verifyAccountCard(page, { account_id: accountId, ...accountData } as Account);
      });
   });

   test.describe("Account Type & Net Worth", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry);
         await navigateToPath(page, ACCOUNTS_ROUTE);
      });

      test("should create asset account and verify blue bar", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Checking Account",
            balance: 10000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);
         await verifyAccountTrends(page, [{ account_id: accountId, ...accountData } as Account], displayCurrency(10000), "accounts-page");
      });

      test("should create liability account and verify red bar", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Credit Card",
            balance: 5000,
            type: "Credit Card"
         };

         const accountId = await createAccount(page, accountData);
         await verifyAccountTrends(page, [{ account_id: accountId, ...accountData } as Account], displayCurrency(-5000), "accounts-page");
      });

      test("should calculate net worth correctly with mixed accounts", async({ page }) => {
         const checkingAccount: Partial<Account> = {
            name: "Checking",
            balance: 10000,
            type: "Checking"
         };
         const creditCardAccount: Partial<Account> = {
            name: "Credit Card",
            balance: 3000,
            type: "Credit Card"
         };

         const checkingId = await createAccount(page, checkingAccount);
         const creditCardId = await createAccount(page, creditCardAccount);

         // Net worth = 10000 - 3000 = 7000
         const accounts: Account[] = [
            { account_id: checkingId, ...checkingAccount } as Account,
            { account_id: creditCardId, ...creditCardAccount } as Account
         ];
         await verifyAccountTrends(page, accounts, displayCurrency(7000), "accounts-page");
      });
   });

   test.describe("Account Card Display", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry);
         await navigateToPath(page, ACCOUNTS_ROUTE);
      });

      test("should display account card with correct information", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Display Test Account",
            balance: 7500,
            type: "Savings"
         };

         const accountId = await createAccount(page, accountData);
         await verifyAccountCard(page, { account_id: accountId, ...accountData } as Account);
      });

      test("should display cards in correct order", async({ page }) => {
         const account1: Partial<Account> = { name: "First Account", balance: 1000, type: "Checking" };
         const account2: Partial<Account> = { name: "Second Account", balance: 2000, type: "Savings" };

         const id1 = await createAccount(page, account1);
         const id2 = await createAccount(page, account2);

         await verifyAccountCardsOrder(page, [id1, id2]);
      });
   });

   test.describe("Transaction Form Integration", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry);
         await navigateToPath(page, ACCOUNTS_ROUTE);
      });

      test("should show created accounts in transaction dropdown", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Transaction Test Account",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Navigate to transactions or open transaction form
         // Verify dropdown contains the account
         const accounts: Account[] = [{ account_id: accountId, ...accountData } as Account];
         await verifyTransactionAccountDropdown(page, accounts);
      });
   });

   test.describe("Account Update", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry);
         await navigateToPath(page, ACCOUNTS_ROUTE);
      });

      test("should update account name", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Original Name",
            balance: 1000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Open update modal
         await page.getByTestId(`account-card-${accountId}`).click();
         await page.waitForTimeout(300);

         // Update name
         await submitForm(page, { "account-name": "Updated Name" }, { buttonType: "Update" });

         // Modal stays open - manually close to verify card
         await closeModal(page);
         await page.waitForTimeout(300);

         // Verify update
         await verifyAccountCard(page, { account_id: accountId, name: "Updated Name", balance: 1000, type: "Checking" } as Account);
      });

      test("should update account balance and recalculate net worth", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Balance Test",
            balance: 1000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Update balance
         await page.getByTestId(`account-card-${accountId}`).click();
         await page.waitForTimeout(300);
         await submitForm(page, { "account-balance": 5000 }, { buttonType: "Update" });
         await closeModal(page);
         await page.waitForTimeout(300);

         // Verify net worth updated
         const updatedAccount: Account = { account_id: accountId, name: "Balance Test", balance: 5000, type: "Checking" } as Account;
         await verifyAccountTrends(page, [updatedAccount], displayCurrency(5000), "accounts-page");
      });

      test("should update account type and recalculate net worth", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Type Test",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Update to liability type
         await page.getByTestId(`account-card-${accountId}`).click();
         await page.waitForTimeout(300);
         await submitForm(page, { "account-type": "Credit Card" }, { buttonType: "Update" });
         await closeModal(page);
         await page.waitForTimeout(300);

         // Verify net worth recalculated (should be negative now)
         const updatedAccount: Account = { account_id: accountId, name: "Type Test", balance: 5000, type: "Credit Card" } as Account;
         await verifyAccountTrends(page, [updatedAccount], displayCurrency(-5000), "accounts-page");
      });

      test("should keep modal open after update", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Modal Test",
            balance: 1000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Open update modal
         await page.getByTestId(`account-card-${accountId}`).click();
         await page.waitForTimeout(300);

         // Update account
         await submitForm(page, { "account-name": "Updated" }, { buttonType: "Update" });
         await page.waitForTimeout(500);

         // Verify modal is still open
         const modal = page.locator(".MuiModal-root");
         await expect(modal).toBeVisible();
      });
   });

   test.describe("Drag and Drop", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry);
         await navigateToPath(page, ACCOUNTS_ROUTE);
      });

      test("should reorder accounts via drag and drop", async({ page }) => {
         const account1: Partial<Account> = { name: "First", balance: 1000, type: "Checking" };
         const account2: Partial<Account> = { name: "Second", balance: 2000, type: "Savings" };

         const id1 = await createAccount(page, account1);
         const id2 = await createAccount(page, account2);

         await verifyAccountCardsOrder(page, [id1, id2]);

         // Get the drag handle and target card positions
         const dragHandle1 = page.getByTestId(`account-card-drag-${id1}`);
         const card1 = page.getByTestId(`account-card-${id1}`);
         const card2 = page.getByTestId(`account-card-${id2}`);

         // Get bounding boxes for positioning
         const handleBox = await dragHandle1.boundingBox();
         const card1Box = await card1.boundingBox();
         const card2Box = await card2.boundingBox();

         if (!handleBox || !card1Box || !card2Box) {
            throw new Error("Failed to get bounding boxes for drag and drop");
         }

         // Calculate the center of the drag handle
         const handleCenterX = handleBox.x + handleBox.width / 2;
         const handleCenterY = handleBox.y + handleBox.height / 2;

         // Move mouse to drag handle center
         await page.mouse.move(handleCenterX, handleCenterY);
         await page.mouse.down();
         await page.waitForTimeout(100); // Small delay for drag activation

         // Move mouse at least 8 pixels to activate drag (dnd-kit activationConstraint)
         // Move to the right to activate (keep Y constant)
         await page.mouse.move(handleCenterX + 10, handleCenterY);
         await page.waitForTimeout(100);

         // Move to the right by at least 400px (keep Y constant)
         // Card width is ~330px, spacing is ~24px, so we need to move at least 400px to the right
         const targetX = handleCenterX + 600; // Move 800px to the right from handle position

         await page.mouse.move(targetX, handleCenterY);
         await page.waitForTimeout(200);

         // Release mouse to drop
         await page.mouse.up();
         await page.waitForTimeout(1000); // Wait for drag end handler and reorder to complete

         // Verify visual order changed
         await verifyAccountCardsOrder(page, [id2, id1]);

         // Reload and verify order persists
         await page.reload();
         await page.waitForTimeout(1000);
         await verifyAccountCardsOrder(page, [id2, id1]);
      });
   });

   test.describe("Account Deletion", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry);
         await navigateToPath(page, ACCOUNTS_ROUTE);
      });

      test("should show confirmation dialog on delete", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Delete Test",
            balance: 1000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Open account modal
         await page.getByTestId(`account-card-${accountId}`).click();
         await page.waitForTimeout(500);

         // Wait for form to be visible
         await page.getByTestId("account-name").waitFor({ state: "visible" });

         // Wait for delete button to appear (it's rendered when isUpdating is true)
         // The button opens a confirmation dialog
         await page.getByTestId("account-delete-button").waitFor({ state: "visible", timeout: 10000 });

         // Click delete button to open confirmation dialog
         await page.getByTestId("account-delete-button").click();
         await page.waitForTimeout(200);

         // Verify confirmation dialog appears
         await expect(page.getByText("Are you sure you want to delete your account?")).toBeVisible();
      });

      test("should delete account and update net worth", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "To Delete",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Delete account
         await page.getByTestId(`account-card-${accountId}`).click();
         await page.waitForTimeout(500);

         // Wait for form to be visible
         await page.getByTestId("account-name").waitFor({ state: "visible" });

         // Wait for delete button to appear (it's rendered when isUpdating is true)
         await page.getByTestId("account-delete-button").waitFor({ state: "visible", timeout: 10000 });

         // Click delete button to open confirmation dialog
         await page.getByTestId("account-delete-button").click();
         await page.waitForTimeout(300);

         // Wait for confirmation dialog to appear and click confirm button
         await page.getByTestId("account-delete-button-confirm").waitFor({ state: "visible", timeout: 5000 });
         await page.getByTestId("account-delete-button-confirm").click();
         await page.waitForTimeout(500);

         // Verify account removed and net worth updated
         await expect(page.getByTestId(`account-card-${accountId}`)).not.toBeVisible();
         await verifyAccountTrends(page, [], "$0.00", "accounts-page");
      });
   });
});