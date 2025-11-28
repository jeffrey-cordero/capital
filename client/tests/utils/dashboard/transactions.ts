import { expect, type Page, type Response } from "@playwright/test";
import { assertComponentIsVisible, assertInputVisibility, assertModalIsClosed } from "@tests/utils";
import { ACCOUNTS_ROUTE, BUDGETS_ROUTE } from "@tests/utils/authentication";
import { assertValidationErrors, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { HTTP_STATUS } from "capital/server";
import { type Transaction } from "capital/transactions";

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
   transactionData: TransactionFormData;
   transactionId?: string;
   baseTransaction?: TransactionFormData;
   expectedErrors?: Record<string, string>;
};

/**
 * Override values for transaction form input assertions
 */
export type TransactionFormInputOverrides = {
   date?: string;
   amount?: string;
   description?: string;
   accountId?: string;
   budgetCategoryId?: string | boolean;
};

/**
 * Detects the currently active view (table or list)
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<"table" | "list">} Current view type
 */
async function getCurrentView(page: Page): Promise<"table" | "list"> {
   const tablePressed = await page.locator("[data-testid=\"transactions-view-toggle-table\"]").getAttribute("aria-pressed");
   return tablePressed === "true" ? "table" : "list";
}

/**
 * Opens the transaction form modal for creating or updating a transaction
 *
 * @param {Page} page - Playwright page instance
 * @param {string} [transactionId] - Optional transaction ID for update mode
 */
export async function openTransactionForm(
   page: Page,
   transactionId?: string
): Promise<void> {
   if (transactionId) {
      const view = await getCurrentView(page);
      const testId = view === "list"
         ? `transaction-card-edit-${transactionId}`
         : `transaction-edit-${transactionId}`;

      await page.getByTestId(testId).click();
   } else {
      await page.getByTestId("transactions-add-button").click();
   }

   await assertComponentIsVisible(page, "transaction-date");
}

/**
 * Creates a transaction via the form or validates form submission errors
 *
 * @param {Page} page - Playwright page instance
 * @param {TransactionFormData} transactionData - Transaction data to submit
 * @param {Record<string, string>} [expectedErrors] - Optional validation errors map
 * @returns {Promise<string>} Created transaction ID or empty string if errors
 */
export async function createTransaction(
   page: Page,
   transactionData: TransactionFormData,
   expectedErrors?: Record<string, string>
): Promise<string> {
   await openTransactionForm(page);

   const formData: Record<string, any> = {};

   if (transactionData.date !== undefined) formData["transaction-date"] = transactionData.date;
   if (transactionData.amount !== undefined) formData["transaction-amount"] = transactionData.amount;
   if (transactionData.description !== undefined) formData["transaction-description"] = transactionData.description;
   if (transactionData.account_id !== undefined) formData["transaction-account-select"] = transactionData.account_id || "";
   if (transactionData.budget_category_id !== undefined) formData["transaction-budget-category-select"] = transactionData.budget_category_id || "";

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

   await assertModalIsClosed(page);

   return transactionId;
}

/**
 * Updates a transaction via the form or validates form submission errors
 *
 * @param {Page} page - Playwright page instance
 * @param {string} transactionId - Transaction ID to update
 * @param {TransactionFormData} transactionData - Updated transaction data
 * @param {Record<string, string>} [expectedErrors] - Optional validation errors map
 * @param {boolean} [closeForm] - Whether to close the form after update
 */
export async function updateTransaction(
   page: Page,
   transactionId: string,
   transactionData: TransactionFormData,
   expectedErrors?: Record<string, string>,
   closeForm?: boolean
): Promise<void> {
   const formData: Record<string, any> = {};

   if (transactionData.date !== undefined) formData["transaction-date"] = transactionData.date;
   if (transactionData.amount !== undefined) formData["transaction-amount"] = transactionData.amount;
   if (transactionData.description !== undefined) formData["transaction-description"] = transactionData.description;
   if (transactionData.account_id !== undefined) formData["transaction-account-select"] = transactionData.account_id || "";
   if (transactionData.budget_category_id !== undefined) formData["transaction-budget-category-select"] = transactionData.budget_category_id || "";

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

   if (closeForm) {
      await page.keyboard.press("Escape");
      await assertModalIsClosed(page);
   }
}

