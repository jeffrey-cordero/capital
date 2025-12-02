import { expect, type Locator, type Page, type Response } from "@playwright/test";
import {
   assertComponentIsHidden,
   assertComponentIsVisible,
   assertInputVisibility,
   assertModalIsClosed,
   closeModal
} from "@tests/utils";
import { ACCOUNTS_ROUTE, BUDGETS_ROUTE } from "@tests/utils/authentication";
import { assertAccountTrends } from "@tests/utils/dashboard";
import {
   assertBudgetPieChart,
   assertBudgetProgress,
   assertBudgetTrends,
   navigateBudgetPeriod,
   openBudgetForm
} from "@tests/utils/dashboard/budgets";
import { assertValidationErrors, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { HTTP_STATUS } from "capital/server";
import { type Transaction } from "capital/transactions";

import { getCurrentDate, toHtmlDate } from "@/lib/dates";
import { displayDate } from "@/lib/display";

/**
 * Extended transaction data type for form submission
 */
export type TransactionFormData = Partial<Transaction> & {
   transaction_id?: string;
   date?: string;
   amount?: number;
   description?: string;
   account_id?: string | null;
   budget_category_id?: string | null;
};

/**
 * Options for performing and asserting transaction operations
 */
export type PerformTransactionActionOptions = {
   page: Page;
   transactionData?: TransactionFormData;
   transactionId?: string;
   transactionIds?: string[];
   baseTransaction?: TransactionFormData;
   expectedErrors?: Record<string, string>;
   isDeletion?: boolean;
};

/**
 * Override values for transaction form input assertions
 */
export type TransactionFormInputOverrides = {
   date?: string;
   amount?: string;
   description?: string;
   accountId?: string;
   budgetCategoryId?: string;
};

/**
 * Detects the currently active transaction view
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<"table" | "list">} Current view type
 */
async function getCurrentView(page: Page): Promise<"table" | "list"> {
   const toggle: Locator = page.locator("[data-testid=\"transactions-view-toggle-table\"]");
   const tablePressed: string | null = await toggle.getAttribute("aria-pressed");

   return tablePressed === "true" ? "table" : "list";
}

/**
 * Builds the form data object from transaction data for form submission
 *
 * @param {TransactionFormData} transactionData - Transaction data to convert
 * @returns {Record<string, string | number>} FormData object with test IDs as keys
 */
function buildTransactionFormData(transactionData: TransactionFormData): Record<string, string | number> {
   const formData: Record<string, string | number> = {};

   if (transactionData.date !== undefined) formData["transaction-date"] = transactionData.date;
   if (transactionData.amount !== undefined) formData["transaction-amount"] = transactionData.amount;
   if (transactionData.description !== undefined) formData["transaction-description"] = transactionData.description;
   if (transactionData.account_id !== undefined) formData["transaction-account-select"] = transactionData.account_id || "";
   if (transactionData.budget_category_id !== undefined) formData["transaction-budget-category-select"] = transactionData.budget_category_id || "";

   return formData;
}

/**
 * Gets the appropriate test ID for a transaction element based on the current view
 *
 * @param {"table" | "list"} view - Current view type
 * @param {string} transactionId - Transaction ID
 * @param {"card" | "date" | "edit" | "delete"} elementType - Type of element
 * @returns {string} Test ID string
 */
function getTransactionTestId(
   view: "table" | "list",
   transactionId: string,
   elementType: "card" | "date" | "edit" | "delete"
): string {
   const prefix: string = view === "table" ? "transaction" : "transaction-card";
   return `${prefix}-${elementType}-${transactionId}`;
}

/**
 * Opens the transaction form modal
 *
 * @param {Page} page - Playwright page instance
 * @param {string} transactionId - Optional transaction ID for edit mode
 */
export async function openTransactionForm(
   page: Page,
   transactionId?: string
): Promise<void> {
   if (transactionId) {
      const view: "table" | "list" = await getCurrentView(page);
      const testId: string = getTransactionTestId(view, transactionId, "edit");
      await page.getByTestId(testId).click();
   } else {
      await page.getByTestId("transactions-add-button").click();
   }

   await assertComponentIsVisible(page, "transaction-date");
}

/**
 * Creates a transaction via form submission or validates errors
 *
 * @param {Page} page - Playwright page instance
 * @param {TransactionFormData} transactionData - Transaction data to submit
 * @param {Record<string, string>} expectedErrors - Optional validation errors to assert
 * @returns {Promise<string>} Created transaction ID or empty string if validation errors expected
 */
export async function createTransaction(
   page: Page,
   transactionData: TransactionFormData,
   expectedErrors?: Record<string, string>
): Promise<string> {
   await openTransactionForm(page);

   const formData: Record<string, string | number> = buildTransactionFormData(transactionData);

   if (expectedErrors) {
      await submitForm(page, formData, { buttonType: "Create", containsErrors: true });
      await assertValidationErrors(page, expectedErrors);
      return "";
   }

   const responsePromise = page.waitForResponse((response: Response) => {
      return response.url().includes("/api/v1/dashboard/transactions")
         && response.request().method() === "POST";
   });

   await submitForm(page, formData, { buttonType: "Create" });

   const response: Response = await responsePromise;
   expect(response.status()).toBe(HTTP_STATUS.CREATED);

   const responseBody = await response.json();
   const transactionId: string = responseBody.data?.transaction_id;
   expect(transactionId).toBeDefined();
   expect(transactionId).toBeTruthy();
   await assertModalIsClosed(page);

   return transactionId;
}

/**
 * Updates a transaction via form submission or validates errors
 *
 * @param {Page} page - Playwright page instance
 * @param {string} transactionId - Transaction ID to update
 * @param {TransactionFormData} transactionData - Updated transaction data
 * @param {Record<string, string>} expectedErrors - Optional validation errors to assert
 */
export async function updateTransaction(
   page: Page,
   transactionId: string,
   transactionData: TransactionFormData,
   expectedErrors?: Record<string, string>
): Promise<void> {
   await openTransactionForm(page, transactionId);

   const formData: Record<string, string | number> = buildTransactionFormData(transactionData);

   if (expectedErrors) {
      await submitForm(page, formData, { buttonType: "Update", containsErrors: true });
      await assertValidationErrors(page, expectedErrors);
      return;
   }

   const responsePromise = page.waitForResponse((response: Response) => {
      return response.url().includes(`/api/v1/dashboard/transactions/${transactionId}`)
         && response.request().method() === "PUT";
   });

   await submitForm(page, formData, { buttonType: "Update" });

   const response: Response = await responsePromise;
   expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);
   await assertModalIsClosed(page);
}

