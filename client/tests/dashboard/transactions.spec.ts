import { test } from "@tests/fixtures";
import { assertComponentIsHidden, assertComponentIsVisible, closeModal } from "@tests/utils";
import { ACCOUNTS_ROUTE, BUDGETS_ROUTE } from "@tests/utils/authentication";
import { assertAccountTrends } from "@tests/utils/dashboard";
import { createAccount, getAccountCardIds } from "@tests/utils/dashboard/accounts";
import {
   assertBudgetPieChart,
   assertBudgetProgress,
   createBudgetCategory,
   getBudgetCategoryIds,
   navigateBudgetPeriod
} from "@tests/utils/dashboard/budgets";
import {
   assertEmptyState,
   assertTransactionFormInputs,
   assertTransactionInBothViews,
   assertTransactionOrder,
   assertViewPersistence,
   bulkDeleteTransactions,
   createTransaction,
   openTransactionFormFromAccountCard,
   openTransactionFormFromAccountsPage,
   openTransactionFormFromBudgetView,
   performAndAssertDeleteAction,
   performAndAssertTransactionAction,
   toggleTransactionView,
   type TransactionFormData,
   updateTransaction
} from "@tests/utils/dashboard/transactions";
import { navigateToPath } from "@tests/utils/navigation";
import { setupAssignedUser } from "@tests/utils/user-management";

