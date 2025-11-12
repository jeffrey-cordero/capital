import type { Page } from "@playwright/test";
import { expect, test } from "@tests/fixtures";
import { assertComponentVisibility } from "@tests/utils";
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
            // In the case of the image carousel being hidden, open it to avoid arrangement complexity in subsequent tests
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
         await assertComponentVisibility(page, "empty-accounts-trends-overview", "No available accounts");
      });

      test("should display empty accounts state on accounts page", async({ page }) => {
         await assertAccountTrends(page, [], 0, "accounts");
         await expect(page.getByTestId("accounts-add-button")).toBeEnabled();
         await assertComponentVisibility(page, "accounts-add-button", "Add Account");
         await assertComponentVisibility(page, "accounts-empty-message", "No available accounts");
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
      test.describe("Successful Account Creation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
         });

         test("should successfully create account with all required fields", async({ page }) => {
            const account: AccountFormData = {
               name: "Test Checking Account",
               balance: 5000,
               type: "Checking"
            };

            await performAndAssertAccountAction({ page, accountData: account, expectedNetWorth: 5000 });
         });

         test("should create account with a default image from the carousel", async({ page }) => {
            const account: AccountFormData = {
               name: "Default Image Account",
               balance: 3000,
               type: "Savings",
               image: 1
            } as any;

            await performAndAssertAccountAction({ page, accountData: account, expectedNetWorth: 3000 });
         });

         test("should create account with a custom image URL", async({ page }) => {
            const account: AccountFormData = {
               name: "Custom URL Account",
               balance: 2000,
               type: "Checking",
               image: IMAGE_FIXTURES.valid
            };

            await performAndAssertAccountAction({ page, accountData: account, expectedNetWorth: 2000 });
         });

         test("should create account with an invalid image URL and display error notification", async({ page }) => {
            const account: AccountFormData = {
               name: "Invalid Image Account",
               balance: 1500,
               type: "Savings",
               image: IMAGE_FIXTURES.invalid
            };

            await performAndAssertAccountAction({ page, accountData: account, expectedNetWorth: 1500, hasImageError: true });
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
               const expectedSelection: boolean = isSelected ? false : true;

               // Select or deselect the current image
               await selectImageCarouselPosition(page, i, true);
               await assertImageSelected(page, i, expectedSelection);

               // Close the image form and open it again to assert selection persistence
               await page.keyboard.press("Escape");
               await openImageForm(page);
               await assertImageSelected(page, i, expectedSelection);
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
         const account: AccountFormData = { name: "Checking Account", balance: 10000, type: "Checking" };
         await performAndAssertAccountAction({ page, accountData: account, expectedNetWorth: 10000 });
      });

      test("should calculate net worth correctly for liability accounts (subtracts from total)", async({ page }) => {
         const account: AccountFormData = { name: "Credit Card", balance: 5000, type: "Credit Card" };
         await performAndAssertAccountAction({ page, accountData: account, expectedNetWorth: -5000 });
      });

      test("should calculate net worth correctly with mixed asset and liability accounts", async({ page }) => {
         const checkingId = await createAccount(page, ACCOUNT_FIXTURES.checking); // +$10,000 asset
         const creditCardId = await createAccount(page, ACCOUNT_FIXTURES.creditCard); // -$3,000 liability

         const accounts: AccountFormData[] = [
            { account_id: checkingId, ...ACCOUNT_FIXTURES.checking },
            { account_id: creditCardId, ...ACCOUNT_FIXTURES.creditCard }
         ];
         await assertNetWorth(page, accounts, 7000);
      });

      test("should calculate net worth correctly with multiple assets", async({ page }) => {
         const savingsId = await createAccount(page, ACCOUNT_FIXTURES.savings); // +$5,000 asset
         const investmentId = await createAccount(page, ACCOUNT_FIXTURES.investment); // +$8,000 asset

         const accounts: AccountFormData[] = [
            { account_id: savingsId, ...ACCOUNT_FIXTURES.savings },
            { account_id: investmentId, ...ACCOUNT_FIXTURES.investment }
         ];
         await assertNetWorth(page, accounts, 13000);
      });

      test("should calculate net worth correctly with multiple liabilities", async({ page }) => {
         const debtId = await createAccount(page, ACCOUNT_FIXTURES.debt); // -$20,000 liability
         const loanId = await createAccount(page, ACCOUNT_FIXTURES.loan); // -$15,000 liability

         const accounts: AccountFormData[] = [
            { account_id: debtId, ...ACCOUNT_FIXTURES.debt },
            { account_id: loanId, ...ACCOUNT_FIXTURES.loan }
         ];
         await assertNetWorth(page, accounts, -35000);
      });

      test("should calculate net worth correctly when asset and liability balance to zero", async({ page }) => {
         const assetAccount: AccountFormData = { name: "Checking", balance: 5000, type: "Checking" };
         const liabilityAccount: AccountFormData = { name: "Credit Card", balance: 5000, type: "Credit Card" };

         const assetId = await createAccount(page, assetAccount); // +$5,000 asset
         const liabilityId = await createAccount(page, liabilityAccount); // +$5,000 liability

         const accounts: AccountFormData[] = [
            { account_id: assetId, ...assetAccount },
            { account_id: liabilityId, ...liabilityAccount }
         ];
         await assertNetWorth(page, accounts, 0);
      });

      test("should update account balance and recalculate net worth correctly with sequential updates", async({ page }) => {
         // Start with two accounts that balance to zero
         const assetData: AccountFormData = { name: "Checking", balance: 5000, type: "Checking" };
         const liabilityData: AccountFormData = { name: "Credit Card", balance: 5000, type: "Credit Card" };

         const assetId = await createAccount(page, assetData); // +$5,000 asset
         const liabilityId = await createAccount(page, liabilityData); // +$5,000 liability

         await assertNetWorth(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData }
         ], 0);

         // Increase liability balance to $6000
         await updateAccount(page, liabilityId, { balance: 6000 }, undefined, true);

         // Net worth should now be $5000 - $6000 = -$1000
         await assertNetWorth(page, [
            { account_id: assetId, ...assetData },
            { account_id: liabilityId, ...liabilityData, balance: 6000 }
         ], -1000);

         // Increase asset balance to $6000
         await updateAccount(page, assetId, { balance: 6000 }, undefined, true);

         // Net worth should now be $6000 - $6000 = $0
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
         const checking: AccountFormData = ACCOUNT_FIXTURES.checking;
         const savings: AccountFormData = ACCOUNT_FIXTURES.savings;

         const checkingId = await createAccount(page, checking);
         const savingsId = await createAccount(page, savings);

         const accounts: AccountFormData[] = [
            { account_id: checkingId, ...checking },
            { account_id: savingsId, ...savings }
         ];

         await assertTransactionAccountDropdown(page, accounts);
      });

      test("should auto-select account in transaction dropdown", async({ page }) => {
         const investment: AccountFormData = ACCOUNT_FIXTURES.investment;
         const investmentId = await createAccount(page, investment);

         await assertTransactionAccountDropdown(page, [{ account_id: investmentId, ...investment }], investmentId);
      });
   });

   test.describe("Account Updates", () => {
      test.describe("Successful Account Updates", () => {
         let accountId: string;
         const baseAccount: AccountFormData = { name: "Test Account", balance: 1000, type: "Checking" };

         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
            accountId = await createAccount(page, baseAccount);
            baseAccount.account_id = accountId;
         });

         test("should update account name and assert on both pages", async({ page }) => {
            await performAndAssertAccountAction({ page, accountId, baseAccount, accountData: { name: "Updated Name" }, expectedNetWorth: 1000 });
         });

         test("should update account balance and assert recalculated net worth on both pages", async({ page }) => {
            await performAndAssertAccountAction({ page, accountId, baseAccount, accountData: { balance: 5000 }, expectedNetWorth: 5000 });
         });

         test("should update account type from asset to liability or vice versa and assert recalculated net worth", async({ page }) => {
            await performAndAssertAccountAction({ page, accountId, baseAccount, accountData: { type: "Credit Card" }, expectedNetWorth: -1000 });
            await performAndAssertAccountAction({ page, accountId, baseAccount, accountData: { type: "Checking" }, expectedNetWorth: 1000 });
         });

         test("should update account with new image and assert persistence", async({ page }) => {
            await performAndAssertAccountAction({ page, accountId, baseAccount, accountData: { image: IMAGE_FIXTURES.validAlt }, expectedNetWorth: 1000 });
         });

         test("should update account from no image to invalid image URL and display error notification", async({ page }) => {
            await performAndAssertAccountAction({ page, accountId, baseAccount, accountData: { image: IMAGE_FIXTURES.invalid }, expectedNetWorth: 1000, hasImageError: true });
         });
      });

      test.describe("Form Validation", () => {
         let accountId: string;
         const baseAccount: AccountFormData = { name: "Test Account", balance: 1000, type: "Checking" };

         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, false);
            accountId = await createAccount(page, baseAccount);
            baseAccount.account_id = accountId;
         });

         test("should validate empty name field on update", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId,
               baseAccount,
               accountData: { name: "" },
               expectedErrors: { "account-name": "Name must be at least 1 character" }
            });
         });

         test("should validate name maximum length on update", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId,
               baseAccount,
               accountData: { name: "a".repeat(31) },
               expectedErrors: { "account-name": "Name must be at most 30 characters" }
            });
         });

         test("should validate balance minimum value on update", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId,
               baseAccount,
               accountData: { balance: -1_000_000_000_000 },
               expectedErrors: { "account-balance": "Balance is below the minimum allowed value" }
            });
         });

         test("should validate balance maximum value on update", async({ page }) => {
            await performAndAssertAccountAction({
               page,
               accountId,
               baseAccount,
               accountData: { balance: 1_000_000_000_000 },
               expectedErrors: { "account-balance": "Balance exceeds the maximum allowed value" }
            });
         });

         test("should validate invalid image URL format on update", async({ page }) => {
            await openAccountForm(page, accountId);
            await testImageValidationMethods(page);
         });
      });
   });

   test.describe("Drag and Drop", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should reorder accounts via drag and drop", async({ page }) => {
         // Simple drag and drop for three side-by-side accounts
         const account1: AccountFormData = { name: "First", balance: 1000, type: "Checking" };
         const account2: AccountFormData = { name: "Second", balance: 2000, type: "Savings" };
         const account3: AccountFormData = { name: "Third", balance: 3000, type: "Investment" };

         const accountId1 = await createAccount(page, account1);
         const accountId2 = await createAccount(page, account2);
         const accountId3 = await createAccount(page, account3);

         await assertAccountCardsOrder(page, [accountId1, accountId2, accountId3]);

         // Drag and drop from first to second position
         const dragHandle1 = page.getByTestId(`account-card-drag-${accountId1}`);
         const card2 = page.getByTestId(`account-card-${accountId2}`);

         await dragAndDrop(page, dragHandle1, card2);
         await assertAccountCardsOrder(page, [accountId2, accountId1, accountId3]);

         // Reload the page to assert the new order
         await page.reload();
         await assertAccountCardsOrder(page, [accountId2, accountId1, accountId3]);

         // Drag and drop from third to first position
         const dragHandle3 = page.getByTestId(`account-card-drag-${accountId3}`);
         await dragAndDrop(page, dragHandle3, card2);

         await assertAccountCardsOrder(page, [accountId3, accountId2, accountId1]);

         // Reload the page to assert the new order
         await page.reload();
         await assertAccountCardsOrder(page, [accountId3, accountId2, accountId1]);
      });
   });

   test.describe("Account Deletion", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE);
      });

      test("should show confirmation dialog on delete attempt", async({ page }) => {
         const account: AccountFormData = {
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

         // Close the modal without confirming with the cancel button
         await page.getByTestId("account-delete-button-cancel").click();
         await assertComponentVisibility(page, "account-delete-button-confirm");
      });

      test("should delete account and update net worth on both pages", async({ page }) => {
         const account: AccountFormData = {
            name: "To Delete",
            balance: 5000,
            type: "Checking"
         };

         const accountId = await createAccount(page, account);

         // Delete account using modular helper
         await deleteAccount(page, accountId);

         // Assert account through the net worth and trend calculations
         await assertNetWorth(page, [], 0);
      });

      test("should delete account from asset and recalculate net worth to zero", async({ page }) => {
         const checkingId = await createAccount(page, ACCOUNT_FIXTURES.checking); // +$10,000 asset
         const savingsId = await createAccount(page, ACCOUNT_FIXTURES.savings); // +$5,000 asset

         await assertNetWorth(page, [
            { account_id: checkingId, ...ACCOUNT_FIXTURES.checking },
            { account_id: savingsId, ...ACCOUNT_FIXTURES.savings }
         ], 15000);

         await deleteAccount(page, checkingId);

         await assertNetWorth(page, [{ account_id: savingsId, ...ACCOUNT_FIXTURES.savings }], 5000);
      });

      test("should delete liability account and recalculate net worth correctly", async({ page }) => {
         const checkingId = await createAccount(page, ACCOUNT_FIXTURES.checking); // +$10,000 asset
         const creditCardId = await createAccount(page, ACCOUNT_FIXTURES.creditCard); // -$3,000 liability

         await assertNetWorth(page, [
            { account_id: checkingId, ...ACCOUNT_FIXTURES.checking },
            { account_id: creditCardId, ...ACCOUNT_FIXTURES.creditCard }
         ], 7000);

         await deleteAccount(page, creditCardId);

         // Assert only the asset account is left and the net worth is recalculated
         await assertNetWorth(page, [{ account_id: checkingId, ...ACCOUNT_FIXTURES.checking }], 10000);
      });
   });
});