/**
 * Performs create, update, or delete transaction action with automatic validation
 *
 * @param {PerformTransactionActionOptions} options - Transaction action options
 * @returns {Promise<string>} Created or updated transaction ID, empty string if deletion
 */
export async function performAndAssertTransactionAction(
   options: PerformTransactionActionOptions
): Promise<string> {
   const { page, transactionData, transactionId, transactionIds, baseTransaction, expectedErrors, isDeletion } = options;

   if (isDeletion !== undefined) {
      const ids: string | string[] = transactionIds || transactionId!;
      await performAndAssertDeleteAction(page, ids, isDeletion);
      return "";
   }

   let resultId: string = "";
   let finalTransaction: TransactionFormData = {};
   const isUpdate: boolean = !!transactionId && !!baseTransaction;

   if (isUpdate) {
      await updateTransaction(page, transactionId!, transactionData!, expectedErrors);
      finalTransaction = { ...baseTransaction, ...transactionData, transaction_id: transactionId };
      resultId = transactionId!;
   } else {
      resultId = await createTransaction(page, transactionData!, expectedErrors);
      finalTransaction = { transaction_id: resultId, ...transactionData };
   }

   if (!expectedErrors) {
      await assertTransactionInBothViews(page, finalTransaction);
   }

   return resultId;
}

/**
 * Deletes a transaction with optional confirmation
 *
 * @param {Page} page - Playwright page instance
 * @param {string} transactionId - Transaction ID to delete
 * @param {boolean} confirmDelete - Whether to confirm deletion
 */
