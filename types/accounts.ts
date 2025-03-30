import { z } from 'zod';

import { zodPreprocessNumber } from './numerics';

/**
 * Helper data structures for account types and images
 */
const ACCOUNT_TYPES = [
   "Checking", "Savings", "Credit Card", "Debt",
   "Retirement", "Investment", "Loan", "Property", "Other"
] as const;

export const liabilities = new Set(["Debt", "Credit Card", "Loan"]);
export const types = new Set(ACCOUNT_TYPES);
export const images = new Set(Array.from(types).map((type: string) => type.toLowerCase()));

/**
 * Represents a financial account with basic details
 */
export interface Account {
   account_id: string;
   name: string;
   type: string;
   image: string;
   balance: number;
   account_order: number;
   history: AccountHistory[];
}

/**
 * Represents a financial account history
 */
export type AccountHistory = {
   balance: number;
   last_updated: string;
}

/**
 * Represents a financial account schema
 */
export const accountSchema = z.object({
   account_id: z.string().trim().uuid({
      message: "Account ID must be a valid UUID"
   }).optional(),
   name: z.string().trim().min(1, {
      message: "Name must be at least 1 character"
   }).max(30, {
      message: "Name must be at most 30 characters"
   }),
   balance: zodPreprocessNumber(z.coerce.number({
      message: "Balance must be a valid number"
   }).min(-999_999_999_999.99, {
      message: "Balance must be at least -$999,999,999,999.99"
   }).max(999_999_999_999.99, {
      message: "Balance cannot exceed $999,999,999,999.99"
   })),
   type: z.enum(ACCOUNT_TYPES, {
      message: `Type must be one of: ${ACCOUNT_TYPES.join(', ')}`
   }),
   image: z.enum(Array.from(images) as [string, ...string[]])
      .or(z.string().url())
      .or(z.literal(""))
      .nullable()
      .optional(),
   account_order: zodPreprocessNumber(z.coerce.number({
      message: "Account order must be a valid number"
   }).min(0, {
      message: "Account order must be at least 0"
   }).max(2_147_483_647, {
      message: "Account order must be at most 2,147,483,647"
   }))
});

/**
 * Represents a financial account history schema
 */
export const accountHistorySchema = z.object({
   balance: accountSchema.shape.balance,
   history_balance: accountSchema.shape.balance.optional(),
   last_updated: z.coerce.date({
      message: "Last updated must be a valid date"
   }).min(new Date("1800-01-01"), {
      message: "Update cannot be earlier than the year 1800"
   }).max(new Date(new Date().getTime() + (24 * 60 * 60 * 1000)), {
      message: "Update cannot be more than 1 day in the future"
   })
});