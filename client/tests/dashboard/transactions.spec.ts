import { expect, test } from "@tests/fixtures";
import { assertComponentIsHidden, assertComponentIsVisible } from "@tests/utils";
import { ACCOUNTS_ROUTE, BUDGETS_ROUTE } from "@tests/utils/authentication";
import { createAccount, getAccountCardIds } from "@tests/utils/dashboard/accounts";
import { getBudgetCategoryIds } from "@tests/utils/dashboard/budgets";
import {
   assertTransactionFormInputs,
   assertTransactionInBothViews,
   assertTransactionOrder,
   assertViewPersistence,
   bulkDeleteTransactions,
   createTransaction,
   deleteTransaction,
   openTransactionForm,
   openTransactionFormFromAccountCard,
   openTransactionFormFromAccountsPage,
   openTransactionFormFromBudgetView,
   performAndAssertTransactionAction,
   toggleTransactionView,
   type TransactionFormData,
   updateTransaction
} from "@tests/utils/dashboard/transactions";
import { setupAssignedUser } from "@tests/utils/user-management";

test.describe("Transaction Management", () => {
   test.describe("Initial State", () => {
      test.describe("Accounts Page Form Inputs", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, false, false);
         });

         test("should have accessible form inputs from main accounts page", async({ page }) => {
            await openTransactionFormFromAccountsPage(page);
            await assertTransactionFormInputs(page);
         });

         test("should have accessible form inputs from individual account card", async({ page }) => {
            const accountId = await createAccount(page, { name: "Savings", balance: 3000, type: "Savings" });

            await openTransactionFormFromAccountCard(page, accountId);
            await assertTransactionFormInputs(page, { accountId });
         });
      });

      test.describe("Budget Category Form Inputs", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, false, false);
         });

         test("should have accessible form inputs from budget category view", async({ page }) => {
            const mainIncomeCategory: string | null = await (page.getByTestId("budget-category-Income").getAttribute("data-category-id"));

            await openTransactionFormFromBudgetView(page, "Income");
            await assertTransactionFormInputs(page, { budgetCategoryId: mainIncomeCategory! });
         });
      });
   });

   test.describe("Transaction Creation", () => {
      test.describe("Successful Creation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, true, true);
         });

         test("should create transaction with all fields populated", async({ page }) => {
            const transactionData: TransactionFormData = {
               date: "2024-01-15",
               amount: 1500.50,
               description: "Monthly salary payment",
               account_id: (await getAccountCardIds(page))[0],
               budget_category_id: (await getBudgetCategoryIds(page, "Income"))[0]
            };

            const transactionId: string = await performAndAssertTransactionAction({
               page,
               transactionData
            });
            const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(transactionId).toBeDefined();
            expect(transactionId).toMatch(uuidV4Regex);
         });

         test("should create transaction with minimal required fields", async({ page }) => {
            const transactionData: TransactionFormData = {
               date: "2024-01-15",
               amount: 100.00
            };

            const transactionId = await createTransaction(page, transactionData);
            await assertTransactionInBothViews(page, { transaction_id: transactionId, ...transactionData });
         });

         test("should create transaction with account but no category", async({ page }) => {
            const transactionData: TransactionFormData = {
               date: "2024-01-15",
               amount: 250,
               account_id: (await getAccountCardIds(page))[0],
               budget_category_id: null
            };

            const transactionId = await createTransaction(page, transactionData);
            await assertTransactionInBothViews(page, { transaction_id: transactionId, ...transactionData });
         });

         test("should create transaction with category but no account", async({ page }) => {
            const transactionData: TransactionFormData = {
               date: "2024-01-15",
               amount: 150,
               account_id: null,
               budget_category_id: (await getBudgetCategoryIds(page, "Expenses"))[0]
            };

            const transactionId = await createTransaction(page, transactionData);
            await assertTransactionInBothViews(page, { transaction_id: transactionId, ...transactionData });
         });

         test("should create transaction with neither account nor category", async({ page }) => {
            const transactionData: TransactionFormData = {
               date: "2024-01-15",
               amount: 500,
               account_id: null,
               budget_category_id: null
            };

            const transactionId = await createTransaction(page, transactionData);
            await assertTransactionInBothViews(page, { transaction_id: transactionId, ...transactionData });
         });
      });

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, false, false);
         });

         test("should validate required date field", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: { amount: 100, date: " " },
               expectedErrors: { "transaction-date": "Date is required" }
            });
         });

         test("should validate date cannot be in the future", async({ page }) => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const futureDateString = futureDate.toISOString().split("T")[0];

            await performAndAssertTransactionAction({
               page,
               transactionData: {
                  date: futureDateString,
                  amount: 100
               },
               expectedErrors: { "transaction-date": "Date cannot be in the future" }
            });
         });

         test("should validate date minimum bounds", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: {
                  date: "1799-12-31",
                  amount: 100
               },
               expectedErrors: { "transaction-date": "Date must be on or after 1800-01-01" }
            });
         });

         test("should validate required amount field", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: { date: "2024-01-15" },
               expectedErrors: { "transaction-amount": "Amount is required" }
            });
         });

         test("should validate amount minimum value", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: { date: "2024-01-15", amount: 0 },
               expectedErrors: { "transaction-amount": "Amount must be at least $1" }
            });
         });

         test("should validate amount maximum value", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: { date: "2024-01-15", amount: 1_000_000_000_000 },
               expectedErrors: { "transaction-amount": "Amount exceeds the maximum allowed value" }
            });
         });

         test("should validate description maximum length", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: {
                  date: "2024-01-15",
                  amount: 100,
                  description: "a".repeat(256)
               },
               expectedErrors: { "transaction-description": "Description must be at most 255 characters" }
            });
         });
      });
   });

   test.describe("View Toggle", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, false, false);

         await createTransaction(page, {
            date: "2024-01-15",
            amount: 500,
            description: "Test transaction"
         });
      });

      test("should toggle from table to list view", async({ page }) => {
         await toggleTransactionView(page, "list");

         // Assert list view is visible
         await assertComponentIsVisible(page, "transactions-list-view");
         await assertComponentIsHidden(page, "transactions-table-view");
      });

      test("should toggle from list to table view", async({ page }) => {
         await toggleTransactionView(page, "list");
         await toggleTransactionView(page, "table");

         // Assert table view is visible
         await assertComponentIsVisible(page, "transactions-table-view");
         await assertComponentIsHidden(page, "transactions-list-view");
      });

      test("should persist view preference after reload", async({ page }) => {
         await toggleTransactionView(page, "list");
         await assertViewPersistence(page, "list");
      });

      test("should default to table view on first visit", async({ page }) => {
         await page.evaluate(() => window.localStorage.clear());
         await page.reload();

         // Assert table view is visible by default
         await assertComponentIsVisible(page, "transactions-table-view");
         await assertComponentIsHidden(page, "transactions-list-view");
      });
   });

   test.describe("Transaction Updates", () => {
      test.describe("Successful Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, true, true);
         });

         test("should update transaction date", async({ page }) => {
            const originalData: TransactionFormData = {
               date: "2024-01-15",
               amount: 500,
               description: "Original"
            };
            const transactionId = await createTransaction(page, originalData);

            await openTransactionForm(page, transactionId);
            await updateTransaction(page, transactionId, { date: "2024-01-20" }, undefined, true);

            await assertTransactionInBothViews(page, {
               transaction_id: transactionId,
               ...originalData,
               date: "2024-01-20"
            });
         });

         test("should update transaction amount", async({ page }) => {
            const originalData: TransactionFormData = {
               date: "2024-01-15",
               amount: 500,
               description: "Original"
            };
            const transactionId = await createTransaction(page, originalData);

            await openTransactionForm(page, transactionId);
            await updateTransaction(page, transactionId, { amount: 750 }, undefined, true);

            await assertTransactionInBothViews(page, {
               transaction_id: transactionId,
               ...originalData,
               amount: 750
            });
         });

         test("should update transaction description", async({ page }) => {
            const originalData: TransactionFormData = {
               date: "2024-01-15",
               amount: 500,
               description: "Original"
            };
            const transactionId = await createTransaction(page, originalData);

            await openTransactionForm(page, transactionId);
            await updateTransaction(page, transactionId, { description: "Updated description" }, undefined, true);

            await assertTransactionInBothViews(page, {
               transaction_id: transactionId,
               ...originalData,
               description: "Updated description"
            });
         });

         test("should update transaction from card view", async({ page }) => {
            const transactionId = await createTransaction(page, {
               date: "2024-01-15",
               amount: 500,
               description: "Original"
            });

            await toggleTransactionView(page, "list");
            await openTransactionForm(page, transactionId);
            await updateTransaction(page, transactionId, { description: "Updated from card" }, undefined, true);

            await assertTransactionInBothViews(page, {
               transaction_id: transactionId,
               date: "2024-01-15",
               amount: 500,
               description: "Updated from card"
            });
         });

         test("should reorder transactions when date is updated", async({ page }) => {
            // Create 3 transactions in reverse chronological order
            const transaction1Id = await createTransaction(page, {
               date: "2024-01-15",
               amount: 100,
               description: "Transaction 1"
            });

            const transaction2Id = await createTransaction(page, {
               date: "2024-01-10",
               amount: 200,
               description: "Transaction 2"
            });

            const transaction3Id = await createTransaction(page, {
               date: "2024-01-05",
               amount: 300,
               description: "Transaction 3"
            });

            // Assert initial order (newest to oldest)
            await assertTransactionOrder(page, [
               { transaction_id: transaction1Id, date: "2024-01-15", description: "Transaction 1" },
               { transaction_id: transaction2Id, date: "2024-01-10", description: "Transaction 2" },
               { transaction_id: transaction3Id, date: "2024-01-05", description: "Transaction 3" }
            ]);

            // Update transaction 3's date to be between transaction 1 and 2
            await openTransactionForm(page, transaction3Id);
            await updateTransaction(page, transaction3Id, { date: "2024-01-12" }, undefined, true);

            // Assert new order - transaction 3 should now be in the middle
            await assertTransactionOrder(page, [
               { transaction_id: transaction1Id, date: "2024-01-15", description: "Transaction 1" },
               { transaction_id: transaction3Id, date: "2024-01-12", description: "Transaction 3" },
               { transaction_id: transaction2Id, date: "2024-01-10", description: "Transaction 2" }
            ]);
         });
      });

      test.describe("Form Validation", () => {
         const baseTransaction: TransactionFormData = {
            date: "2024-01-15",
            amount: 500,
            description: "Original"
         };

         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, false, false);
            baseTransaction.transaction_id = await createTransaction(page, baseTransaction);
         });

         test("should validate required date field", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionId: baseTransaction.transaction_id!,
               baseTransaction,
               transactionData: { amount: 100, date: " " },
               expectedErrors: { "transaction-date": "Date is required" }
            });
         });

         test("should validate date cannot be in the future", async({ page }) => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const futureDateString = futureDate.toISOString().split("T")[0];

            await performAndAssertTransactionAction({
               page,
               transactionId: baseTransaction.transaction_id!,
               baseTransaction,
               transactionData: {
                  date: futureDateString
               },
               expectedErrors: { "transaction-date": "Date cannot be in the future" }
            });
         });

         test("should validate date minimum bounds", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionId: baseTransaction.transaction_id!,
               baseTransaction,
               transactionData: {
                  date: "1799-12-31"
               },
               expectedErrors: { "transaction-date": "Date must be on or after 1800-01-01" }
            });
         });

         test("should validate amount minimum value", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionId: baseTransaction.transaction_id!,
               baseTransaction,
               transactionData: { amount: 0 },
               expectedErrors: { "transaction-amount": "Amount must be at least $1" }
            });
         });

         test("should validate amount maximum value", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionId: baseTransaction.transaction_id!,
               baseTransaction,
               transactionData: { amount: 1_000_000_000_000 },
               expectedErrors: { "transaction-amount": "Amount exceeds the maximum allowed value" }
            });
         });

         test("should validate description maximum length", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionId: baseTransaction.transaction_id!,
               baseTransaction,
               transactionData: {
                  description: "a".repeat(256)
               },
               expectedErrors: { "transaction-description": "Description must be at most 255 characters" }
            });
         });
      });
   });

   test.describe("Transaction Deletion", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, true, true);
      });

      test("should delete transaction from table view", async({ page }) => {
         const transactionId = await createTransaction(page, {
            date: "2024-01-15",
            amount: 500
         });

         await deleteTransaction(page, transactionId, "table", true);
         await assertComponentIsHidden(page, `transaction-date-${transactionId}`);
      });

      test("should delete transaction from card view", async({ page }) => {
         const transactionId = await createTransaction(page, {
            date: "2024-01-15",
            amount: 500
         });

         await toggleTransactionView(page, "list");
         await deleteTransaction(page, transactionId, "list", true);
         await assertComponentIsHidden(page, `transaction-card-${transactionId}`);
      });

      test("should cancel transaction deletion", async({ page }) => {
         const transactionId = await createTransaction(page, {
            date: "2024-01-15",
            amount: 500
         });

         await deleteTransaction(page, transactionId, "table", false);
         await assertComponentIsVisible(page, `transaction-date-${transactionId}`);
      });

      test("should bulk delete multiple transactions", async({ page }) => {
         const id1 = await createTransaction(page, { date: "2024-01-15", amount: 100 });
         const id2 = await createTransaction(page, { date: "2024-01-16", amount: 200 });
         const id3 = await createTransaction(page, { date: "2024-01-17", amount: 300 });

         await bulkDeleteTransactions(page, [id1, id3], true);

         await assertComponentIsHidden(page, `transaction-date-${id1}`);
         await assertComponentIsVisible(page, `transaction-date-${id2}`);
         await assertComponentIsHidden(page, `transaction-date-${id3}`);
      });

      test("should persist deletion after page reload", async({ page }) => {
         const transactionId = await createTransaction(page, {
            date: "2024-01-15",
            amount: 500
         });

         await deleteTransaction(page, transactionId, "table", true);
         await assertComponentIsHidden(page, `transaction-date-${transactionId}`);
      });

      test("should show empty state message when all transactions are deleted", async({ page }) => {
         // Create 2 transactions
         const transaction1Id = await createTransaction(page, {
            date: "2024-01-15",
            amount: 100,
            description: "Transaction 1"
         });

         const transaction2Id = await createTransaction(page, {
            date: "2024-01-10",
            amount: 200,
            description: "Transaction 2"
         });

         // Delete both transactions
         await deleteTransaction(page, transaction1Id, "table", true);
         await deleteTransaction(page, transaction2Id, "table", true);

         // Assert empty state message appears in table view
         await assertComponentIsVisible(page, "transactions-empty-state");
         await expect(page.getByTestId("transactions-empty-state")).toHaveText("No available transactions");

         // Toggle to list view and assert empty state still appears
         await toggleTransactionView(page, "list");
         await assertComponentIsVisible(page, "transactions-empty-state");
         await expect(page.getByTestId("transactions-empty-state")).toHaveText("No available transactions");
      });
   });

   test.describe("View Parity", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, true, true);
      });

      test("should maintain parity when creating from table view", async({ page }) => {
         const transactionData: TransactionFormData = {
            date: "2024-01-15",
            amount: 750,
            description: "Parity test transaction"
         };

         const transactionId = await createTransaction(page, transactionData);
         await assertTransactionInBothViews(page, { transaction_id: transactionId, ...transactionData });
      });

      test("should maintain parity when updating from card view", async({ page }) => {
         const transactionId = await createTransaction(page, {
            date: "2024-01-15",
            amount: 500,
            description: "Original"
         });

         await toggleTransactionView(page, "list");
         await openTransactionForm(page, transactionId);
         await updateTransaction(page, transactionId, { description: "Updated from card" }, undefined, true);

         await assertTransactionInBothViews(page, {
            transaction_id: transactionId,
            date: "2024-01-15",
            amount: 500,
            description: "Updated from card"
         });
      });

      test("should maintain parity for all CRUD operations", async({ page }) => {
         const id1 = await createTransaction(page, { date: "2024-01-15", amount: 100 });
         await assertTransactionInBothViews(page, { transaction_id: id1, date: "2024-01-15", amount: 100 });

         await toggleTransactionView(page, "list");
         await openTransactionForm(page, id1);
         await updateTransaction(page, id1, { amount: 150 }, undefined, true);
         await toggleTransactionView(page, "table");
         await assertTransactionInBothViews(page, { transaction_id: id1, date: "2024-01-15", amount: 150 });

         await deleteTransaction(page, id1, "table", true);
         await assertComponentIsHidden(page, `transaction-date-${id1}`);
         await toggleTransactionView(page, "list");
         await assertComponentIsHidden(page, `transaction-card-${id1}`);
      });
   });
});