export async function deleteTransaction(
   page: Page,
   transactionId: string,
   confirmDelete: boolean = true
): Promise<void> {
   const view: "table" | "list" = await getCurrentView(page);
   const deleteTestId: string = getTransactionTestId(view, transactionId, "delete");
   await page.getByTestId(deleteTestId).click();

   if (confirmDelete) {
      const responsePromise = page.waitForResponse((response: Response) => {
         return response.url().includes(`/api/v1/dashboard/transactions/${transactionId}`)
            && response.request().method() === "DELETE";
      });

      await page.getByTestId(`${deleteTestId}-confirm`).click();

      const response: Response = await responsePromise;
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);
   } else {
      await page.getByTestId(`${deleteTestId}-cancel`).click();
   }
}

/**
 * Performs transaction deletion and asserts the result in both views
 *
 * @param {Page} page - Playwright page instance
 * @param {string | string[]} transactionIds - Single transaction ID or array of IDs to delete
 * @param {boolean} isDeleted - Whether deletion should be confirmed
 */
export async function performAndAssertDeleteAction(
   page: Page,
   transactionIds: string | string[],
   isDeleted: boolean = true
): Promise<void> {
   const ids: string[] = Array.isArray(transactionIds) ? transactionIds : [transactionIds];
   const isBulk: boolean = Array.isArray(transactionIds) && transactionIds.length > 1;

   if (isBulk) {
      await bulkDeleteTransactions(page, ids, isDeleted);
   } else {
      await deleteTransaction(page, ids[0], isDeleted);
   }

   for (const id of ids) {
      await assertTransactionInBothViews(page, { transaction_id: id }, isDeleted);
   }
}

/**
 * Deletes multiple transactions using bulk delete
 *
 * @param {Page} page - Playwright page instance
 * @param {string[]} transactionIds - Array of transaction IDs to delete
 * @param {boolean} confirmDelete - Whether to confirm deletion
 */
export async function bulkDeleteTransactions(
   page: Page,
   transactionIds: string[],
   confirmDelete: boolean = true
): Promise<void> {
   for (const transactionId of transactionIds) {
      // Check all of the desired transactions to be deleted within the table view
      const checkbox: Locator = page.locator(`[data-id="${transactionId}"] input[type="checkbox"]`);
      await checkbox.click();
   }

   // Open the bulk delete confirmation modal
   await page.getByTestId("transactions-bulk-delete").click();

   if (confirmDelete) {
      const responsePromise = page.waitForResponse((response: Response) => {
         return response.url().includes("/api/v1/dashboard/transactions/bulk")
            && response.request().method() === "DELETE";
      });

      await page.getByTestId("transactions-bulk-delete-confirm").click();

      const response: Response = await responsePromise;
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);
   } else {
      await page.getByTestId("transactions-bulk-delete-cancel").click();
   }
}

/**
 * Asserts a transaction displays correctly in a specific view
 *
 * @param {Page} page - Playwright page instance
 * @param {TransactionFormData} expectedData - Expected transaction data to validate
 * @param {"table" | "list"} viewType - View type to assert
 * @param {boolean} isDeleted - Whether transaction should be hidden
 */
async function assertTransactionInView(
   page: Page,
   expectedData: TransactionFormData,
   viewType: "table" | "list",
   isDeleted: boolean = false
): Promise<void> {
   const transactionId: string = expectedData.transaction_id!;
   const prefix: string = viewType === "table" ? "transaction" : "transaction-card";
   const assertFn: (page: Page, testId: string) => Promise<void> = isDeleted ? assertComponentIsHidden : assertComponentIsVisible;

   const fieldsToAssert = {
      date: "date",
      amount: "amount",
      description: "description",
      account_id: "account-chip",
      budget_category_id: "category-chip"
   };

   for (const [key, suffix] of Object.entries(fieldsToAssert) as [keyof typeof expectedData, string][]) {
      if (expectedData[key] !== undefined && expectedData[key] !== null) {
         await assertFn(page, `${prefix}-${suffix}-${transactionId}`);
      }
   }
}