/**
 * Performs a transaction create or update action and asserts the result
 *
 * @param {PerformTransactionActionOptions} options - Options for the transaction action
 * @returns {Promise<string>} Transaction ID of created or updated transaction
 */
export async function performAndAssertTransactionAction(
   options: PerformTransactionActionOptions
): Promise<string> {
   const { page, transactionData, transactionId, baseTransaction, expectedErrors } = options;

   const isUpdate = !!transactionId && baseTransaction;

   let resultId: string = "";
   let finalTransaction: TransactionFormData;

   if (isUpdate) {
      await openTransactionForm(page, transactionId);
      await updateTransaction(page, transactionId, transactionData, expectedErrors, !expectedErrors);
      finalTransaction = { ...baseTransaction, ...transactionData, transaction_id: transactionId };
      resultId = transactionId;
   } else {
      resultId = await createTransaction(page, transactionData, expectedErrors);
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
 * @param {"table" | "list"} view - Current view mode
 * @param {boolean} [confirmDelete] - Whether to confirm deletion (default true)
 */
export async function deleteTransaction(
   page: Page,
   transactionId: string,
   view: "table" | "list",
   confirmDelete: boolean = true
): Promise<void> {
   const deleteTestId = view === "list"
      ? `transaction-card-delete-${transactionId}`
      : `transaction-delete-${transactionId}`;

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
 * Deletes multiple transactions using bulk delete
 *
 * @param {Page} page - Playwright page instance
 * @param {string[]} transactionIds - Array of transaction IDs to delete
 * @param {boolean} [confirmDelete] - Whether to confirm deletion (default true)
 */
export async function bulkDeleteTransactions(
   page: Page,
   transactionIds: string[],
   confirmDelete: boolean = true
): Promise<void> {
   for (const transactionId of transactionIds) {
      const checkbox = page.locator(`[data-id="${transactionId}"] input[type="checkbox"]`);
      await checkbox.click();
   }

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
 * Asserts a transaction displays correctly in table view
 *
 * @param {Page} page - Playwright page instance
 * @param {TransactionFormData} expectedData - Expected transaction data
 * @param {boolean} [includeBalance] - Whether to check balance column
 */
export async function assertTransactionInTableView(
   page: Page,
   expectedData: TransactionFormData,
   includeBalance?: boolean
): Promise<void> {
   const transactionId = expectedData.transaction_id;

   if (expectedData.date) {
      await assertComponentIsVisible(page, `transaction-date-${transactionId}`);
   }

   if (expectedData.amount !== undefined) {
      await assertComponentIsVisible(page, `transaction-amount-${transactionId}`);
   }

   if (expectedData.description) {
      await assertComponentIsVisible(page, `transaction-description-${transactionId}`);
   }

   if (expectedData.account_id) {
      await assertComponentIsVisible(page, `transaction-account-chip-${transactionId}`);
   }

   if (expectedData.budget_category_id) {
      await assertComponentIsVisible(page, `transaction-category-chip-${transactionId}`);
   }

   if (includeBalance) {
      await assertComponentIsVisible(page, `transaction-balance-${transactionId}`);
   }
}

/**
 * Asserts a transaction displays correctly in card view
 *
 * @param {Page} page - Playwright page instance
 * @param {TransactionFormData} expectedData - Expected transaction data
 */
export async function assertTransactionInCardView(
   page: Page,
   expectedData: TransactionFormData
): Promise<void> {
   const transactionId = expectedData.transaction_id;

   await assertComponentIsVisible(page, `transaction-card-${transactionId}`);

   if (expectedData.date) {
      await assertComponentIsVisible(page, `transaction-card-date-${transactionId}`);
   }

   if (expectedData.amount !== undefined) {
      await assertComponentIsVisible(page, `transaction-card-amount-${transactionId}`);
   }

   if (expectedData.description) {
      await assertComponentIsVisible(page, `transaction-card-description-${transactionId}`);
   }

   if (expectedData.account_id) {
      await assertComponentIsVisible(page, `transaction-card-account-chip-${transactionId}`);
   }

   if (expectedData.budget_category_id) {
      await assertComponentIsVisible(page, `transaction-card-category-chip-${transactionId}`);
   }
}

/**
 * Asserts a transaction displays correctly in both table and card views
 *
 * @param {Page} page - Playwright page instance
 * @param {TransactionFormData} expectedData - Expected transaction data
 * @param {boolean} [includeBalance] - Whether to check balance in table view
 */
export async function assertTransactionInBothViews(
   page: Page,
   expectedData: TransactionFormData,
   includeBalance?: boolean
): Promise<void> {
   await toggleTransactionView(page, "table");
   await assertTransactionInTableView(page, expectedData, includeBalance);

   await toggleTransactionView(page, "list");
   await assertTransactionInCardView(page, expectedData);

   await toggleTransactionView(page, "table");
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

   await page.getByTestId("transaction-budget-category-select").click();

   for (const category of expectedCategories) {
      await expect(page.getByRole("option", { name: category.name })).toBeVisible();
   }

   await page.keyboard.press("Escape");
   await page.keyboard.press("Escape");
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
   const testId = targetView === "table" ? "transactions-view-toggle-table" : "transactions-view-toggle-list";
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

   const viewValue = await page.evaluate(() => {
      return window.localStorage.getItem("view");
   });

   expect(viewValue).toBe(expectedView);
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
   const defaultDate = new Date().toISOString().split("T")[0];

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

   if (overrides?.accountId) {
      await expect(page.getByTestId("transaction-account-select")).toHaveValue(overrides.accountId);
   }

   if (overrides?.budgetCategoryId === true) {
      const selectValue = await page.getByTestId("transaction-budget-category-select").inputValue();
      expect(selectValue).toBeTruthy();
   } else if (typeof overrides?.budgetCategoryId === "string") {
      await expect(page.getByTestId("transaction-budget-category-select")).toHaveValue(overrides.budgetCategoryId);
   }
}

/**
 * Opens transaction form from main accounts page
 *
 * @param {Page} page - Playwright page instance
 */
export async function openTransactionFormFromAccountsPage(page: Page): Promise<void> {
   await navigateToPath(page, ACCOUNTS_ROUTE);
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
   await navigateToPath(page, BUDGETS_ROUTE);

   // Open the respective budget form
   await page.getByTestId(`budget-category-edit-${budgetType}`).click();

   // Open the transaction form
   await page.getByTestId("transactions-add-button-budget").click();
   await assertComponentIsVisible(page, "transaction-date");
}

/**
 * Asserts transactions appear in the specified order in the table view
 *
 * @param {Page} page - Playwright page instance
 * @param {TransactionFormData[]} expectedOrder - Array of transactions in expected order (index 0 = first/newest)
 */
export async function assertTransactionOrder(
   page: Page,
   expectedOrder: TransactionFormData[]
): Promise<void> {
   // Ensure we're in table view for consistent row-based assertions
   const currentView = await page.locator("[data-testid=\"transactions-view-toggle-table\"]").getAttribute("aria-pressed");
   if (currentView !== "true") {
      await toggleTransactionView(page, "table");
   }

   // Get all date cells in order
   const dateLocators = await page.locator("[data-testid^=\"transaction-date-\"]").all();

   // Assert we have the expected number of transactions
   expect(dateLocators.length).toBe(expectedOrder.length);

   // Assert each transaction appears in the expected order
   for (let i = 0; i < expectedOrder.length; i++) {
      const expectedTransaction = expectedOrder[i];
      const actualDateLocator = dateLocators[i];

      // Get the transaction_id from the data-testid attribute
      const testId = await actualDateLocator.getAttribute("data-testid");
      const actualTransactionId = testId?.replace("transaction-date-", "") || "";

      // Assert the transaction ID matches expected order
      expect(actualTransactionId).toBe(expectedTransaction.transaction_id);

      // Assert the date value matches (convert to display format)
      const dateText = await actualDateLocator.textContent();
      const expectedDisplayDate = expectedTransaction.date ? displayDate(expectedTransaction.date) : "";
      expect(dateText).toBe(expectedDisplayDate);

      // Assert description if provided
      if (expectedTransaction.description) {
         const descriptionLocator = page.getByTestId(`transaction-description-${expectedTransaction.transaction_id}`);
         await expect(descriptionLocator).toHaveText(expectedTransaction.description);
      }
   }
}