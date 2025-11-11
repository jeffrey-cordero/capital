import type { Page } from "@playwright/test";
import { expect, test } from "@tests/fixtures";
import { assertComponentVisibility } from "@tests/utils";
import { ACCOUNTS_ROUTE, DASHBOARD_ROUTE } from "@tests/utils/authentication";
import { assertAccountTrends, dragAndDrop } from "@tests/utils/dashboard";
import {
   assertAccountCard,
   assertAccountCardsOrder,
   assertAccountDeleted,
   assertAndUnblockInvalidImageURL,
   assertImageCarouselNavigation,
   assertImageCarouselVisibility,
   assertImageSelected,
   assertImageSelection,
   assertNetWorth,
   assertTransactionAccountDropdown,
   createAccount,
   deleteAccount,
   deleteAllAccounts,
   openAccountForm,
   openImageForm,
   selectImageCarouselPosition,
   updateAccount
} from "@tests/utils/dashboard/accounts";
import { navigateToPath } from "@tests/utils/navigation";
import { setupAssignedUser } from "@tests/utils/user-management";
import { type Account, IMAGES } from "capital/accounts";

test.describe("Account Management", () => {
   /**
    * Fixtures for reusable test data
    */
   const IMAGE_FIXTURES = {
      valid: "https://picsum.photos/200/300",
      validAlt: "https://picsum.photos/300/400",
      invalid: "https://invalid-domain-that-does-not-exist.com/image.png"
   } as const;

   const ACCOUNT_FIXTURES = {
      checking: { name: "Checking", balance: 10000, type: "Checking" },
      savings: { name: "Savings", balance: 5000, type: "Savings" },
      creditCard: { name: "Credit Card", balance: 3000, type: "Credit Card" },
      investment: { name: "Investment", balance: 8000, type: "Investment" },
      debt: { name: "Student Loan", balance: 20000, type: "Debt" },
      loan: { name: "Car Loan", balance: 15000, type: "Loan" }
   } as const;

   /**
    * Updates account fields and asserts changes on the UI
    *
    * @param {Page} page - Playwright page instance
    * @param {string} accountId - Account ID to update
    * @param {Partial<Account>} updates - Fields to update
    * @param {Partial<Account>} baseAccount - Base account to merge with updates
    * @param {number} expectedNetWorth - Expected net worth to assert after update
    */
   const updateAndAssertAccount = async(
      page: Page,
      accountId: string,
      updates: Partial<Account>,
      baseAccount: Partial<Account>,
      expectedNetWorth: number
   ): Promise<void> => {
      await updateAccount(page, accountId, updates, undefined, true);
      await assertNetWorth(page, [{ ...baseAccount, ...updates }], expectedNetWorth);
   };

   /**
    * Creates an account and asserts the net worth calculation
    *
    * @param {Page} page - Playwright page instance
    * @param {Partial<Account>} accountData - Account data to create
    * @param {number} expectedNetWorth - Expected net worth to assert after creation
    * @returns {Promise<string>} Created account ID
    */
   const createAndAssertNetWorth = async(page: Page, accountData: Partial<Account>, expectedNetWorth: number): Promise<string> => {
      const accountId: string = await createAccount(page, accountData);
      await assertNetWorth(page, [{ account_id: accountId, ...accountData }], expectedNetWorth);

      return accountId;
   };

   /**
    * Tests image URL validation by attempting invalid input and unblocking with different methods
    *
    * @param {Page} page - Playwright page instance
    */
   const testImageValidationMethods = async(page: Page): Promise<void> => {
      for (const method of ["clear", "valid-url", "default-image"] as const) {
         await assertImageCarouselVisibility(page, true).catch(async() => {
            await openImageForm(page);
         });

         await assertAndUnblockInvalidImageURL(page, method);
      }
   };

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
         const formInputs = [
            { testId: "account-name", label: "Name" },
            { testId: "account-balance", label: "Balance" },
            { testId: "account-type", label: "Type" },
            { testId: "account-image-button" }
         ];

         await openAccountForm(page);

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
         await testImageValidationMethods(page);
      });

      test("should create account with the default image from the carousel", async({ page }) => {
         const account: Partial<Account> = {
            name: "Default Image Account",
            balance: 3000,
            type: "Savings"
         };

         const accountId = await createAccount(page, { ...account, imageSelection: 0 });
         const accountData: Partial<Account> = { account_id: accountId, ...account, image: "checking" };

         await assertAccountCard(page, accountData);
         await assertNetWorth(page, [accountData], 3000);
      });

      test("should create account with a custom image URL", async({ page }) => {
         const account: Partial<Account> = {
            name: "Custom URL Account",
            balance: 2000,
            type: "Checking"
         };

         const accountId = await createAccount(page, { ...account, imageSelection: IMAGE_FIXTURES.valid });
         const accountData: Partial<Account> = { account_id: accountId, ...account, image: IMAGE_FIXTURES.valid };

         await assertAccountCard(page, accountData);
         await assertNetWorth(page, [accountData], 2000);
      });

      test("should create account with an invalid image URL and display error notification", async({ page }) => {
         const account: Partial<Account> = {
            name: "Invalid Image Account",
            balance: 1500,
            type: "Savings"
         };

         const accountId = await createAccount(page, { ...account, imageSelection: IMAGE_FIXTURES.invalid });
         const accountData: Partial<Account> = { account_id: accountId, ...account, image: IMAGE_FIXTURES.invalid };

         await assertAccountCard(page, accountData, undefined, true);
         await assertNetWorth(page, [accountData], 1500);
      });
   });

   test.describe("Image Selection", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
         await openImageForm(page);
      });

      test("should select and deselect images in the carousel", async({ page }) => {
         await assertImageSelection(page, false);
         await selectImageCarouselPosition(page, 0, true);
         await assertImageSelection(page, true);
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
            await page.keyboard.press("Escape");
            await openImageForm(page);
            await assertImageSelected(page, i, true);
         }
      });

      test("should accept valid URL input", async({ page }) => {
         await page.getByTestId("account-image-url").fill(IMAGE_FIXTURES.valid);
         await page.keyboard.press("Escape");
         await assertImageCarouselVisibility(page, true);
      });

      test("should validate image URL format and unblock with different methods", async({ page }) => {
         await testImageValidationMethods(page);
      });
   });

   test.describe("Net Worth Calculations", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
         // Delete all existing accounts to ensure a clean slate for each test
         await deleteAllAccounts(page);
      });

      test("should calculate net worth correctly for asset accounts (adds to total)", async({ page }) => {
         const account: Partial<Account> = { name: "Checking Account", balance: 10000, type: "Checking" };
         await createAndAssertNetWorth(page, account, 10000);
      });

      test("should calculate net worth correctly for liability accounts (subtracts from total)", async({ page }) => {
         const account: Partial<Account> = { name: "Credit Card", balance: 5000, type: "Credit Card" };
         await createAndAssertNetWorth(page, account, -5000);
      });

      test("should calculate net worth correctly with mixed asset and liability accounts", async({ page }) => {
         const checkingId = await createAccount(page, ACCOUNT_FIXTURES.checking);
         const creditCardId = await createAccount(page, ACCOUNT_FIXTURES.creditCard);

         const accounts: Partial<Account>[] = [
            { account_id: checkingId, ...ACCOUNT_FIXTURES.checking },
            { account_id: creditCardId, ...ACCOUNT_FIXTURES.creditCard }
         ];
         await assertNetWorth(page, accounts, 7000);
      });

      test("should calculate net worth correctly with multiple assets", async({ page }) => {
         const savingsId = await createAccount(page, ACCOUNT_FIXTURES.savings);
         const investmentId = await createAccount(page, ACCOUNT_FIXTURES.investment);

         const accounts: Partial<Account>[] = [
            { account_id: savingsId, ...ACCOUNT_FIXTURES.savings },
            { account_id: investmentId, ...ACCOUNT_FIXTURES.investment }
         ];
         await assertNetWorth(page, accounts, 13000);
      });

      test("should calculate net worth correctly with multiple liabilities", async({ page }) => {
         const debtId = await createAccount(page, ACCOUNT_FIXTURES.debt);
         const loanId = await createAccount(page, ACCOUNT_FIXTURES.loan);

         const accounts: Partial<Account>[] = [
            { account_id: debtId, ...ACCOUNT_FIXTURES.debt },
            { account_id: loanId, ...ACCOUNT_FIXTURES.loan }
         ];
         await assertNetWorth(page, accounts, -35000);
      });

      test("should calculate net worth correctly when asset and liability balance to zero", async({ page }) => {
         const assetAccount: Partial<Account> = { name: "Checking", balance: 5000, type: "Checking" };
         const liabilityAccount: Partial<Account> = { name: "Credit Card", balance: 5000, type: "Credit Card" };

         const assetId = await createAccount(page, assetAccount);
         const liabilityId = await createAccount(page, liabilityAccount);

         const accounts: Partial<Account>[] = [
            { account_id: assetId, ...assetAccount },
            { account_id: liabilityId, ...liabilityAccount }
         ];
         await assertNetWorth(page, accounts, 0);
      });

      test("should update asset and liability to balance to zero net worth", async({ page }) => {
         // Create asset and liability that balance
         const assetData: Partial<Account> = { name: "Asset", balance: 5000, type: "Checking" };
         const liabilityData: Partial<Account> = { name: "Liability", balance: 5000, type: "Credit Card" };

         const assetId = await createAccount(page, assetData);
         const liabilityId = await createAccount(page, liabilityData);

         // Assert initial net worth = 5000 - 5000 = 0
         await assertNetWorth(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData }
         ], 0);

         // Update asset to 500
         await updateAccount(page, assetId, { balance: 500 }, undefined, true);

         // Net worth should now be 500 - 5000 = -4500
         await assertNetWorth(page, [
            { account_id: assetId, ...assetData, balance: 500 },
            { account_id: liabilityId, ...liabilityData }
         ], -4500);
      });

      test("should update liability balance and recalculate net worth correctly", async({ page }) => {
         // Start with asset and liability that balance to zero
         const assetData: Partial<Account> = { name: "Checking", balance: 5000, type: "Checking" };
         const liabilityData: Partial<Account> = { name: "Credit Card", balance: 5000, type: "Credit Card" };

         const assetId = await createAccount(page, assetData);
         const liabilityId = await createAccount(page, liabilityData);

         // Initial net worth = 5000 - 5000 = 0
         await assertNetWorth(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData }
         ], 0);

         // Increase liability balance to 6000
         await updateAccount(page, liabilityId, { balance: 6000 }, undefined, true);

         // Net worth should now be 5000 - 6000 = -1000
         await assertNetWorth(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData, balance: 6000 }
         ], -1000);
      });

      test("should handle multiple sequential updates affecting net worth", async({ page }) => {
         // Create initial asset and liability at zero
         const assetData: Partial<Account> = { name: "Savings", balance: 5000, type: "Savings" };
         const liabilityData: Partial<Account> = { name: "Debt", balance: 5000, type: "Debt" };

         const assetId = await createAccount(page, assetData);
         const liabilityId = await createAccount(page, liabilityData);

         // Initial net worth = 5000 - 5000 = 0
         await assertNetWorth(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData }
         ], 0);

         // Step 1: Update asset to 7000
         // Net worth = 7000 - 5000 = 2000
         await updateAccount(page, assetId, { balance: 7000 }, undefined, true);

         await assertNetWorth(page, [
            { account_id: assetId, ...assetData, balance: 7000 },
            { account_id: liabilityId, ...liabilityData }
         ], 2000);

         // Step 2: Update liability to 10000
         // Net worth = 7000 - 10000 = -3000
         await updateAccount(page, liabilityId, { balance: 10000 }, undefined, true);

         await assertNetWorth(page, [
            { account_id: assetId, ...assetData, balance: 7000 },
            { account_id: liabilityId, ...liabilityData, balance: 10000 }
         ], -3000);

         // Step 3: Update asset to 15000
         // Net worth = 15000 - 10000 = 5000
         await updateAccount(page, assetId, { balance: 15000 }, undefined, true);

         await assertNetWorth(page, [
            { account_id: assetId, ...assetData, balance: 15000 },
            { account_id: liabilityId, ...liabilityData, balance: 10000 }
         ], 5000);
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

   test.describe("Account Updates", () => {
      let accountId: string;
      const baseAccount: Partial<Account> = { name: "Test Account", balance: 1000, type: "Checking" };

      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
         // Clean up the baseAccount after each test
         if (accountId && await page.getByTestId(`account-card-${accountId}`).isVisible()) {
            await deleteAccount(page, accountId);
         }
         accountId = await createAccount(page, baseAccount);
         baseAccount.account_id = accountId;
      });

      test("should update account name and assert on both pages", async({ page }) => {
         await updateAndAssertAccount(page, accountId, { name: "Updated Name" }, baseAccount, 1000);
      });

      test("should update account balance and assert recalculated net worth on both pages", async({ page }) => {
         await updateAndAssertAccount(page, accountId, { balance: 5000 }, baseAccount, 5000);
      });

      test("should update account type from asset to liability and assert recalculated net worth", async({ page }) => {
         await updateAndAssertAccount(page, accountId, { type: "Credit Card" }, baseAccount, -1000);
      });

      test("should update account with new image and assert persistence", async({ page }) => {
         await updateAccount(page, accountId, { imageSelection: IMAGE_FIXTURES.validAlt }, undefined, true);
         const updatedAccount: Partial<Account> = { ...baseAccount, image: IMAGE_FIXTURES.validAlt };
         await assertAccountCard(page, updatedAccount);
      });

      test("should update account from no image to invalid image URL and display error", async({ page }) => {
         await updateAccount(page, accountId, { imageSelection: IMAGE_FIXTURES.invalid }, undefined, true);
         const updatedAccount: Partial<Account> = { ...baseAccount, image: IMAGE_FIXTURES.invalid };
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
         await testImageValidationMethods(page);
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
         await assertNetWorth(page, [], 0);
      });

      test("should delete account from asset and recalculate net worth to zero", async({ page }) => {
         const checkingId = await createAccount(page, ACCOUNT_FIXTURES.checking);
         const savingsId = await createAccount(page, ACCOUNT_FIXTURES.savings);

         await assertNetWorth(page, [
            { account_id: checkingId, ...ACCOUNT_FIXTURES.checking },
            { account_id: savingsId, ...ACCOUNT_FIXTURES.savings }
         ], 15000);

         await deleteAccount(page, checkingId);
         await assertAccountDeleted(page, checkingId);

         await assertNetWorth(page, [{ account_id: savingsId, ...ACCOUNT_FIXTURES.savings }], 5000);
      });

      test("should delete liability account and recalculate net worth correctly", async({ page }) => {
         const checkingId = await createAccount(page, ACCOUNT_FIXTURES.checking);
         const creditCardId = await createAccount(page, ACCOUNT_FIXTURES.creditCard);

         await assertNetWorth(page, [
            { account_id: checkingId, ...ACCOUNT_FIXTURES.checking },
            { account_id: creditCardId, ...ACCOUNT_FIXTURES.creditCard }
         ], 7000);

         await deleteAccount(page, creditCardId);
         await assertAccountDeleted(page, creditCardId);

         await assertNetWorth(page, [{ account_id: checkingId, ...ACCOUNT_FIXTURES.checking }], 10000);
      });
   });
});