/**
 * Asserts transaction displays correctly in both table and card views
 *
 * @param {Page} page - Playwright page instance
 * @param {TransactionFormData} expectedData - Expected transaction data to validate
 * @param {boolean} isDeleted - Whether transaction should be hidden
 */
export async function assertTransactionInBothViews(
   page: Page,
   expectedData: TransactionFormData,
   isDeleted: boolean = false
): Promise<void> {
   const originalView: "table" | "list" = await getCurrentView(page);

   await toggleTransactionView(page, "table");
   await assertTransactionInView(page, expectedData, "table", isDeleted);

   await toggleTransactionView(page, "list");
   await assertTransactionInView(page, expectedData, "list", isDeleted);

   await toggleTransactionView(page, originalView);
}

/**
 * Asserts the budget category dropdown contains expected categories
 *
 * @param {Page} page - Playwright page instance
 * @param {Array<{name: string, type: string}>} expectedCategories - Expected categories
 */
export async function assertTransactionBudgetDropdown(
   page: Page,
   expectedCategories: Array<{ name: string; type: string }>
): Promise<void> {
   await openTransactionForm(page);

   // Open the budget category dropdown
   await page.getByTestId("transaction-budget-category-select").click();

   for (const category of expectedCategories) {
      // Ensure all categories are visible in the dropdown
      await expect(page.getByRole("option", { name: category.name })).toBeVisible();
   }

   // Close the budget category dropdown
   await page.keyboard.press("Escape");

   // Close the transaction form
   await closeModal(page);
}

/**
 * Toggles between table and list views
 *
 * @param {Page} page - Playwright page instance
 * @param {"table" | "list"} targetView - View to switch to
 */
export async function toggleTransactionView(
   page: Page,
   targetView: "table" | "list"
): Promise<void> {
   const testId: string = targetView === "table" ? "transactions-view-toggle-table" : "transactions-view-toggle-list";
   await page.getByTestId(testId).click();
}

/**
 * Asserts view preference persists after page reload
 *
 * @param {Page} page - Playwright page instance
 * @param {"table" | "list"} expectedView - Expected view after reload
 */
export async function assertViewPersistence(
   page: Page,
   expectedView: "table" | "list"
): Promise<void> {
   await page.reload();
   await page.waitForLoadState("networkidle");

   const view: string | null = await page.evaluate(() => window.localStorage.getItem("view"));
   expect(view).toBe(expectedView);
}

/**
 * Asserts transaction form inputs are visible and have expected values
 *
 * @param {Page} page - Playwright page instance
 * @param {TransactionFormInputOverrides} [overrides] - Optional override values for specific inputs
 */
export async function assertTransactionFormInputs(
   page: Page,
   overrides?: TransactionFormInputOverrides
): Promise<void> {
   const defaultDate: string = toHtmlDate(getCurrentDate());

   const formInputs = [
      {
         testId: "transaction-date",
         label: "Date",
         value: overrides?.date !== undefined ? overrides.date : defaultDate
      },
      {
         testId: "transaction-amount",
         label: "Amount",
         value: overrides?.amount !== undefined ? overrides.amount : ""
      },
      {
         testId: "transaction-description",
         label: "Description",
         value: overrides?.description !== undefined ? overrides.description : ""
      },
      {
         testId: "transaction-account-select",
         label: "Account",
         value: overrides?.accountId !== undefined ? overrides.accountId : ""
      },
      {
         testId: "transaction-budget-category-select",
         label: "Category",
         value: overrides?.budgetCategoryId !== undefined
            ? (typeof overrides.budgetCategoryId === "string" ? overrides.budgetCategoryId : "")
            : ""
      }
   ];

   for (const input of formInputs) {
      await assertInputVisibility(page, input.testId, input.label, input.value);
   }

   // For dropdown inputs, assert the selected value is the expected value
   if (overrides?.accountId) {
      await expect(page.getByTestId("transaction-account-select")).toHaveValue(overrides.accountId);
   }

   if (overrides?.budgetCategoryId) {
      await expect(page.getByTestId("transaction-budget-category-select")).toHaveValue(overrides.budgetCategoryId);
   }
}

