import type { Page } from "@playwright/test";
import { expect, test } from "@tests/fixtures";
import { assertComponentVisible } from "@tests/utils";
import { ACCOUNTS_ROUTE, DASHBOARD_ROUTE } from "@tests/utils/authentication";
import { assertAccountTrends, dragAndDrop } from "@tests/utils/dashboard";
import {
   type AccountFormData,
   assertAccountCard,
   assertAccountCardsOrder,
   assertAndUnblockInvalidImageURL,
   assertImageCarouselNavigation,
   assertImageCarouselVisibility,
   assertImageSelected,
   assertNetWorth,
   assertTransactionAccountDropdown,
   createAccount,
   deleteAccount,
   openAccountForm,
   openImageForm,
   type PerformAccountActionOptions,
   selectImageCarouselPosition,
   updateAccount
} from "@tests/utils/dashboard/accounts";
import { navigateToPath } from "@tests/utils/navigation";
import { setupAssignedUser } from "@tests/utils/user-management";
import { IMAGES } from "capital/accounts";
import { createValidAccount, IMAGE_FIXTURES } from "capital/mocks/accounts";

test.describe("Account Management", () => {
   /**
    * Performs an account operation (create or update) and asserts account card, trends, and net worth
    *
    * @param {PerformAccountActionOptions} options - Operation options
    * @returns {Promise<string>} The created or updated account ID (empty string if validation errors expected)
    */
   const performAndAssertAccountAction = async(options: PerformAccountActionOptions): Promise<string> => {
      const { page, accountData, expectedNetWorth, accountId, baseAccount, hasImageError = false, expectedErrors } = options;

      const isUpdate = !!accountId && baseAccount;

      let resultId: string = "";
      let finalAccount: AccountFormData;

      if (isUpdate) {
         await updateAccount(page, accountId, accountData, expectedErrors, !expectedErrors);
         finalAccount = { ...baseAccount, ...accountData };
         resultId = accountId;
      } else {
         resultId = await createAccount(page, accountData, expectedErrors);
         finalAccount = { account_id: resultId, ...accountData };
      }

      if (!expectedErrors) {
         await assertAccountCard(page, finalAccount, hasImageError);
         await assertNetWorth(page, [finalAccount], expectedNetWorth || 0);
      }

      return resultId;
   };

   /**
    * Tests image URL validation by attempting invalid input and unblocking with different methods
    *
    * @param {Page} page - Playwright page instance
    */
   const testImageValidationMethods = async(page: Page): Promise<void> => {
      for (const method of ["clear", "valid-url", "default-image"] as const) {
         await assertImageCarouselVisibility(page, true).catch(async() => {
            // In the case that the image carousel is hidden, open it to avoid arrangement complexity in subsequent test steps
            await openImageForm(page);
         });

         await assertAndUnblockInvalidImageURL(page, method);
      }
   };

   test.describe("Initial State", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, false);
      });

      test("should display empty accounts state on dashboard page", async({ page }) => {
         await navigateToPath(page, DASHBOARD_ROUTE);
         await assertAccountTrends(page, [], 0, "dashboard");
         await assertComponentVisible(page, "empty-accounts-trends-overview", "No available accounts");
      });

      test("should display empty accounts state on accounts page", async({ page }) => {
         await assertAccountTrends(page, [], 0, "accounts");
         await expect(page.getByTestId("accounts-add-button")).toBeEnabled();
         await assertComponentVisible(page, "accounts-add-button", "Add Account");
         await assertComponentVisible(page, "accounts-empty-message", "No available accounts");
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
            await assertComponentVisible(page, input.testId, undefined, input.label);
         }
      });
   });

   test.describe("Account Creation", () => {
      test.describe("Successful Account Creation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
         });

         test("should successfully create account with all required fields", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountData: { name: "Test Checking Account", balance: 5000, type: "Checking" },
               expectedNetWorth: 5000
            });
         });

         test("should create account with a default image from the carousel", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountData: {
                  name: "Default Image Account",
                  balance: 3000,
                  type: "Savings",
                  image: 1
               } as any,
               expectedNetWorth: 3000
            });
         });

         test("should create account with a custom image URL", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountData: { name: "Custom URL Account", balance: 2000, type: "Checking", image: IMAGE_FIXTURES.valid },
               expectedNetWorth: 2000
            });
         });

         test("should create account with an invalid image URL and display error notification", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountData: { name: "Invalid Image Account", balance: 1500, type: "Savings", image: IMAGE_FIXTURES.error },
               expectedNetWorth: 1500,
               hasImageError: true
            });
         });
      });

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, false);
         });

         test("should validate name minimum length", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountData: { name: "", balance: 1000, type: "Checking" },
               expectedErrors: { "account-name": "Name must be at least 1 character" }
            });
         });

         test("should validate name maximum length", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountData: { name: "a".repeat(31), balance: 1000 },
               expectedErrors: { "account-name": "Name must be at most 30 characters" }
            });
         });

         test("should validate empty balance field", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountData: { name: "Test Account" },
               expectedErrors: { "account-balance": "Balance is required" }
            });
         });

         test("should validate balance minimum value", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountData: { name: "Test Account", balance: -1_000_000_000_000 },
               expectedErrors: { "account-balance": "Balance is below the minimum allowed value" }
            });
         });

         test("should validate balance maximum value", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountData: { name: "Test Account", balance: 1_000_000_000_000 },
               expectedErrors: { "account-balance": "Balance exceeds the maximum allowed value" }
            });
         });
      });
   });

   test.describe("Image Selection", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, false);
         await openImageForm(page);
      });

      test("should navigate carousel with loopback behavior", async({ page }) => {
         await assertImageCarouselNavigation(page, "left");
         await assertImageCarouselNavigation(page, "right");
      });

      test("should select and deselect each of the predefined images and persist selection after closing the form", async({ page }) => {
         for (let i = 0; i < IMAGES.size; i++) {
            for (let j = 0; j < 2; j++) {
               const isSelected: boolean = j === 1;
               const nextExpectedSelection: boolean = isSelected ? false : true;

               // Select or deselect the current image
               await selectImageCarouselPosition(page, i, true);
               await assertImageSelected(page, i, nextExpectedSelection);

               // Close the image form and open it again to assert selection persistence
               await page.keyboard.press("Escape");
               await openImageForm(page);
               await assertImageSelected(page, i, nextExpectedSelection);
            }
         }
      });

      test("should accept valid URL input", async({ page }) => {
         await page.getByTestId("account-image-url").fill(IMAGE_FIXTURES.valid);
         await page.keyboard.press("Escape");
         await assertImageCarouselVisibility(page, false);
      });

      test("should validate invalid image URL formats and unblock using different methods", async({ page }) => {
         await testImageValidationMethods(page);
      });
   });

   test.describe("Net Worth Calculations", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should calculate net worth correctly for asset accounts (adds to total)", async({ page }) => {
         await performAndAssertAccountAction({
            page,
            accountData: { name: "Checking Account", balance: 10000, type: "Checking" },
            expectedNetWorth: 10000
         });
      });

      test("should calculate net worth correctly for liability accounts (subtracts from total)", async({ page }) => {
         await performAndAssertAccountAction({
            page,
            accountData: { name: "Credit Card", balance: 5000, type: "Credit Card" },
            expectedNetWorth: -5000
         });
      });

      test("should calculate net worth correctly with mixed asset and liability accounts", async({ page }) => {
         const checking = createValidAccount({ name: "Checking", balance: 10000, type: "Checking" });
         const creditCard = createValidAccount({ name: "Credit Card", balance: 3000, type: "Credit Card" });

         const checkingId = await createAccount(page, checking);
         const creditCardId = await createAccount(page, creditCard);

         const accounts: AccountFormData[] = [
            { account_id: checkingId, ...checking },
            { account_id: creditCardId, ...creditCard }
         ];
         await assertNetWorth(page, accounts, 7000);
      });

      test("should calculate net worth correctly with multiple assets", async({ page }) => {
         const savings = createValidAccount({ name: "Savings", balance: 5000, type: "Savings" });
         const investment = createValidAccount({ name: "Investment", balance: 8000, type: "Investment" });

         const savingsId = await createAccount(page, savings);
         const investmentId = await createAccount(page, investment);

         const accounts: AccountFormData[] = [
            { account_id: savingsId, ...savings },
            { account_id: investmentId, ...investment }
         ];
         await assertNetWorth(page, accounts, 13000);
      });

      test("should calculate net worth correctly with multiple liabilities", async({ page }) => {
         const debt = createValidAccount({ name: "Student Loan", balance: 20000, type: "Debt" });
         const loan = createValidAccount({ name: "Car Loan", balance: 15000, type: "Loan" });

         const debtId = await createAccount(page, debt);
         const loanId = await createAccount(page, loan);

         const accounts: AccountFormData[] = [
            { account_id: debtId, ...debt },
            { account_id: loanId, ...loan }
         ];
         await assertNetWorth(page, accounts, -35000);
      });

      test("should calculate net worth correctly when asset and liability balance to zero", async({ page }) => {
         const assetAccount: AccountFormData = { name: "Checking", balance: 5000, type: "Checking" };
         const liabilityAccount: AccountFormData = { name: "Credit Card", balance: 5000, type: "Credit Card" };

         const assetId = await createAccount(page, assetAccount);
         const liabilityId = await createAccount(page, liabilityAccount);

         const accounts: AccountFormData[] = [
            { account_id: assetId, ...assetAccount },
            { account_id: liabilityId, ...liabilityAccount }
         ];
         await assertNetWorth(page, accounts, 0);
      });

      test("should update account balance and recalculate net worth correctly with sequential updates", async({ page }) => {
         // Balance asset and liability accounts to zero
         const assetData: AccountFormData = { name: "Checking", balance: 5000, type: "Checking" };
         const liabilityData: AccountFormData = { name: "Credit Card", balance: 5000, type: "Credit Card" };

         const assetId = await createAccount(page, assetData);
         const liabilityId = await createAccount(page, liabilityData);

         await assertNetWorth(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData }
         ], 0);

         // Update liability account balance to $6,000 to unbalance the accounts
         await updateAccount(page, liabilityId, { balance: 6000 }, undefined, true);
         await assertNetWorth(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData, balance: 6000 }
         ], -1000);

         // Update asset account balance to $6,000 to balance the accounts to zero
         await updateAccount(page, assetId, { balance: 6000 }, undefined, true);
         await assertNetWorth(page, [
            { account_id: assetId, ...assetData, balance: 6000 },
            { account_id: liabilityId, ...liabilityData, balance: 6000 }
         ], 0);
      });
   });

   test.describe("Transaction Form Integration", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should show created accounts in transaction dropdown", async({ page }) => {
         const checking = createValidAccount({ name: "Checking", balance: 10000, type: "Checking" });
         const savings = createValidAccount({ name: "Savings", balance: 5000, type: "Savings" });

         const checkingId = await createAccount(page, checking);
         const savingsId = await createAccount(page, savings);

         const accounts: AccountFormData[] = [
            { account_id: checkingId, ...checking },
            { account_id: savingsId, ...savings }
         ];
         await assertTransactionAccountDropdown(page, accounts);
      });

      test("should auto-select account in transaction dropdown", async({ page }) => {
         const investment = createValidAccount({ name: "Investment", balance: 8000, type: "Investment" });
         const investmentId = await createAccount(page, investment);

         await assertTransactionAccountDropdown(page, [{ account_id: investmentId, ...investment }], investmentId);
      });
   });

   test.describe("Account Updates", () => {
      const baseAccount: AccountFormData = { name: "Test Account", balance: 1000, type: "Checking" };

      test.describe("Successful Account Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
            baseAccount.account_id = await createAccount(page, baseAccount);
         });

         test("should successfully update account name", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId: baseAccount.account_id!,
               baseAccount,
               accountData: { name: "Updated Name" },
               expectedNetWorth: 1000
            });
         });

         test("should successfully update account balance and assert recalculated net worth", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId: baseAccount.account_id!,
               baseAccount,
               accountData: { balance: 5000 },
               expectedNetWorth: 5000
            });
         });

         test("should successfully update account type from asset to liability or vice versa and assert recalculated net worth", async({ page }) => {
            // Asset to liability (negates net worth)
            await performAndAssertAccountAction({
               page,
               accountId: baseAccount.account_id!,
               baseAccount,
               accountData: { type: "Credit Card" },
               expectedNetWorth: -1000
            });

            // Liability to asset (resets net worth)
            await performAndAssertAccountAction({
               page,
               accountId: baseAccount.account_id!,
               baseAccount,
               accountData: { type: "Checking" },
               expectedNetWorth: 1000
            });
         });

         test("should successfully update account with new image and assert persistence", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId: baseAccount.account_id!,
               baseAccount,
               accountData: { image: IMAGE_FIXTURES.validAlt },
               expectedNetWorth: 1000
            });
         });

         test("should successfully update account from no image to invalid image URL and display error notification", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId: baseAccount.account_id!,
               baseAccount,
               accountData: { image: IMAGE_FIXTURES.error },
               expectedNetWorth: 1000,
               hasImageError: true
            });
         });
      });

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, false);
            baseAccount.account_id = await createAccount(page, baseAccount);
         });

         test("should validate empty name field", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId: baseAccount.account_id!,
               baseAccount,
               accountData: { name: "" },
               expectedErrors: { "account-name": "Name must be at least 1 character" }
            });
         });

         test("should validate name maximum length", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId: baseAccount.account_id!,
               baseAccount,
               accountData: { name: "a".repeat(31) },
               expectedErrors: { "account-name": "Name must be at most 30 characters" }
            });
         });

         test("should validate balance minimum value", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId: baseAccount.account_id!,
               baseAccount,
               accountData: { balance: -1_000_000_000_000 },
               expectedErrors: { "account-balance": "Balance is below the minimum allowed value" }
            });
         });

         test("should validate balance maximum value", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId: baseAccount.account_id!,
               baseAccount,
               accountData: { balance: 1_000_000_000_000 },
               expectedErrors: { "account-balance": "Balance exceeds the maximum allowed value" }
            });
         });

         test("should validate invalid image URL format", async({ page }) => {
            await openAccountForm(page, baseAccount.account_id!);
            await testImageValidationMethods(page);
         });
      });
   });

   test.describe("Drag and Drop", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should reorder accounts via drag and drop", async({ page }) => {
         // Initialize three side-by-side accounts for drag and drop
         const accountId1 = await createAccount(page, createValidAccount());
         const accountId2 = await createAccount(page, createValidAccount());
         const accountId3 = await createAccount(page, createValidAccount());

         await assertAccountCardsOrder(page, [accountId1, accountId2, accountId3]);

         // Drag and drop from the first account to the second account (index 0 to 1)
         const dragHandle1 = page.getByTestId(`account-card-drag-${accountId1}`);
         const card2 = page.getByTestId(`account-card-${accountId2}`);

         await dragAndDrop(page, dragHandle1, card2);
         await assertAccountCardsOrder(page, [accountId2, accountId1, accountId3]);

         // Drag and drop from the third account to the second account (index 2 to 0)
         const dragHandle3 = page.getByTestId(`account-card-drag-${accountId3}`);
         await dragAndDrop(page, dragHandle3, card2);

         await assertAccountCardsOrder(page, [accountId3, accountId2, accountId1]);

         // Reload the page to assert the final order is persisted
         await page.reload();
         await assertAccountCardsOrder(page, [accountId3, accountId2, accountId1]);
      });
   });

   test.describe("Account Deletion", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should successfully show confirmation dialog on delete attempt", async({ page }) => {
         const accountId = await createAccount(page, createValidAccount());
         await openAccountForm(page, accountId);

         // Wait for delete button to appear to open the confirmation dialog
         await assertComponentVisible(page, "account-delete-button");
         await page.getByTestId("account-delete-button").click();

         // Assert confirmation dialog appears and contains the correct message
         await assertComponentVisible(page, "account-delete-button-confirm");
         await expect(page.getByText("Are you sure you want to delete your account?")).toBeVisible();

         // Close the confirmation dialog without confirming
         await page.getByTestId("account-delete-button-cancel").click();
         await assertComponentVisible(page, "account-delete-button-confirm");
      });

      test("should successfully delete account and update net worth", async({ page }) => {
         const accountId = await createAccount(page, createValidAccount({ balance: 5000, type: "Checking" }));

         await deleteAccount(page, accountId);
         await assertNetWorth(page, [], 0);
      });

      test("should successfully delete asset account and assert net worth recalculated correctly", async({ page }) => {
         const checking = createValidAccount({ name: "Checking", balance: 10000, type: "Checking" });
         const savings = createValidAccount({ name: "Savings", balance: 5000, type: "Savings" });

         const checkingId = await createAccount(page, checking);
         const savingsId = await createAccount(page, savings);

         await assertNetWorth(page, [
            { account_id: checkingId, ...checking },
            { account_id: savingsId, ...savings }
         ], 15000);

         await deleteAccount(page, checkingId);
         await assertNetWorth(page, [{ account_id: savingsId, ...savings }], 5000);
      });

      test("should successfully delete liability account and assert net worth recalculated correctly", async({ page }) => {
         const checking = createValidAccount({ name: "Checking", balance: 10000, type: "Checking" });
         const creditCard = createValidAccount({ name: "Credit Card", balance: 3000, type: "Credit Card" });

         const checkingId = await createAccount(page, checking);
         const creditCardId = await createAccount(page, creditCard);

         await assertNetWorth(page, [
            { account_id: checkingId, ...checking },
            { account_id: creditCardId, ...creditCard }
         ], 7000);

         await deleteAccount(page, creditCardId);
         await assertNetWorth(page, [{ account_id: checkingId, ...checking }], 10000);
      });
   });
});