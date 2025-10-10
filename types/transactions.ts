import { z } from "zod";
import { zodPreprocessNumber } from "./numerics";

/**
 * Schema for financial transaction validation
 *
 * @see {@link Transaction} - Type inferred from this schema
 */
export const transactionSchema = z.object({
   /* Unique transaction identifier */
   transaction_id: z.string().trim().uuid({
      message: "Transaction ID must be a valid UUID"
   }).optional(),

   /* Unique budget category identifier */
   budget_category_id: z.string().trim().uuid({
      message: "Budget category ID must be a valid UUID"
   }).or(z.literal("")).optional().nullable(),

   /* Unique financial account identifier */
   account_id: z.string().trim().uuid({
      message: "Account ID must be a valid UUID"
   }).or(z.literal("")).optional().nullable(),

   /* Monetary amount */
   amount: zodPreprocessNumber(z.coerce.number({
      message: "Amount must be a valid currency amount"
   }).min(-999_999_999_999.99, {
      message: "Amount is below the minimum allowed value"
   }).max(999_999_999_999.99, {
      message: "Amount exceeds the maximum allowed value"
   })).refine((amount) => amount !== 0, {
      message: "Amount cannot be $0"
   }),

   /* Simple description */
   description: z.string().trim().max(255, {
      message: "Description must be at most 255 characters"
   }).default(""),

   /* Type of the transaction */
   type: z.enum(["Income", "Expenses"], {
      message: "Transaction type must be either Income or Expenses"
   }),

   /* Date of the given transaction */
   date: z.coerce.date({
      message: "Date must be a valid date"
   }).min(new Date("1800-01-01"), {
      message: "Date must be on or after 1800-01-01"
   }).max(new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" })),{
      message: "Date cannot be in the future"
   }).transform((date) => date.toISOString()),
});

/**
 * Financial transaction record
 *
 * @see {@link transactionSchema} - Schema defining validation rules
 */
export type Transaction = z.infer<typeof transactionSchema>;

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