/**
 * Opens transaction form from main accounts page
 *
 * @param {Page} page - Playwright page instance
 */
export async function openTransactionFormFromAccountsPage(page: Page): Promise<void> {
   if (!page.url().includes(ACCOUNTS_ROUTE)) {
      await navigateToPath(page, ACCOUNTS_ROUTE);
   }

   await page.getByTestId("transactions-add-button").click();
   await assertComponentIsVisible(page, "transaction-date");
}

/**
 * Opens transaction form from individual account card view
 *
 * @param {Page} page - Playwright page instance
 * @param {string} accountId - Account ID to filter by
 */
export async function openTransactionFormFromAccountCard(
   page: Page,
   accountId: string
): Promise<void> {
   await page.getByTestId(`account-card-${accountId}`).click();

   await page.getByTestId("transactions-add-button-account").click();
   await assertComponentIsVisible(page, "transaction-date");
}

/**
 * Opens transaction form from budget category view
 *
 * @param {Page} page - Playwright page instance
 * @param {"Income" | "Expenses"} budgetType - Budget type
 */
export async function openTransactionFormFromBudgetView(
   page: Page,
   budgetType: "Income" | "Expenses"
): Promise<void> {
   if (!page.url().includes(BUDGETS_ROUTE)) {
      await navigateToPath(page, BUDGETS_ROUTE);
   }

   await openBudgetForm(page, budgetType);
   await page.getByTestId("transactions-add-button-budget").click();
   await assertComponentIsVisible(page, "transaction-budget-category-select");
}

/**
 * Asserts the empty state message is displayed
 *
 * @param {Page} page - Playwright page instance
 */
export async function assertEmptyState(page: Page): Promise<void> {
   await assertComponentIsVisible(page, "transactions-empty-state", "No available transactions");
}

/**
 * Asserts transactions appear in the specified order for both views
 *
 * @param {Page} page - Playwright page instance
 * @param {TransactionFormData[]} expectedOrder - Array of transactions in expected order (index `0` = newest)
 */
export async function assertTransactionOrder(page: Page, expectedOrder: TransactionFormData[]): Promise<void> {
   for (const view of ["table", "list"] as const) {
      await toggleTransactionView(page, view);
      const prefix: string = view === "table" ? "transaction" : "transaction-card";

      const dates: Locator[] = await page.locator(`[data-testid^="${prefix}-date-"]`).all();
      expect(dates.length).toBe(expectedOrder.length);

      for (let i = 0; i < expectedOrder.length; i++) {
         const date: Locator = dates[i];
         const expectedTransaction: TransactionFormData = expectedOrder[i];

         const testId: string | null = await date.getAttribute("data-testid");
         const actualTransactionId: string = testId?.replace(`${prefix}-date-`, "") || "";
         expect(actualTransactionId).toBe(expectedTransaction.transaction_id);

         const dateText: string | null = await date.textContent();
         const expectedDisplayDate: string = expectedTransaction.date ? displayDate(expectedTransaction.date) : "";
         expect(dateText).toBe(expectedDisplayDate);

         if (expectedTransaction.description) {
            const description: Locator = page.getByTestId(`${prefix}-description-${expectedTransaction.transaction_id}`);
            await expect(description).toHaveText(expectedTransaction.description);
         }
      }
   }
}

/**
 * Validates budget pie charts and progress bars for income and expenses with single subcategories
 * for testing simplicity
 *
 * @param {Page} page - Playwright page instance
 * @param {string} incomeCategoryId - Income budget category ID, where `"Income"` is the main category
 * @param {string} expenseCategoryId - Expense budget category ID, where `"Expenses"` is the main category
 * @param {number} incomeUsed - Amount used for income category
 * @param {number} incomeGoal - Goal amount for income category
 * @param {number} expenseUsed - Amount used for expense category
 * @param {number} expenseGoal - Goal amount for expense category
 * @param {number} mainGoal - Main budget goal amount
 */