import { getCurrentDate, toHtmlDate } from "@/lib/dates";

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

            const transactionId = await performAndAssertTransactionAction({ page, transactionData });
            await assertTransactionInBothViews(page, { transaction_id: transactionId, ...transactionData });
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

            await performAndAssertTransactionAction({
               page,
               transactionId,
               baseTransaction: originalData,
               transactionData: { date: "2024-01-20" }
            });
         });

         test("should update transaction amount", async({ page }) => {
            const originalData: TransactionFormData = {
               date: "2024-01-15",
               amount: 500,
               description: "Original"
            };
            const transactionId = await createTransaction(page, originalData);

            await performAndAssertTransactionAction({
               page,
               transactionId,
               baseTransaction: originalData,
               transactionData: { amount: 750 }
            });
         });

         test("should update transaction description", async({ page }) => {
            const originalData: TransactionFormData = {
               date: "2024-01-15",
               amount: 500,
               description: "Original"
            };
            const transactionId = await createTransaction(page, originalData);

            await performAndAssertTransactionAction({
               page,
               transactionId,
               baseTransaction: originalData,
               transactionData: { description: "Updated description" }
            });
         });

         test("should update transaction from card view", async({ page }) => {
            const originalData: TransactionFormData = {
               date: "2024-01-15",
               amount: 500,
               description: "Original"
            };
            const transactionId = await createTransaction(page, originalData);

            await toggleTransactionView(page, "list");
            await performAndAssertTransactionAction({
               page,
               transactionId,
               baseTransaction: originalData,
               transactionData: { description: "Updated from card" }
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
            await updateTransaction(page, transaction3Id, { date: "2024-01-12" });

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

         await performAndAssertDeleteAction(page, transactionId);
      });

      test("should delete transaction from card view", async({ page }) => {
         const transactionId = await createTransaction(page, {
            date: "2024-01-15",
            amount: 500
         });

         await toggleTransactionView(page, "list");
         await performAndAssertDeleteAction(page, transactionId);
      });

      test("should cancel transaction deletion", async({ page }) => {
         const transactionId = await createTransaction(page, {
            date: "2024-01-15",
            amount: 500
         });

         await performAndAssertDeleteAction(page, transactionId, false);
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

         await performAndAssertDeleteAction(page, transactionId);
         await page.reload();
         await assertEmptyState(page);
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
         await performAndAssertDeleteAction(page, transaction1Id);
         await performAndAssertDeleteAction(page, transaction2Id);

         // Assert empty state message appears in table view
         await assertEmptyState(page);

         // Toggle to list view and assert empty state still appears
         await toggleTransactionView(page, "list");
         await assertEmptyState(page);
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
         const originalData: TransactionFormData = {
            date: "2024-01-15",
            amount: 500,
            description: "Original"
         };
         const transactionId = await createTransaction(page, originalData);

         await toggleTransactionView(page, "list");
         await performAndAssertTransactionAction({
            page,
            transactionId,
            baseTransaction: originalData,
            transactionData: { description: "Updated from card" }
         });
      });

      test("should maintain parity for all create, read, update, delete operations", async({ page }) => {
         const baseTransaction: TransactionFormData = { date: "2024-01-15", amount: 100 };
         const id1 = await createTransaction(page, baseTransaction);
         await assertTransactionInBothViews(page, { transaction_id: id1, ...baseTransaction });

         await toggleTransactionView(page, "list");
         await performAndAssertTransactionAction({
            page,
            transactionId: id1,
            baseTransaction,
            transactionData: { amount: 150 }
         });

         await performAndAssertDeleteAction(page, id1, true, true);
         await assertEmptyState(page);
      });
   });

   test.describe("Account & Budgets Integration", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, true, true);
      });

      test("should validate account trends and budget metrics impacted by transactions across time periods", async({ page }) => {
         // Step 1: Create base account
         const accountId = await createAccount(page, {
            name: "Main Account",
            balance: 2000,
            type: "Checking"
         });

         // Step 2: Navigate to budgets and create budget categories
         await navigateToPath(page, BUDGETS_ROUTE);

         const incomeCategoryId = await createBudgetCategory(page, {
            name: "Salary",
            goal: 500
         }, "Income");

         const expenseCategoryId = await createBudgetCategory(page, {
            name: "Groceries",
            goal: 700
         }, "Expenses");

         await closeModal(page, false, "budget-form-Expenses");

         // Navigate to accounts page to create transactions
         await navigateToPath(page, ACCOUNTS_ROUTE);

         // Step 3: Calculate dates for different time periods
         const currentDate = getCurrentDate();
         const currentMonth = currentDate.getMonth(); // 0-indexed
         const currentMonthDate = toHtmlDate(currentDate);

         const sixMonthsAgo = new Date(currentDate);
         sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
         const sixMonthsAgoMonth = sixMonthsAgo.getMonth();
         const sixMonthsAgoDate = toHtmlDate(sixMonthsAgo);

         const oneYearAgo = new Date(currentDate);
         oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
         const oneYearAgoMonth = oneYearAgo.getMonth();
         const oneYearAgoDate = toHtmlDate(oneYearAgo);

         // Step 4: Create 4 transactions with smaller amounts to avoid negative balances
         await createTransaction(page, {
            date: currentMonthDate,
            amount: 300,
            description: "Current Salary",
            account_id: accountId,
            budget_category_id: incomeCategoryId
         });

         await createTransaction(page, {
            date: currentMonthDate,
            amount: 100,
            description: "Current Groceries",
            account_id: accountId,
            budget_category_id: expenseCategoryId
         });

         await createTransaction(page, {
            date: sixMonthsAgoDate,
            amount: 400,
            description: "6mo Salary",
            account_id: accountId,
            budget_category_id: incomeCategoryId
         });

         await createTransaction(page, {
            date: oneYearAgoDate,
            amount: 600,
            description: "1yr Groceries",
            account_id: accountId,
            budget_category_id: expenseCategoryId
         });

         // Step 5: Calculate expected 12-month balances
         const monthlyBalances: (number | null)[] = new Array(12).fill(null);

         // Work forward from year ago to current month - cumulative balances
         for (let i = 0; i <= currentMonth; i++) {
            let balance = 2000; // Starting balance

            // Apply transactions cumulatively: transactions affect this month and all future months
            // 1yr ago transaction: if it's in a previous year, it affects all months this year
            if (oneYearAgo.getFullYear() < currentDate.getFullYear()) {
               // Transaction was last year, affects all months this year
               balance -= 600;
            } else if (i >= oneYearAgoMonth) {
               // Transaction was this year, affects this month and future months
               balance -= 600;
            }

            // 6mo ago transaction affects this month onwards
            if (i >= sixMonthsAgoMonth) {
               balance += 400; // Income
            }

            // Current month transaction
            if (i >= currentMonth) {
               balance += 300 - 100; // +300 income -100 expense = +200
            }

            monthlyBalances[i] = balance;
         }

         console.log(monthlyBalances);

         // Future months are null (already set above)

         const accountBalance = 2000; // Net worth only reflects account balance, not transactions

         // Step 6: Validate account trends on dashboard and accounts page
         await assertAccountTrends(
            page,
            [{ account_id: accountId, name: "Main Account", balance: accountBalance, type: "Checking" }],
            accountBalance,
            "dashboard",
            [monthlyBalances]
         );

         await navigateToPath(page, ACCOUNTS_ROUTE);
         await assertAccountTrends(
            page,
            [{ account_id: accountId, name: "Main Account", balance: accountBalance, type: "Checking" }],
            accountBalance,
            "accounts",
            [monthlyBalances]
         );

         // Step 7: Navigate to budgets and validate current month
         await navigateToPath(page, BUDGETS_ROUTE);

         // Validate Income pie chart and progress (current month: 300 used / 500 goal)
         await assertBudgetPieChart(page, "Income", 300);
         await assertBudgetProgress(page, "Income", 300, 2000);
         await assertBudgetProgress(page, incomeCategoryId, 300, 500);

         // Validate Expense pie chart and progress (current month: 100 used / 700 goal)
         await assertBudgetPieChart(page, "Expenses", 100);
         await assertBudgetProgress(page, "Expenses", 100, 2000);
         await assertBudgetProgress(page, expenseCategoryId, 100, 700);

         // Step 8: Navigate to 6 months ago and validate
         const monthsBack6 = (currentMonth - sixMonthsAgoMonth + 12) % 12;
         for (let i = 0; i < monthsBack6; i++) {
            await navigateBudgetPeriod(page, -1);
         }

         // Validate 6 months ago (income: 400, expenses: 0)
         await assertBudgetPieChart(page, "Income", 400);
         await assertBudgetProgress(page, "Income", 400, 2000);
         await assertBudgetProgress(page, incomeCategoryId, 400, 500);

         await assertBudgetPieChart(page, "Expenses", 0);
         await assertBudgetProgress(page, "Expenses", 0, 2000);
         await assertBudgetProgress(page, expenseCategoryId, 0, 700);

         // Step 9: Navigate to 1 year ago and validate
         const additionalMonths = (sixMonthsAgoMonth - oneYearAgoMonth + 12) % 12;
         for (let i = 0; i < additionalMonths; i++) {
            await navigateBudgetPeriod(page, -1);
         }

         // Validate 1 year ago (income: 0, expenses: 600)
         await assertBudgetPieChart(page, "Income", 0);
         await assertBudgetProgress(page, "Income", 0, 2000);
         await assertBudgetProgress(page, incomeCategoryId, 0, 500);

         await assertBudgetPieChart(page, "Expenses", 600);
         await assertBudgetProgress(page, "Expenses", 600, 2000);
         await assertBudgetProgress(page, expenseCategoryId, 600, 700);

         // Step 10: Navigate back to current month (test forward navigation persistence)
         const totalMonthsBack = monthsBack6 + additionalMonths;
         for (let i = 0; i < totalMonthsBack; i++) {
            await navigateBudgetPeriod(page, 1);
         }

         // Re-validate current month (persistence test)
         await assertBudgetPieChart(page, "Income", 300);
         await assertBudgetProgress(page, "Income", 300, 2000);

         await assertBudgetPieChart(page, "Expenses", 100);
         await assertBudgetProgress(page, "Expenses", 100, 2000);
      });
   });
});