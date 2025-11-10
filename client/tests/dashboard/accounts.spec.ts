import { expect, test } from "@tests/fixtures";
import { assertComponentVisibility, closeModal } from "@tests/utils";
import { ACCOUNTS_ROUTE, DASHBOARD_ROUTE } from "@tests/utils/authentication";
import { assertAccountTrends, dragAndDrop } from "@tests/utils/dashboard";
import {
   assertAccountCard,
   assertAccountCardsOrder,
   assertAccountDeleted,
   assertAndUnblockInvalidImageURL,
   assertImageCarouselNavigation,
   assertImageSelected,
   assertImageSelection,
   assertNetWorthAfterAction,
   assertTransactionAccountDropdown,
   createAccount,
   deleteAccount,
   deleteAllAccounts,
   openAccountForm,
   openImageForm,
   selectImageCarouselPosition,
   updateAccount
} from "@tests/utils/dashboard/accounts";
import { assertValidationErrors } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { setupAssignedUser } from "@tests/utils/user-management";
import { type Account, IMAGES } from "capital/accounts";

test.describe("Account Management", () => {
   test.describe("Initial State", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should display empty accounts state on dashboard page", async({ page }) => {
         await navigateToPath(page, DASHBOARD_ROUTE);
         await assertAccountTrends(page, [], 0, "dashboard");
         await assertComponentVisibility(page, "empty-accounts-trends-overview", "No available accounts");
      });

      test("should display empty accounts state on accounts page", async({ page }) => {
         await assertAccountTrends(page, [], 0, "accounts-page");
         await assertComponentVisibility(page, "accounts-empty-message", "No available accounts");
         await assertComponentVisibility(page, "accounts-add-button", "Add Account");
         await expect(page.getByTestId("accounts-add-button")).toBeEnabled();
         await assertTransactionAccountDropdown(page, []);
      });

      test("should have accessible form inputs", async({ page }) => {
         await openAccountForm(page);

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
   });

   test.describe("Account Creation", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should successfully create account with all required fields", async({ page }) => {
         const account: Partial<Account> = {
            name: "Test Checking Account",
            balance: 5000,
            type: "Checking"
         };

         const accountId: string = await createAccount(page, account);
         const newAccount: Partial<Account> = { account_id: accountId, ...account };

         // Assert the account card is visible and the net worth is updated accordingly
         await assertAccountCard(page, newAccount);
         await assertAccountTrends(page, [newAccount], 5000, "accounts-page");
      });

      test("should validate name minimum length", async({ page }) => {
         await createAccount(
            page,
            { name: "", balance: 1000, type: "Checking" },
            { "account-name": "Name must be at least 1 character" }
         );
      });

      test("should validate name maximum length", async({ page }) => {
         await createAccount(
            page,
            { name: "a".repeat(31), balance: 1000 },
            { "account-name": "Name must be at most 30 characters" }
         );
      });

      test("should validate empty balance field", async({ page }) => {
         await createAccount(
            page,
            { name: "Test Account" },
            { "account-balance": "Balance is required" }
         );
      });

      test("should validate balance minimum value", async({ page }) => {
         await createAccount(
            page,
            { name: "Test Account", balance: -1_000_000_000_000 },
            { "account-balance": "Balance is below the minimum allowed value" }
         );
      });

      test("should validate balance maximum value", async({ page }) => {
         await createAccount(
            page,
            { name: "Test Account", balance: 1_000_000_000_000 },
            { "account-balance": "Balance exceeds the maximum allowed value" }
         );
      });

      test("should validate invalid image URL format", async({ page }) => {
         for (const method of ["clear", "valid-url", "default-image"] as const) {
            await assertAndUnblockInvalidImageURL(page, method);
         }
      });

      test("should create account with default carousel image", async({ page }) => {
         const account: Partial<Account> = {
            name: "Default Image Account",
            balance: 3000,
            type: "Savings"
         };

         const accountId = await createAccount(page, { ...account, imageSelection: 0 });
         const accountData: Partial<Account> = { account_id: accountId, ...account, image: "checking" };

         // Asset account: net worth = 3000
         await assertAccountCard(page, accountData);
         await assertNetWorthAfterAction(page, [accountData], 3000);
      });

      test("should create account with custom image URL", async({ page }) => {
         const customUrl = "https://picsum.photos/200/300";
         const account: Partial<Account> = {
            name: "Custom URL Account",
            balance: 2000,
            type: "Checking"
         };

         const accountId = await createAccount(page, { ...account, imageSelection: customUrl });
         const accountData: Partial<Account> = { account_id: accountId, ...account, image: customUrl };

         // Asset account: net worth = 2000
         await assertAccountCard(page, accountData);
         await assertNetWorthAfterAction(page, [accountData], 2000);
      });

      test("should create account with invalid image URL and display error notification", async({ page }) => {
         const invalidImageUrl = "https://invalid-domain-that-does-not-exist.com/image.png";
         const account: Partial<Account> = {
            name: "Invalid Image Account",
            balance: 1500,
            type: "Savings"
         };

         const accountId = await createAccount(page, { ...account, imageSelection: invalidImageUrl });
         const accountData: Partial<Account> = { account_id: accountId, ...account, image: invalidImageUrl };

         // Account should be created despite image load failure
         await assertAccountCard(page, accountData, undefined, true);

         // Asset account: net worth = 1500
         await assertNetWorthAfterAction(page, [accountData], 1500);
      });
   });

   test.describe("Image URL Validation", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should display MUI error styling for invalid image URL", async({ page }) => {
         await openAccountForm(page);
         await openImageForm(page);

         // Enter invalid URL
         await page.getByTestId("account-image-url").fill("invalid-url");

         // Try to close form, which should fail validation
         await page.keyboard.press("Escape");

         // Assert error is displayed with MUI styling
         await assertValidationErrors(page, { "account-image-url": "URL must be valid" });
      });

      test("should clear error styling after correcting image URL", async({ page }) => {
         await assertAndUnblockInvalidImageURL(page, "valid-url");
      });

      test("should clear error styling after selecting default image", async({ page }) => {
         await assertAndUnblockInvalidImageURL(page, "default-image");
      });
   });

   test.describe("Image Selection", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
         await openImageForm(page);
      });

      test("should select and deselect images in the carousel", async({ page }) => {
         // No border on initial open
         await assertImageSelection(page, false);

         // Border appears on click
         await selectImageCarouselPosition(page, 0, true);
         await assertImageSelection(page, true);

         // Border disappears on re-click
         await selectImageCarouselPosition(page, 0, true);
         await assertImageSelection(page, false);
      });

      test("should navigate carousel with loopback behavior", async({ page }) => {
         await assertImageCarouselNavigation(page, "left");
         await assertImageCarouselNavigation(page, "right");
      });

      test("should select each of the predefined images and persist selection after closing the form", async({ page }) => {
         for (let i = 0; i < IMAGES.size; i++) {
            await selectImageCarouselPosition(page, i, true);
            await assertImageSelected(page, i, true);

            // Selection should persist after closing the form
            await page.keyboard.press("Escape");
            await openImageForm(page);
            await assertImageSelected(page, i, true);
         }
      });

      test("should accept valid URL input", async({ page }) => {
         await page.getByTestId("account-image-url").fill("https://example.com/image.png");
         await page.keyboard.press("Escape");
         await expect(page.getByTestId("account-image-carousel-left")).not.toBeVisible();
      });
   });

   test.describe("Net Worth Calculations", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
         // Delete all existing accounts to ensure a clean slate for each test
         await deleteAllAccounts(page);
      });

      test("should calculate net worth correctly for asset accounts (adds to total)", async({ page }) => {
         const account: Partial<Account> = {
            name: "Checking Account",
            balance: 10000,
            type: "Checking"
         };

         const accountId = await createAccount(page, account);
         const accountData: Partial<Account> = { account_id: accountId, ...account };

         // Asset accounts add to net worth
         // Net worth = 10000
         await assertNetWorthAfterAction(page, [accountData], 10000);
      });

      test("should calculate net worth correctly for liability accounts (subtracts from total)", async({ page }) => {
         const account: Partial<Account> = {
            name: "Credit Card",
            balance: 5000,
            type: "Credit Card"
         };

         const accountId = await createAccount(page, account);
         const accountData: Partial<Account> = { account_id: accountId, ...account };

         // Liability accounts subtract from net worth
         // Net worth = -5000
         await assertNetWorthAfterAction(page, [accountData], -5000);
      });

      test("should calculate net worth correctly with mixed asset and liability accounts", async({ page }) => {
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
         const accounts: Partial<Account>[] = [
            { account_id: checkingId, ...checkingAccount },
            { account_id: creditCardId, ...creditCardAccount }
         ];
         await assertNetWorthAfterAction(page, accounts, 7000);
      });

      test("should calculate net worth correctly with multiple assets", async({ page }) => {
         const savingsAccount: Partial<Account> = {
            name: "Savings",
            balance: 5000,
            type: "Savings"
         };
         const investmentAccount: Partial<Account> = {
            name: "Investment",
            balance: 8000,
            type: "Investment"
         };

         const savingsId = await createAccount(page, savingsAccount);
         const investmentId = await createAccount(page, investmentAccount);

         // Net worth = 5000 + 8000 = 13000
         const accounts: Partial<Account>[] = [
            { account_id: savingsId, ...savingsAccount },
            { account_id: investmentId, ...investmentAccount }
         ];
         await assertNetWorthAfterAction(page, accounts, 13000);
      });

      test("should calculate net worth correctly with multiple liabilities", async({ page }) => {
         const debtAccount: Partial<Account> = {
            name: "Student Loan",
            balance: 20000,
            type: "Debt"
         };
         const loanAccount: Partial<Account> = {
            name: "Car Loan",
            balance: 15000,
            type: "Loan"
         };

         const debtId = await createAccount(page, debtAccount);
         const loanId = await createAccount(page, loanAccount);

         // Net worth = -20000 - 15000 = -35000
         const accounts: Partial<Account>[] = [
            { account_id: debtId, ...debtAccount },
            { account_id: loanId, ...loanAccount }
         ];
         await assertNetWorthAfterAction(page, accounts, -35000);
      });

      test("should calculate net worth correctly when asset and liability balance to zero", async({ page }) => {
         const assetAccount: Partial<Account> = {
            name: "Checking",
            balance: 5000,
            type: "Checking"
         };
         const liabilityAccount: Partial<Account> = {
            name: "Credit Card",
            balance: 5000,
            type: "Credit Card"
         };

         const assetId = await createAccount(page, assetAccount);
         const liabilityId = await createAccount(page, liabilityAccount);

         // Net worth = 5000 - 5000 = 0
         const accounts: Partial<Account>[] = [
            { account_id: assetId, ...assetAccount },
            { account_id: liabilityId, ...liabilityAccount }
         ];
         await assertNetWorthAfterAction(page, accounts, 0);
      });
   });

   test.describe("Account Card Display", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should display account card with correct information", async({ page }) => {
         const account: Partial<Account> = {
            name: "Display Test Account",
            balance: 7500,
            type: "Savings"
         };

         const accountId = await createAccount(page, account);
         await assertAccountCard(page, { account_id: accountId, ...account });
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
         const account: Partial<Account> = {
            name: "Transaction Test Account",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, account);

         // Navigate to transactions or open transaction form
         // Assert dropdown contains the account
         const accounts: Partial<Account>[] = [{ account_id: accountId, ...account }];
         await assertTransactionAccountDropdown(page, accounts);
      });

      test("should auto-select account in transaction dropdown", async({ page }) => {
         const account: Partial<Account> = {
            name: "Transaction Test Account",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, account);
         await assertTransactionAccountDropdown(page, [{ account_id: accountId, ...account }], accountId);
      });
   });

   test.describe("Account Updates with Net Worth Verification", () => {
      let accountId: string = "";
      const baseAccount: Partial<Account> = { name: "Test Account", balance: 1000, type: "Checking" };

      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);

         if (accountId && await page.getByTestId(`account-card-${accountId}`).isVisible()) {
            await deleteAccount(page, accountId);
         }

         accountId = await createAccount(page, baseAccount);
         baseAccount.account_id = accountId;
      });

      test("should update account name and verify on both pages", async({ page }) => {
         const updatedName = "Updated Name";
         await updateAccount(page, accountId, { name: updatedName });

         // Modal stays open - manually close to assert card
         await closeModal(page);

         // Assert update on accounts page
         const updatedAccount: Partial<Account> = { ...baseAccount, name: updatedName };
         await assertAccountCard(page, updatedAccount);
         // Base account: Checking ($1000) -> net worth = 1000
         await assertNetWorthAfterAction(page, [updatedAccount], 1000);
      });

      test("should update account balance and recalculate net worth on both pages", async({ page }) => {
         const newBalance = 5000;
         await updateAccount(page, accountId, { balance: newBalance });
         await closeModal(page);

         // Assert net worth updated on both pages
         const updatedAccount: Partial<Account> = { ...baseAccount, balance: newBalance };
         // Checking ($5000) -> net worth = 5000
         await assertNetWorthAfterAction(page, [updatedAccount], 5000);
      });

      test("should update account type from asset to liability and recalculate net worth", async({ page }) => {
         await updateAccount(page, accountId, { type: "Credit Card" });
         await closeModal(page);

         // Assert net worth recalculated (should be negative now)
         const updatedAccount: Partial<Account> = { ...baseAccount, type: "Credit Card" };
         // Credit Card ($1000) liability -> net worth = -1000
         await assertNetWorthAfterAction(page, [updatedAccount], -1000);
      });

      test("should update account with new image and verify persistence", async({ page }) => {
         const customUrl = "https://picsum.photos/300/400";
         await updateAccount(page, accountId, { imageSelection: customUrl });
         await closeModal(page);

         // Verify image persisted on accounts page
         const updatedAccount: Partial<Account> = { ...baseAccount, image: customUrl };
         await assertAccountCard(page, updatedAccount);
      });

      test("should update account from no image to invalid image URL and display error", async({ page }) => {
         const invalidImageUrl = "https://invalid-domain-that-does-not-exist.com/broken-image.png";

         // Update with invalid image URL
         await updateAccount(page, accountId, { imageSelection: invalidImageUrl });
         await closeModal(page);

         // Account card should show error state on accounts page
         const updatedAccount: Partial<Account> = { ...baseAccount, image: invalidImageUrl };
         await assertAccountCard(page, updatedAccount, undefined, true);
      });

      test("should keep modal open after update", async({ page }) => {
         await updateAccount(page, accountId, { name: "Updated" });

         // Assert form is still open
         await assertComponentVisibility(page, "account-name");
      });

      test("should validate empty name field on update", async({ page }) => {
         await updateAccount(page, accountId, { name: "" }, { "account-name": "Name must be at least 1 character" });
      });

      test("should validate name maximum length on update", async({ page }) => {
         await updateAccount(page, accountId, { name: "a".repeat(31) }, { "account-name": "Name must be at most 30 characters" });
      });

      test("should validate balance minimum value on update", async({ page }) => {
         await updateAccount(page, accountId, { balance: -1_000_000_000_000 }, { "account-balance": "Balance is below the minimum allowed value" });
      });

      test("should validate balance maximum value on update", async({ page }) => {
         await updateAccount(page, accountId, { balance: 1_000_000_000_000 }, { "account-balance": "Balance exceeds the maximum allowed value" });
      });

      test("should validate invalid image URL format on update", async({ page }) => {
         await openAccountForm(page, accountId);

         for (const method of ["clear", "valid-url", "default-image"] as const) {
            await assertAndUnblockInvalidImageURL(page, method);
         }
      });

      test("should update asset and liability to balance to zero net worth", async({ page }) => {
         // Create asset and liability that balance
         const assetData: Partial<Account> = { name: "Asset", balance: 5000, type: "Checking" };
         const liabilityData: Partial<Account> = { name: "Liability", balance: 5000, type: "Credit Card" };

         const assetId = await createAccount(page, assetData);
         const liabilityId = await createAccount(page, liabilityData);

         // Verify initial net worth = 1000 + 5000 - 5000 = 1000
         await assertNetWorthAfterAction(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData }
         ], 1000);

         // Update asset to 500
         await updateAccount(page, assetId, { balance: 500 });
         await closeModal(page);

         // Net worth should now be 1000 + 500 - 5000 = -3500
         await assertNetWorthAfterAction(page, [
            { account_id: assetId, ...assetData, balance: 500 },
            { account_id: liabilityId, ...liabilityData }
         ], -3500);
      });

      test("should update liability balance and recalculate net worth correctly", async({ page }) => {
         // Start with asset and liability that balance to zero
         const assetData: Partial<Account> = { name: "Checking", balance: 5000, type: "Checking" };
         const liabilityData: Partial<Account> = { name: "Credit Card", balance: 5000, type: "Credit Card" };

         const assetId = await createAccount(page, assetData);
         const liabilityId = await createAccount(page, liabilityData);

         // Initial net worth = 1000 + 5000 - 5000 = 1000
         await assertNetWorthAfterAction(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData }
         ], 1000);

         // Increase liability balance to 6000
         await updateAccount(page, liabilityId, { balance: 6000 });
         await closeModal(page);

         // Net worth should now be 1000 + 5000 - 6000 = 0
         await assertNetWorthAfterAction(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData, balance: 6000 }
         ], 0);
      });

      test("should handle multiple sequential updates affecting net worth", async({ page }) => {
         // Create initial asset and liability at zero
         const assetData: Partial<Account> = { name: "Savings", balance: 5000, type: "Savings" };
         const liabilityData: Partial<Account> = { name: "Debt", balance: 5000, type: "Debt" };

         const assetId = await createAccount(page, assetData);
         const liabilityId = await createAccount(page, liabilityData);

         // Initial net worth = 1000 + 5000 - 5000 = 1000
         await assertNetWorthAfterAction(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData }
         ], 1000);

         // Step 1: Update asset to 7000
         // Net worth = 1000 + 7000 - 5000 = 3000
         await updateAccount(page, assetId, { balance: 7000 });
         await closeModal(page);

         await assertNetWorthAfterAction(page, [
            { account_id: assetId, ...assetData, balance: 7000 },
            { account_id: liabilityId, ...liabilityData }
         ], 3000);

         // Step 2: Update liability to 10000
         // Net worth = 1000 + 7000 - 10000 = -2000
         await updateAccount(page, liabilityId, { balance: 10000 });
         await closeModal(page);

         await assertNetWorthAfterAction(page, [
            { account_id: assetId, ...assetData, balance: 7000 },
            { account_id: liabilityId, ...liabilityData, balance: 10000 }
         ], -2000);

         // Step 3: Update asset to 15000
         // Net worth = 1000 + 15000 - 10000 = 6000
         await updateAccount(page, assetId, { balance: 15000 });
         await closeModal(page);

         await assertNetWorthAfterAction(page, [
            { account_id: assetId, ...assetData, balance: 15000 },
            { account_id: liabilityId, ...liabilityData, balance: 10000 }
         ], 6000);
      });
   });

   test.describe("Drag and Drop", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should reorder accounts via drag and drop", async({ page }) => {
         const account1: Partial<Account> = { name: "First", balance: 1000, type: "Checking" };
         const account2: Partial<Account> = { name: "Second", balance: 2000, type: "Savings" };

         const accountId1 = await createAccount(page, account1);
         const accountId2 = await createAccount(page, account2);

         await assertAccountCardsOrder(page, [accountId1, accountId2]);

         const dragHandle1 = page.getByTestId(`account-card-drag-${accountId1}`);
         const card2 = page.getByTestId(`account-card-${accountId2}`);

         await expect(dragHandle1).toBeVisible();
         await expect(card2).toBeVisible();

         await dragAndDrop(page, dragHandle1, card2);

         await assertAccountCardsOrder(page, [accountId2, accountId1]);

         await page.reload();
         await page.waitForTimeout(1000);
         await assertAccountCardsOrder(page, [accountId2, accountId1]);
      });
   });

   test.describe("Account Deletion (Modular)", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should show confirmation dialog on delete attempt", async({ page }) => {
         const account: Partial<Account> = {
            name: "Delete Test",
            balance: 1000,
            type: "Checking"
         };

         const accountId = await createAccount(page, account);

         // Open account form
         await openAccountForm(page, accountId);

         // Wait for delete button to appear
         await assertComponentVisibility(page, "account-delete-button");

         // Click delete button to open confirmation dialog
         await page.getByTestId("account-delete-button").click();

         // Assert confirmation dialog appears
         await assertComponentVisibility(page, "account-delete-button-confirm");
         await expect(page.getByText("Are you sure you want to delete your account?")).toBeVisible();

         // Close the modal without confirming
         await page.keyboard.press("Escape");
      });

      test("should delete account and update net worth on both pages", async({ page }) => {
         const account: Partial<Account> = {
            name: "To Delete",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, account);

         // Delete account using modular helper
         await deleteAccount(page, accountId);

         // Assert account removed from UI
         await assertAccountDeleted(page, accountId);

         // Assert net worth updated on both pages (no accounts = 0 net worth)
         await assertNetWorthAfterAction(page, [], 0);
      });

      test("should delete account from asset and recalculate net worth to zero", async({ page }) => {
         const checkingAccount: Partial<Account> = {
            name: "Checking",
            balance: 10000,
            type: "Checking"
         };

         const savingsAccount: Partial<Account> = {
            name: "Savings",
            balance: 5000,
            type: "Savings"
         };

         const checkingId = await createAccount(page, checkingAccount);
         const savingsId = await createAccount(page, savingsAccount);

         // Initial net worth = 10000 + 5000 = 15000
         await assertNetWorthAfterAction(page, [
            { account_id: checkingId, ...checkingAccount },
            { account_id: savingsId, ...savingsAccount }
         ], 15000);

         // Delete checking account
         await deleteAccount(page, checkingId);
         await assertAccountDeleted(page, checkingId);

         // Net worth should now be 5000 (only savings)
         await assertNetWorthAfterAction(page, [{ account_id: savingsId, ...savingsAccount }], 5000);
      });

      test("should delete liability account and recalculate net worth correctly", async({ page }) => {
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

         // Initial net worth = 10000 - 3000 = 7000
         await assertNetWorthAfterAction(page, [
            { account_id: checkingId, ...checkingAccount },
            { account_id: creditCardId, ...creditCardAccount }
         ], 7000);

         // Delete credit card (liability)
         await deleteAccount(page, creditCardId);
         await assertAccountDeleted(page, creditCardId);

         // Net worth should now be 10000 (only checking)
         await assertNetWorthAfterAction(page, [{ account_id: checkingId, ...checkingAccount }], 10000);
      });
   });
});