export async function validateBudgetPeriod(
   page: Page,
   incomeCategoryId: string,
   expenseCategoryId: string,
   incomeUsed: number,
   incomeGoal: number,
   expenseUsed: number,
   expenseGoal: number,
   mainGoal: number
): Promise<void> {
   await assertBudgetPieChart(page, "Income", incomeUsed);
   await assertBudgetProgress(page, "Income", incomeUsed, mainGoal);
   await assertBudgetProgress(page, incomeCategoryId, incomeUsed, incomeGoal);

   await assertBudgetPieChart(page, "Expenses", expenseUsed);
   await assertBudgetProgress(page, "Expenses", expenseUsed, mainGoal);
   await assertBudgetProgress(page, expenseCategoryId, expenseUsed, expenseGoal);
}

/**
 * Calculates 24 months of account balances from transaction history
 *
 * @param {number} startingBalance - Initial account balance
 * @param {number} currentYear - Current year
 * @param {number} currentMonth - Current month (`0-11`)
 * @param {Array<{year: number, month: number, effect: number}>} transactions - Transaction history
 * @returns {{lastYearBalances: (number | null)[], currentYearBalances: (number | null)[]}} Last year and current year balances
 */
export function setupAccountBalances(
   startingBalance: number,
   currentYear: number,
   currentMonth: number,
   transactions: Array<{ year: number; month: number; effect: number }>
): {
   lastYearBalances: (number | null)[];
   currentYearBalances: (number | null)[];
} {
   const lastYear: number = currentYear - 1;
   const allBalances: (number | null)[] = [];

   for (let yearOffset = 0; yearOffset < 2; yearOffset++) {
      const year: number = lastYear + yearOffset;

      for (let month = 0; month < 12; month++) {
         if (year === currentYear && month > currentMonth) {
            // Future months should be null
            allBalances.push(null);
            continue;
         }

         // Calculate the cumulative balance by applying all transactions up to and including this month
         let balance: number = startingBalance;

         for (const t of transactions) {
            if (t.year < year || (t.year === year && t.month <= month)) {
               balance += t.effect;
            }
         }

         allBalances.push(balance);
      }
   }

   return {
      lastYearBalances: allBalances.slice(0, 12),
      currentYearBalances: allBalances.slice(12, 24)
   };
}

/**
 * Validates account trends on dashboard and accounts pages for the current and previous year for
 * a single account with the name `"Main Account"` for testing simplicity
 *
 * @param {Page} page - Playwright page instance
 * @param {string} accountId - Account ID to validate
 * @param {number} accountBalance - Current account balance
 * @param {(number | null)[]} currentYearBalances - Balance for each month of current year, where `0` = January, `11` = December
 * @param {(number | null)[]} lastYearBalances - Balance for each month of last year, where `0` = January, `11` = December
 * @param {number} currentYear - Current year
 * @param {number} lastYear - Previous year
 */
export async function performAndAssertAccountTrends(
   page: Page,
   accountId: string,
   accountBalance: number,
   currentYearBalances: (number | null)[],
   lastYearBalances: (number | null)[],
   currentYear: number,
   lastYear: number,
): Promise<void> {
   const accountData = [{ account_id: accountId, name: "Main Account", balance: accountBalance, type: "Checking" }];

   await assertAccountTrends(page, accountData, accountBalance, "dashboard", [currentYearBalances]);
   await navigateToPath(page, ACCOUNTS_ROUTE);
   await assertAccountTrends(page, accountData, accountBalance, "accounts", [currentYearBalances]);

   // Navigate back to the previous year, which is not possible on the dashboard page
   await page.getByTestId("accounts-navigate-back").click();
   await expect(page.getByTestId("accounts-trends-container")).toHaveAttribute("data-year", lastYear.toString());

   // Use December's balance as net worth for previous year
   const lastYearNetWorth: number = lastYearBalances[11]!;
   await assertAccountTrends(page, accountData, lastYearNetWorth, "accounts", [lastYearBalances]);

   // Navigate forward to the current year, where the current year balances should be displayed
   await page.getByTestId("accounts-navigate-forward").click();
   await expect(page.getByTestId("accounts-trends-container")).toHaveAttribute("data-year", currentYear.toString());
   await assertAccountTrends(page, accountData, accountBalance, "accounts", [currentYearBalances]);
}

