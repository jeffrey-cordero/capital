import { expect, test } from "@tests/fixtures";
import { assertComponentVisibility, closeModal } from "@tests/utils";
import { ACCOUNTS_ROUTE, DASHBOARD_ROUTE } from "@tests/utils/authentication";
import { assertAccountTrends, dragAndDrop } from "@tests/utils/dashboard";
import {
   assertAccountCard,
   assertAccountCardsOrder,
   assertAndUnblockInvalidImageURL,
   assertImageCarouselNavigation,
   assertImageSelected,
   assertImageSelection,
   assertTransactionAccountDropdown,
   createAccount,
   openAccountForm,
   openImageForm,
   selectImageCarouselPosition,
   updateAccount
} from "@tests/utils/dashboard/accounts";
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

      test("should validate empty name field", async({ page }) => {
         await createAccount(
            page,
            { balance: 1000, type: "Checking" },
            { "account-name": "Name is required" }
         );
      });

      test("should validate name minimum length", async({ page }) => {
         await createAccount(
            page,
            { name: "", balance: 1000 },
            { "account-name": "Name is required" }
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

   test.describe("Account Type & Net Worth", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should create asset account and assert blue bar", async({ page }) => {
         const account: Partial<Account> = {
            name: "Checking Account",
            balance: 10000,
            type: "Checking"
         };

         const accountId = await createAccount(page, account);
         await assertAccountTrends(page, [{ account_id: accountId, ...account }], 10000, "accounts-page");
      });

      test("should create liability account and assert red bar", async({ page }) => {
         const account: Partial<Account> = {
            name: "Credit Card",
            balance: 5000,
            type: "Credit Card"
         };

         const accountId = await createAccount(page, account);
         await assertAccountTrends(page, [{ account_id: accountId, ...account }], -5000, "accounts-page");
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
         const accounts: Partial<Account>[] = [
            { account_id: checkingId, ...checkingAccount },
            { account_id: creditCardId, ...creditCardAccount }
         ];
         await assertAccountTrends(page, accounts, 7000, "accounts-page");
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

   test.describe("Account Update", () => {
      let accountId: string;
      const baseAccount: Partial<Account> = { name: "Test Account", balance: 1000, type: "Checking" };

      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
         accountId = await createAccount(page, baseAccount);
         baseAccount.account_id = accountId;
      });

      test("should update account name", async({ page }) => {
         // Update name
         await updateAccount(page, accountId, { name: "Updated Name" });

         // Modal stays open - manually close to assert card
         await closeModal(page);
         await assertComponentVisibility(page, `account-card-${accountId}`);

         // Assert update
         await assertAccountCard(page, { ...baseAccount, name: "Updated Name" });
      });

      test("should update account balance and recalculate net worth", async({ page }) => {
         // Update balance
         await updateAccount(page, accountId, { balance: 5000 });
         await closeModal(page);
         await assertComponentVisibility(page, `account-card-${accountId}`);

         // Assert net worth updated
         const updatedAccount: Partial<Account> = { ...baseAccount, balance: 5000 };
         await assertAccountTrends(page, [updatedAccount], 5000, "accounts-page");
      });

      test("should update account type and recalculate net worth", async({ page }) => {
         // Update to liability type
         await updateAccount(page, accountId, { type: "Credit Card" });
         await closeModal(page);
         await assertComponentVisibility(page, `account-card-${accountId}`);

         // Assert net worth recalculated (should be negative now)
         const updatedAccount: Partial<Account> = { ...baseAccount, type: "Credit Card" };
         await assertAccountTrends(page, [updatedAccount], -1000, "accounts-page");
      });

      test("should keep modal open after update", async({ page }) => {
         // Update account
         await updateAccount(page, accountId, { name: "Updated" });

         // Assert form is still open
         await assertComponentVisibility(page, "account-name");
      });

      test("should validate empty name field on update", async({ page }) => {
         await updateAccount(page, accountId, { name: "" }, { "account-name": "Name is required" });
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

   test.describe("Account Deletion", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should show confirmation dialog on delete", async({ page }) => {
         const account: Partial<Account> = {
            name: "Delete Test",
            balance: 1000,
            type: "Checking"
         };

         const accountId = await createAccount(page, account);

         // Open account modal
         await openAccountForm(page, accountId);

         // Wait for delete button to appear (it's rendered when isUpdating is true)
         // The button opens a confirmation dialog
         await assertComponentVisibility(page, "account-delete-button");

         // Click delete button to open confirmation dialog
         await page.getByTestId("account-delete-button").click();

         // Assert confirmation dialog appears
         await expect(page.getByText("Are you sure you want to delete your account?")).toBeVisible();
      });

      test("should delete account and update net worth", async({ page }) => {
         const account: Partial<Account> = {
            name: "To Delete",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, account);

         // Delete account
         await openAccountForm(page, accountId);

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
         await assertAccountTrends(page, [], 0, "accounts-page");
      });
   });
});