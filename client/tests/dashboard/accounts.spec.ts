import { expect, test } from "@tests/fixtures";
import { assertComponentVisibility, closeModal } from "@tests/utils";
import { ACCOUNTS_ROUTE, DASHBOARD_ROUTE } from "@tests/utils/authentication";
import { assertAccountTrends } from "@tests/utils/dashboard";
import {
   assertAccountCard,
   assertAccountCardsOrder,
   assertActiveImageStep,
   assertImageBorderOnClick,
   assertImageBorderOnReClick,
   assertImageNoBorderOnInitialOpen,
   assertImageSelected,
   assertTransactionAccountDropdown,
   createAccount,
   openImageModal,
   selectImageFromCarousel,
   testImageModalValidation
} from "@tests/utils/dashboard/accounts";
import { assertValidationErrors, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { setupAssignedUser } from "@tests/utils/user-management";
import { type Account } from "capital/accounts";

import { displayCurrency } from "@/lib/display";

test.describe("Account Management", () => {
   test.describe("Initial State", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should display empty accounts state on dashboard page", async({ page }) => {
         await navigateToPath(page, DASHBOARD_ROUTE);

         await assertAccountTrends(page, [], "$0.00", "dashboard");
         await assertComponentVisibility(page, "empty-accounts-trends-overview", "No available accounts");
      });

      test("should display empty accounts state on accounts page", async({ page }) => {
         await assertAccountTrends(page, [], "$0.00", "accounts-page");

         await assertComponentVisibility(page, "accounts-empty-message", "No available accounts");
         await assertComponentVisibility(page, "accounts-add-button", "Add Account");
         await expect(page.getByTestId("accounts-add-button")).toBeEnabled();
         await assertTransactionAccountDropdown(page, []);
      });
   });

   test.describe("Account Creation", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should validate empty name field", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await submitForm(page, { "account-balance": 1000, "account-type": "Checking" });
         await assertValidationErrors(page, { "account-name": "Name is required" });
      });

      test("should validate name minimum length", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await submitForm(page, { "account-name": "", "account-balance": 1000 });
         await assertValidationErrors(page, { "account-name": "Name is required" });
      });

      test("should validate name maximum length", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await submitForm(page, { "account-name": "a".repeat(31), "account-balance": 1000 });
         await assertValidationErrors(page, { "account-name": "Name must be at most 30 characters" });
      });

      test("should validate empty balance field", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await submitForm(page, { "account-name": "Test Account" });
         await assertValidationErrors(page, { "account-balance": "Balance is required" });
      });

      test("should validate balance minimum value", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await submitForm(page, { "account-name": "Test Account", "account-balance": -1000000000000 });
         await assertValidationErrors(page, { "account-balance": "Balance is below the minimum allowed value" });
      });

      test("should validate balance maximum value", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await submitForm(page, { "account-name": "Test Account", "account-balance": 1000000000000 });
         await assertValidationErrors(page, { "account-balance": "Balance exceeds the maximum allowed value" });
      });

      test("should validate invalid image URL format", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");

         // Fill form fields to make submit button visible
         await page.getByTestId("account-name").fill("Test Account");
         await page.getByTestId("account-balance").fill("1000");
         await assertComponentVisibility(page, "account-submit");

         // Test unblocking by clearing the invalid URL
         await testImageModalValidation(page, "clear");

         // Test unblocking by selecting a default image
         await testImageModalValidation(page, "default-image");

         // Test unblocking by entering valid URL
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await page.getByTestId("account-name").fill("Test Account");
         await page.getByTestId("account-balance").fill("1000");
         await testImageModalValidation(page, "valid-url");

         // Test form validation error appears when trying to close with invalid URL
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await page.getByTestId("account-name").fill("Test Account");
         await page.getByTestId("account-balance").fill("1000");
         await openImageModal(page);
         await page.getByTestId("account-image-url").fill("invalid-url");

         // Try to close the image modal with Escape - should be blocked due to invalid URL
         await page.keyboard.press("Escape");

         // Assert modal is still open (blocked by invalid URL)
         await expect(page.getByTestId("account-image-carousel-left")).toBeVisible();

         // Assert validation error appears in FormHelperText
         const errorText = page.locator(".MuiFormControl-root:has([data-testid=\"account-image-url\"]) .MuiFormHelperText-root");
         await expect(errorText).toBeVisible();
         // Check if error text contains the validation message
         const errorContent = await errorText.textContent();
         expect(errorContent).toContain("URL must be valid");
      });

      test("should successfully create account with all fields", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Test Checking Account",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Assert account card is visible (modal closed)
         await assertComponentVisibility(page, `account-card-${accountId}`);
         await assertComponentVisibility(page, `account-card-name-${accountId}`, accountData.name!);
         await assertAccountCard(page, { account_id: accountId, ...accountData } as Account);

         // Assert net worth updates
         await assertAccountTrends(page, [{ account_id: accountId, ...accountData } as Account], displayCurrency(5000), "accounts-page");
      });

      test("should close modal after successful creation", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Test Account",
            balance: 1000,
            type: "Savings"
         };

         await createAccount(page, accountData);

         // Assert modal is closed (card visible, modal not visible)
         await assertComponentVisibility(page, "accounts-add-button", "Add Account");
         const modal = page.locator(".MuiModal-root");
         await expect(modal).not.toBeVisible();
      });
   });

   test.describe("Image Selection", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should open image modal", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await openImageModal(page);
         const avatar = page.locator("[data-selected]").first();
         await expect(avatar).toBeVisible();
         await expect(avatar).toHaveClass(/MuiAvatar-root/);
      });

      test("should have no border on initial modal open", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await openImageModal(page);
         await assertImageNoBorderOnInitialOpen(page);
      });

      test("should navigate carousel left and right", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await openImageModal(page);

         // Assert initial step is 0
         await assertActiveImageStep(page, 0);

         // Navigate right
         await page.getByTestId("account-image-carousel-right").click();
         await assertActiveImageStep(page, 1);

         // Navigate left
         await page.getByTestId("account-image-carousel-left").click();
         await assertActiveImageStep(page, 0);
      });

      test("should show border on image click", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await openImageModal(page);
         await assertImageBorderOnClick(page, 0);
      });

      test("should remove border on re-click", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await openImageModal(page);
         await assertImageBorderOnClick(page, 0);
         await assertImageBorderOnReClick(page, 0);
      });

      test("should select each of 9 default images", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await openImageModal(page);

         // Select each image (0-8) - modal stays open between selections
         for (let i = 0; i < 9; i++) {
            await selectImageFromCarousel(page, i);
            // Assert selection (modal is still open)
            await assertImageSelected(page, i, true);
         }

         // Close modal after all selections
         await page.keyboard.press("Escape");
         await closeModal(page, true);
      });

      test("should accept valid URL input", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");
         await openImageModal(page);
         await page.getByTestId("account-image-url").fill("https://example.com/image.png");
         await page.keyboard.press("Escape");
         await expect(page.getByTestId("account-image-carousel-left")).not.toBeVisible();
      });
   });

   test.describe("Account Viewing", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should display empty accounts state", async({ page }) => {
         await assertComponentVisibility(page, "accounts-empty-message", "No available accounts");
         await expect(page.locator("[data-testid^=\"account-card-\"]")).toHaveCount(0);
      });

      test("should have accessible form inputs", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");

         const formInputs = [
            { testId: "account-name", label: "Name" },
            { testId: "account-balance", label: "Balance" },
            { testId: "account-type", label: "Type" },
            { testId: "account-image-button" }
         ];
         for (const input of formInputs) {
            await assertComponentVisibility(page, input.testId, undefined, input.label);
         }
      });

      test("should assert image modal border behavior", async({ page }) => {
         await page.getByTestId("accounts-add-button").click();
         await assertComponentVisibility(page, "account-name");

         // No border on initial open
         await openImageModal(page);
         await assertImageNoBorderOnInitialOpen(page);

         // Border appears on click
         await assertImageBorderOnClick(page, 0);

         // Border disappears on re-click
         await assertImageBorderOnReClick(page, 0);
      });

      test("should create account and assert card visibility", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "View Test Account",
            balance: 2000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Assert card is visible after creation (modal closed)
         await expect(page.getByTestId(`account-card-${accountId}`)).toBeVisible();
         await assertAccountCard(page, { account_id: accountId, ...accountData } as Account);
      });
   });

   test.describe("Account Type & Net Worth", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should create asset account and assert blue bar", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Checking Account",
            balance: 10000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);
         await assertAccountTrends(page, [{ account_id: accountId, ...accountData } as Account], displayCurrency(10000), "accounts-page");
      });

      test("should create liability account and assert red bar", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Credit Card",
            balance: 5000,
            type: "Credit Card"
         };

         const accountId = await createAccount(page, accountData);
         await assertAccountTrends(page, [{ account_id: accountId, ...accountData } as Account], displayCurrency(-5000), "accounts-page");
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
         await assertAccountTrends(page, accounts, displayCurrency(7000), "accounts-page");
      });
   });

   test.describe("Account Card Display", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should display account card with correct information", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Display Test Account",
            balance: 7500,
            type: "Savings"
         };

         const accountId = await createAccount(page, accountData);
         await assertAccountCard(page, { account_id: accountId, ...accountData } as Account);
      });

      test("should display cards in correct order", async({ page }) => {
         const account1: Partial<Account> = { name: "First Account", balance: 1000, type: "Checking" };
         const account2: Partial<Account> = { name: "Second Account", balance: 2000, type: "Savings" };

         const id1 = await createAccount(page, account1);
         const id2 = await createAccount(page, account2);

         await assertAccountCardsOrder(page, [id1, id2]);
      });
   });

   test.describe("Transaction Form Integration", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should show created accounts in transaction dropdown", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Transaction Test Account",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);

         // Navigate to transactions or open transaction form
         // Assert dropdown contains the account
         const accounts: Account[] = [{ account_id: accountId, ...accountData } as Account];
         await assertTransactionAccountDropdown(page, accounts);
      });

      test("should auto-select account in transaction dropdown", async({ page }) => {
         const accountData: Partial<Account> = {
            name: "Transaction Test Account",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, accountData);
         await assertTransactionAccountDropdown(page, [{ account_id: accountId, ...accountData } as Account], accountId);
      });
   });

   test.describe("Account Update", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
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
         await assertComponentVisibility(page, "account-name");

         // Update name
         await submitForm(page, { "account-name": "Updated Name" }, { buttonType: "Update" });

         // Modal stays open - manually close to assert card
         await closeModal(page);
         await assertComponentVisibility(page, `account-card-${accountId}`);

         // Assert update
         await assertAccountCard(page, { account_id: accountId, name: "Updated Name", balance: 1000, type: "Checking" } as Account);
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
         await assertComponentVisibility(page, "account-name");
         await submitForm(page, { "account-balance": 5000 }, { buttonType: "Update" });
         await closeModal(page);
         await assertComponentVisibility(page, `account-card-${accountId}`);

         // Assert net worth updated
         const updatedAccount: Account = { account_id: accountId, name: "Balance Test", balance: 5000, type: "Checking" } as Account;
         await assertAccountTrends(page, [updatedAccount], displayCurrency(5000), "accounts-page");
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
         await assertComponentVisibility(page, "account-name");
         await submitForm(page, { "account-type": "Credit Card" }, { buttonType: "Update" });
         await closeModal(page);
         await assertComponentVisibility(page, `account-card-${accountId}`);

         // Assert net worth recalculated (should be negative now)
         const updatedAccount: Account = { account_id: accountId, name: "Type Test", balance: 5000, type: "Credit Card" } as Account;
         await assertAccountTrends(page, [updatedAccount], displayCurrency(-5000), "accounts-page");
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
         await assertComponentVisibility(page, "account-name");

         // Update account
         await submitForm(page, { "account-name": "Updated" }, { buttonType: "Update" });

         // Assert modal is still open (form should still be visible)
         const modal = page.locator(".MuiModal-root");
         await expect(modal).toBeVisible();
         await assertComponentVisibility(page, "account-name");
      });
   });

   test.describe("Drag and Drop", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should reorder accounts via drag and drop", async({ page }) => {
         const account1: Partial<Account> = { name: "First", balance: 1000, type: "Checking" };
         const account2: Partial<Account> = { name: "Second", balance: 2000, type: "Savings" };

         const id1 = await createAccount(page, account1);
         const id2 = await createAccount(page, account2);

         await assertAccountCardsOrder(page, [id1, id2]);

         // Get the drag handle and target card
         const dragHandle1 = page.getByTestId(`account-card-drag-${id1}`);
         await dragHandle1.scrollIntoViewIfNeeded();
         await expect(dragHandle1).toBeVisible();

         const card2 = page.getByTestId(`account-card-${id2}`);
         await card2.scrollIntoViewIfNeeded();
         await expect(card2).toBeVisible();

         // Get bounding boxes for both elements
         const handleBox = await dragHandle1.boundingBox();
         const card2Box = await card2.boundingBox();

         if (!handleBox || !card2Box) {
            throw new Error("Failed to get bounding boxes for drag and drop");
         }

         // Calculate positions
         const handleCenterX = handleBox.x + handleBox.width / 2;
         const handleCenterY = handleBox.y + handleBox.height / 2;
         const card2CenterX = card2Box.x + card2Box.width / 2;
         const card2CenterY = card2Box.y + card2Box.height / 2;

         // Manually simulate drag with proper pointer events for dnd-kit
         // Move to handle, press down, move at least 8px to activate, then drag to target
         await page.mouse.move(handleCenterX, handleCenterY);
         await page.mouse.down();

         // Move at least 8px to activate dnd-kit's PointerSensor activationConstraint
         await page.mouse.move(handleCenterX + 10, handleCenterY);
         await page.waitForTimeout(50); // Small delay for activation

         // Drag to target card center
         await page.mouse.move(card2CenterX, card2CenterY);
         await page.waitForTimeout(100); // Allow dnd-kit to detect collision

         // Release mouse
         await page.mouse.up();

         // Wait for drag end handler and reorder to complete
         await page.waitForTimeout(500);

         // Assert visual order changed
         await assertAccountCardsOrder(page, [id2, id1]);

         // Reload and assert order persists
         await page.reload();
         await page.waitForTimeout(1000);
         await assertAccountCardsOrder(page, [id2, id1]);
      });
   });

   test.describe("Account Deletion", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
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

         // Wait for form to be visible
         await assertComponentVisibility(page, "account-name");

         // Wait for delete button to appear (it's rendered when isUpdating is true)
         // The button opens a confirmation dialog
         await assertComponentVisibility(page, "account-delete-button");

         // Click delete button to open confirmation dialog
         await page.getByTestId("account-delete-button").click();

         // Assert confirmation dialog appears
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

         // Wait for form to be visible
         await assertComponentVisibility(page, "account-name");

         // Wait for delete button to appear (it's rendered when isUpdating is true)
         await assertComponentVisibility(page, "account-delete-button");

         // Click delete button to open confirmation dialog
         await page.getByTestId("account-delete-button").click();

         // Wait for confirmation dialog to appear and click confirm button
         await assertComponentVisibility(page, "account-delete-button-confirm");
         await page.getByTestId("account-delete-button-confirm").click();

         // Assert account removed and net worth updated
         await expect(page.getByTestId(`account-card-${accountId}`)).not.toBeVisible();
         await assertAccountTrends(page, [], "$0.00", "accounts-page");
      });
   });
});