import { z } from 'zod';

import { zodPreprocessNumber } from './numerics';

/**
 * Core account types supported in the application
 */
const ACCOUNT_TYPES: readonly string[] = [
   "Checking", "Savings", "Credit Card", "Debt",
   "Retirement", "Investment", "Loan", "Property", "Other"
] as const;

/**
 * Account types representing financial liabilities
 *
 * @see {@link Account} - Account type these liabilities are part of
 */
export const liabilities: Set<string> = new Set(["Debt", "Credit Card", "Loan"]);

/**
 * All supported account types for efficient lookups
 *
 * @see {@link Account} - Account type using these definitions
 */
export const types: Set<string> = new Set(ACCOUNT_TYPES);

/**
 * Lowercase account types for client-side image mapping
 *
 * @see {@link Account} - Account type using these image mappings
 */
export const images: Set<string> = new Set(Array.from(types).map((type: string) => type.toLowerCase()));

/**
 * Schema for financial account validation
 *
 * @see {@link Account} - Type inferred from this schema
 */
export const accountSchema = z.object({
   /* Unique account identifier */
   account_id: z.string().trim().uuid({
      message: "Account ID must be a valid UUID"
   }).optional(),

   /* Account display name */
   name: z.string().trim().min(1, {
      message: "Name must be at least 1 character"
   }).max(30, {
      message: "Name must be at most 30 characters"
   }),

   /* Current monetary balance */
   balance: zodPreprocessNumber(
      z.coerce.number({
         message: "Balance must be a valid currency amount"
      }).min(-999_999_999_999.99, {
         message: "Balance is below the minimum allowed value"
      }).max(999_999_999_999.99, {
         message: "Balance exceeds the maximum allowed value"
      })
   ),

   /* Last update timestamp */
   last_updated: z.coerce.date({
      message: "Last updated must be a valid date representation"
   }).min(new Date("1800-01-01"), {
      message: "Last updated must be on or after 1800-01-01"
   }).max(new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" })), {
      message: "Last updated cannot be in the future"
   }).transform((date) => date.toISOString()),

   /* Account classification */
   type: z.enum(ACCOUNT_TYPES as [string, ...string[]], {
      message: `Invalid account type. Must be one of: ${ACCOUNT_TYPES.join(", ")}`
   }),

   /* Visual account representation */
   image: z.enum(Array.from(images) as [string, ...string[]]).or(z.string().url({
      message: "Image must be a valid URL"
   })).or(z.literal("")).nullable().optional(),

   /* Display priority */
   account_order: zodPreprocessNumber(z.coerce.number().int({
      message: "Account order must be an integer"
   }).min(0, {
      message: "Account order cannot be negative"
   }).max(2_147_483_647, {
      message: "Account order exceeds maximum value"
   }))
});

/**
 * Financial account type definition
 *
 * @see {@link accountSchema} - Schema defining validation rules
 */
export type Account = z.infer<typeof accountSchema>;

/**
 * Creates a valid checking account
 *
 * @returns {Partial<Account>} Checking account data
 */
export const createCheckingAccount = (): Partial<Account> => ({
  name: `Checking-${Date.now()}`,
  type: "Checking",
  balance: 1000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid savings account
 *
 * @returns {Partial<Account>} Savings account data
 */
export const createSavingsAccount = (): Partial<Account> => ({
  name: `Savings-${Date.now()}`,
  type: "Savings",
  balance: 5000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid credit card account
 *
 * @returns {Partial<Account>} Credit card account data
 */
export const createCreditCardAccount = (): Partial<Account> => ({
  name: `Credit Card-${Date.now()}`,
  type: "Credit Card",
  balance: -2500.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid debt account
 *
 * @returns {Partial<Account>} Debt account data
 */
export const createDebtAccount = (): Partial<Account> => ({
  name: `Debt-${Date.now()}`,
  type: "Debt",
  balance: -15000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid retirement account
 *
 * @returns {Partial<Account>} Retirement account data
 */
export const createRetirementAccount = (): Partial<Account> => ({
  name: `Retirement-${Date.now()}`,
  type: "Retirement",
  balance: 75000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid investment account
 *
 * @returns {Partial<Account>} Investment account data
 */
export const createInvestmentAccount = (): Partial<Account> => ({
  name: `Investment-${Date.now()}`,
  type: "Investment",
  balance: 25000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid loan account
 *
 * @returns {Partial<Account>} Loan account data
 */
export const createLoanAccount = (): Partial<Account> => ({
  name: `Loan-${Date.now()}`,
  type: "Loan",
  balance: -50000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid property account
 *
 * @returns {Partial<Account>} Property account data
 */
export const createPropertyAccount = (): Partial<Account> => ({
  name: `Property-${Date.now()}`,
  type: "Property",
  balance: 350000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid other account
 *
 * @returns {Partial<Account>} Other account data
 */
export const createOtherAccount = (): Partial<Account> => ({
  name: `Other-${Date.now()}`,
  type: "Other",
  balance: 1500.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates an account with custom properties
 *
 * @param {Partial<Account>} overrides - Properties to override in the account
 * @returns {Partial<Account>} Account data with custom properties
 */
export const createCustomAccount = (overrides: Partial<Account> = {}): Partial<Account> => ({
  ...createCheckingAccount(),
  ...overrides
});