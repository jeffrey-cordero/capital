import { test } from "@tests/fixtures";
import { assertComponentIsHidden, assertComponentIsVisible, closeModal } from "@tests/utils";
import { ACCOUNTS_ROUTE, BUDGETS_ROUTE } from "@tests/utils/authentication";
import { createAccount, getAccountCardIds } from "@tests/utils/dashboard/accounts";
import {
   type BudgetProgressData,
   type BudgetTrendData,
   createBudgetCategory,
   getBudgetCategoryIds,
   getMainBudgetCategoryIds
} from "@tests/utils/dashboard/budgets";
import {
   assertEmptyState,
   assertTransactionFormInputs,
   assertTransactionInBothViews,
   assertTransactionOrder,
   assertViewPersistence,
   createTransaction,
   openTransactionFormFromAccountCard,
   openTransactionFormFromAccountsPage,
   openTransactionFormFromBudgetView,
   performAndAssertAccountTrends,
   performAndAssertBudgetTrends,
   performAndAssertTransactionAction,
   setupAccountBalances,
   setupBudgetTrends,
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
            const accountId: string = await createAccount(page, { name: "Savings", balance: 3000, type: "Savings" });

            await openTransactionFormFromAccountCard(page, accountId);
            await assertTransactionFormInputs(page, { accountId });
         });
      });

      test.describe("Budget Category Form Inputs", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, false, false);
         });

         test("should have accessible form inputs from all budget form interfaces", async({ page }) => {
            const { mainIncomeCategoryId, mainExpenseCategoryId } = await getMainBudgetCategoryIds(page);

            await openTransactionFormFromBudgetView(page, "Income");
            await assertTransactionFormInputs(page, { budgetCategoryId: mainIncomeCategoryId! });

            await openTransactionFormFromBudgetView(page, "Expenses");
            await assertTransactionFormInputs(page, { budgetCategoryId: mainExpenseCategoryId! });
         });
      });
   });

   test.describe("Transaction Creation", () => {
      test.describe("Successful Creation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, true, true);
         });

         test("should create transaction with all fields populated", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: {
                  date: "2024-01-15",
                  amount: 1500.50,
                  description: "Monthly salary payment",
                  account_id: (await getAccountCardIds(page))[0],
                  budget_category_id: (await getBudgetCategoryIds(page, "Income"))[0]
               }
            });
         });

         test("should create transaction with minimal required fields", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: {
                  date: "2024-01-15",
                  amount: 100.00
               }
            });
         });

         test("should create transaction with account but no category", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: {
                  date: "2024-01-15",
                  amount: 250,
                  account_id: (await getAccountCardIds(page))[0],
                  budget_category_id: null
               }
            });
         });

         test("should create transaction with category but no account", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: {
                  date: "2024-01-15",
                  amount: 150,
                  account_id: null,
                  budget_category_id: (await getBudgetCategoryIds(page, "Expenses"))[0]
               }
            });
         });

         test("should create transaction with neither account nor category", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionData: {
                  date: "2024-01-15",
                  amount: 500,
                  account_id: null,
                  budget_category_id: null
               }
            });
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
            const futureDate: Date = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const futureDateString: string = futureDate.toISOString().split("T")[0];

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
            const transactionId: string = await createTransaction(page, originalData);

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
            const transactionId: string = await createTransaction(page, originalData);

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
            const transactionId: string = await createTransaction(page, originalData);

            await performAndAssertTransactionAction({
               page,
               transactionId,
               baseTransaction: originalData,
               transactionData: { description: "Updated description" }
            });
         });

         test("should reorder transactions when date is updated", async({ page }) => {
            const transaction1Id: string = await createTransaction(page, {
               date: "2024-01-15",
               amount: 100,
               description: "Transaction 1"
            });
            const transaction2Id: string = await createTransaction(page, {
               date: "2024-01-10",
               amount: 200,
               description: "Transaction 2"
            });
            const transaction3Id: string = await createTransaction(page, {
               date: "2024-01-05",
               amount: 300,
               description: "Transaction 3"
            });

            // Assert the initial order of transactions
            await assertTransactionOrder(page, [
               { transaction_id: transaction1Id, date: "2024-01-15", description: "Transaction 1" },
               { transaction_id: transaction2Id, date: "2024-01-10", description: "Transaction 2" },
               { transaction_id: transaction3Id, date: "2024-01-05", description: "Transaction 3" }
            ]);

            // Update the third transaction's date to be between the first and second transactions
            await updateTransaction(page, transaction3Id, { date: "2024-01-12" });

            // Assert the new order of transactions, where the third transaction is now in the middle
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
            const futureDate: Date = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const futureDateString: string = futureDate.toISOString().split("T")[0];

            await performAndAssertTransactionAction({
               page,
               transactionId: baseTransaction.transaction_id!,
               baseTransaction,
               transactionData: { date: futureDateString },
               expectedErrors: { "transaction-date": "Date cannot be in the future" }
            });
         });

         test("should validate date minimum bounds", async({ page }) => {
            await performAndAssertTransactionAction({
               page,
               transactionId: baseTransaction.transaction_id!,
               baseTransaction,
               transactionData: { date: "1799-12-31" },
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
               transactionData: { description: "a".repeat(256) },
               expectedErrors: { "transaction-description": "Description must be at most 255 characters" }
            });
         });
      });
   });

   test.describe("Transaction Deletion", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, true, true);
      });

      test("should delete single transaction", async({ page }) => {
         const transactionId: string = await createTransaction(page, {
            date: "2024-01-15",
            amount: 500
         });

         await performAndAssertTransactionAction({
            page,
            transactionId,
            isDeletion: true
         });
      });

      test("should cancel transaction deletion", async({ page }) => {
         const transactionId: string = await createTransaction(page, {
            date: "2024-01-15",
            amount: 500
         });

         await performAndAssertTransactionAction({
            page,
            transactionId,
            isDeletion: false
         });
      });

      test("should bulk delete multiple transactions", async({ page }) => {
         const transactionId1: string = await createTransaction(page, {
            date: "2024-01-15",
            amount: 100
         });
         const transactionId2: string = await createTransaction(page, {
            date: "2024-01-16",
            amount: 200
         });
         const transactionId3: string = await createTransaction(page, {
            date: "2024-01-17",
            amount: 300
         });

         await performAndAssertTransactionAction({
            page,
            transactionIds: [transactionId1, transactionId3],
            isDeletion: true
         });

         // Only the second transaction should remain
         await assertTransactionInBothViews(page, {
            transaction_id: transactionId2,
            date: "2024-01-16",
            amount: 200
         });
      });

      test("should persist deletion after page reload", async({ page }) => {
         const transactionId = await createTransaction(page, {
            date: "2024-01-15",
            amount: 500
         });

         await performAndAssertTransactionAction({
            page,
            transactionId,
            isDeletion: true
         });
         await page.reload();
         await assertEmptyState(page);
      });

      test("should show empty state when all transactions are deleted through bulk deletion", async({ page }) => {
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

         await performAndAssertTransactionAction({
            page,
            transactionIds: [transaction1Id, transaction2Id],
            isDeletion: true
         });
         await assertEmptyState(page);
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

      test("should default to table view on first visit", async({ page }) => {
         await page.evaluate(() => window.localStorage.clear());
         await page.reload();

         await assertComponentIsVisible(page, "transactions-table-view");
         await assertComponentIsHidden(page, "transactions-list-view");
      });

      test("should toggle from table to list view", async({ page }) => {
         await toggleTransactionView(page, "list");

         await assertComponentIsVisible(page, "transactions-list-view");
         await assertComponentIsHidden(page, "transactions-table-view");
      });

      test("should toggle from list to table view", async({ page }) => {
         await toggleTransactionView(page, "list");
         await toggleTransactionView(page, "table");

         await assertComponentIsVisible(page, "transactions-table-view");
         await assertComponentIsHidden(page, "transactions-list-view");
      });

      test("should persist view preference after page reload", async({ page }) => {
         await toggleTransactionView(page, "list");
         await assertViewPersistence(page, "list");
      });
   });

   test.describe("Account & Budgets Integration", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, ACCOUNTS_ROUTE, true, true);
      });

      test("should validate account trends and budget metrics impacted by transactions across time periods", async({ page }) => {
         // Create the base accounts and budget categories
         const accountId: string = await createAccount(page, {
            name: "Main Account",
            balance: 2000,
            type: "Checking"
         });

         await navigateToPath(page, BUDGETS_ROUTE);
         const { mainExpenseCategoryId } = await getMainBudgetCategoryIds(page);

         const incomeCategoryId: string = await createBudgetCategory(page, {
            name: "Salary",
            goal: 500
         }, "Income");
         const expenseCategoryId: string = await createBudgetCategory(page, {
            name: "Groceries",
            goal: 700
         }, "Expenses");

         await closeModal(page, false, "budget-form-Expenses");
         await navigateToPath(page, ACCOUNTS_ROUTE);

         // Format all required date types for the current month, 6 months ago, and 1 year ago
         const currentDate: Date = getCurrentDate();
         const currentMonth: number = currentDate.getMonth();
         const currentMonthDate: string = toHtmlDate(currentDate);

         const sixMonthsAgo: Date = new Date(currentDate);
         sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
         const sixMonthsAgoMonth: number = sixMonthsAgo.getMonth();
         const sixMonthsAgoDate: string = toHtmlDate(sixMonthsAgo);

         const oneYearAgo: Date = new Date(currentDate);
         oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
         const oneYearAgoMonth: number = oneYearAgo.getMonth();
         const oneYearAgoDate: string = toHtmlDate(oneYearAgo);

         // Create transactions with +$300/-$100 for the current month, +$400 for 6 months ago, and -$600 for 1 year ago
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
            description: "1yr Rent Payment",
            account_id: accountId,
            budget_category_id: mainExpenseCategoryId
         });

         const currentYear: number = currentDate.getFullYear();
         const lastYear: number = currentYear - 1;
         const accountTransactions: Array<{ year: number; month: number; effect: number }> = [
            { year: currentYear, month: currentMonth, effect: +200 }, // Net income ($300 Income - $100 Expense = +$200)
            { year: sixMonthsAgo.getFullYear(), month: sixMonthsAgoMonth, effect: +400 }, // Income ($400 Income - $0 Expense = +$400)
            { year: oneYearAgo.getFullYear(), month: oneYearAgoMonth, effect: -600 } // Expense ($0 Income - $600 Expense = -$600)
         ];
         const budgetTransactions: Array<{ year: number; month: number; income: number; expense: number }> = [
            { year: currentYear, month: currentMonth, income: 300, expense: 100 },
            { year: sixMonthsAgo.getFullYear(), month: sixMonthsAgoMonth, income: 400, expense: 0 },
            { year: oneYearAgo.getFullYear(), month: oneYearAgoMonth, income: 0, expense: 600 }
         ];

         const { lastYearBalances, currentYearBalances } = setupAccountBalances(2000, currentYear, currentMonth, accountTransactions);
         const { lastYearIncome, currentYearIncome, lastYearExpense, currentYearExpense } = setupBudgetTrends(currentYear, currentMonth, budgetTransactions);

         // Build the budget trend data objects for the current and last year
         const currentYearTrends: BudgetTrendData = {
            Income: currentYearIncome,
            Expenses: currentYearExpense
         };
         const lastYearTrends: BudgetTrendData = {
            Income: lastYearIncome,
            Expenses: lastYearExpense
         };

         // Build the budget progress data objects for the current and last year ([used, allocated] tuples for main and subcategories)
         const currentYearProgress: BudgetProgressData = {
            Income: {
               main: Array(12).fill(null).map((_, i) => [currentYearIncome[i], 2000]),
               sub: Array(12).fill(null).map((_, i) => [currentYearIncome[i], 500])
            },
            Expenses: {
               main: Array(12).fill(null).map((_, i) => [currentYearExpense[i], 2000]),
               sub: Array(12).fill(null).map((_, i) => [currentYearExpense[i], 700])
            }
         };
         const lastYearProgress: BudgetProgressData = {
            Income: {
               main: Array(12).fill(null).map((_, i) => [lastYearIncome[i], 2000]),
               sub: Array(12).fill(null).map((_, i) => [lastYearIncome[i], 500])
            },
            Expenses: {
               main: Array(12).fill(null).map((_, i) => [lastYearExpense[i], 2000]),
               sub: Array(12).fill(null).map((_, i) => {
                  if (i === oneYearAgoMonth) {
                     // Edge case where the main category is used in place of the subcategory
                     return [0, 700];
                  }

                  return [lastYearExpense[i], 700];
               })
            }
         };

         await performAndAssertAccountTrends(
            page,
            accountId,
            2000,
            currentYearBalances,
            lastYearBalances,
            currentYear,
            lastYear
         );
         await performAndAssertBudgetTrends(
            page,
            currentYearTrends,
            lastYearTrends,
            currentYearProgress,
            lastYearProgress,
            incomeCategoryId,
            expenseCategoryId,
            currentYear,
            lastYear,
            currentMonth
         );
      });
   });
});