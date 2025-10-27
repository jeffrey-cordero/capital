import type { Transaction } from "../transactions";

/**
 * Creates a valid income transaction
 *
 * @param {string} accountId - Account ID to associate with transaction
 * @returns {Partial<Transaction>} Income transaction data
 */
export const createIncomeTransaction = (accountId: string): Partial<Transaction> => ({
   account_id: accountId,
   amount: 1000.00,
   type: "Income",
   date: new Date().toISOString(),
   description: `Paycheck-${Date.now()}`
});

/**
 * Creates a valid expense transaction
 *
 * @param {string} accountId - Account ID to associate with transaction
 * @returns {Partial<Transaction>} Expense transaction data
 */
export const createExpenseTransaction = (accountId: string): Partial<Transaction> => ({
   account_id: accountId,
   amount: -75.50,
   type: "Expenses",
   date: new Date().toISOString(),
   description: `Grocery Shopping-${Date.now()}`
});

/**
 * Creates a large income transaction
 *
 * @param {string} accountId - Account ID to associate with transaction
 * @returns {Partial<Transaction>} Large income transaction data
 */
export const createLargeIncomeTransaction = (accountId: string): Partial<Transaction> => ({
   account_id: accountId,
   amount: 5000.00,
   type: "Income",
   date: new Date().toISOString(),
   description: `Bonus-${Date.now()}`
});

/**
 * Creates a large expense transaction
 *
 * @param {string} accountId - Account ID to associate with transaction
 * @returns {Partial<Transaction>} Large expense transaction data
 */
export const createLargeExpenseTransaction = (accountId: string): Partial<Transaction> => ({
   account_id: accountId,
   amount: -1500.00,
   type: "Expenses",
   date: new Date().toISOString(),
   description: `Rent Payment-${Date.now()}`
});

/**
 * Creates a transaction with custom properties
 *
 * @param {string} accountId - Account ID to associate with transaction
 * @param {Partial<Transaction>} overrides - Properties to override in the transaction
 * @returns {Partial<Transaction>} Transaction data with custom properties
 */
export const createCustomTransaction = (accountId: string, overrides: Partial<Transaction> = {}): Partial<Transaction> => ({
   ...createIncomeTransaction(accountId),
   ...overrides
});

/**
 * Creates a transaction with a specific date
 *
 * @param {string} accountId - Account ID to associate with transaction
 * @param {string} date - ISO date string for the transaction
 * @param {"Income" | "Expenses"} type - Transaction type
 * @returns {Partial<Transaction>} Transaction data with specific date
 */
export const createTransactionWithDate = (accountId: string, date: string, type: "Income" | "Expenses" = "Income"): Partial<Transaction> => ({
   account_id: accountId,
   amount: type === "Income" ? 1000.00 : -100.00,
   type,
   date,
   description: `${type} Transaction-${Date.now()}`
});

/**
 * Creates a transaction with a budget category
 *
 * @param {string} accountId - Account ID to associate with transaction
 * @param {string} budgetCategoryId - Budget category ID to associate with transaction
 * @returns {Partial<Transaction>} Transaction data with budget category
 */
export const createTransactionWithBudgetCategory = (accountId: string, budgetCategoryId: string): Partial<Transaction> => ({
   account_id: accountId,
   budget_category_id: budgetCategoryId,
   amount: -200.00,
   type: "Expenses",
   date: new Date().toISOString(),
   description: `Categorized Expense-${Date.now()}`
});