/**
 * Validates budget period data and trends across multiple time periods
 *
 * @param {Page} page - Playwright page instance
 * @param {string} incomeCategoryId - Income budget category ID
 * @param {string} expenseCategoryId - Expense budget category ID
 * @param {number} currentMonth - Current month (0-11)
 * @param {number} sixMonthsAgoMonth - Month from 6 months ago (0-11)
 * @param {number} oneYearAgoMonth - Month from 1 year ago (0-11)
 * @param {number} lastYear - Previous year
 */
export async function performAndAssertBudgetPeriods(
   page: Page,
   incomeCategoryId: string,
   expenseCategoryId: string,
   currentMonth: number,
   sixMonthsAgoMonth: number,
   oneYearAgoMonth: number,
   lastYear: number
): Promise<void> {
   await navigateToPath(page, BUDGETS_ROUTE);
   await validateBudgetPeriod(page, incomeCategoryId, expenseCategoryId, 300, 500, 100, 700, 2000);

   // Calculate months to navigate backwards using modulo for proper wrapping
   const monthsBack6 = (currentMonth - sixMonthsAgoMonth + 12) % 12;
   for (let i = 0; i < monthsBack6; i++) {
      await navigateBudgetPeriod(page, -1);
   }
   await validateBudgetPeriod(page, incomeCategoryId, expenseCategoryId, 400, 500, 0, 700, 2000);

   const additionalMonths = (sixMonthsAgoMonth - oneYearAgoMonth + 11) % 12;
   for (let i = 0; i < additionalMonths; i++) {
      await navigateBudgetPeriod(page, -1);
   }

   // Check if we've crossed year boundary and need one more navigation step
   const currentYearAttr = await page.getByTestId("budgets-trends-container").getAttribute("data-year");
   const needsYearNavigation = currentYearAttr !== lastYear.toString();

   if (needsYearNavigation) {
      await navigateBudgetPeriod(page, -1);
      await expect(page.getByTestId("budget-period-label")).toContainText(lastYear.toString());
   }

   await validateBudgetPeriod(page, incomeCategoryId, expenseCategoryId, 0, 500, 600, 700, 2000);

   if (needsYearNavigation) {
      await navigateBudgetPeriod(page, -1);
      await validateBudgetPeriod(page, incomeCategoryId, expenseCategoryId, 0, 500, 0, 700, 2000);
      await navigateBudgetPeriod(page, 1);
   }

   let totalMonthsBack = monthsBack6 + additionalMonths;
   if (needsYearNavigation) {
      totalMonthsBack += 1;
   }

   for (let i = 0; i < totalMonthsBack; i++) {
      await navigateBudgetPeriod(page, 1);
   }

   await validateBudgetPeriod(page, incomeCategoryId, expenseCategoryId, 300, 500, 100, 700, 2000);

   // Build expected trend data: [used, rollover] tuples for each month
   const currentYearIncome: [number, number][] = Array(12)
      .fill(null)
      .map((_, i) => {
         if (i === currentMonth) return [300, 0];
         if (i === sixMonthsAgoMonth) return [400, 0];
         return [0, 0];
      });

   const currentYearExpense: [number, number][] = Array(12)
      .fill(null)
      .map((_, i) => {
         if (i === currentMonth) return [100, 0];
         return [0, 0];
      });

   await assertBudgetTrends(page, "Income", currentYearIncome.map(month => month[0]));
   await assertBudgetTrends(page, "Expenses", currentYearExpense.map(month => month[0]));

   await page.getByTestId("budgets-navigate-back").click();
   await expect(page.getByTestId("budgets-trends-container")).toHaveAttribute("data-year", lastYear.toString());

   const lastYearIncome: [number, number][] = Array(12)
      .fill(null)
      .map(() => [0, 0]);
   const lastYearExpense: [number, number][] = Array(12)
      .fill(null)
      .map((_, i) => {
         if (i === oneYearAgoMonth) return [600, 0];
         return [0, 0];
      });

   await assertBudgetTrends(page, "Income", lastYearIncome.map(month => month[0]));
   await assertBudgetTrends(page, "Expenses", lastYearExpense.map(month => month[0]));
}