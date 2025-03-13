import { z } from 'zod';

import { zodPreprocessNumber } from './numerics';

// Common validation constants
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 30;
const MAX_INT = 2_147_483_647;
const MIN_BALANCE = -99_999_999_999.99;
const MAX_BALANCE = 99_999_999_999.99;

// Account types and images
export const ACCOUNT_TYPES = [
   "Checking", "Savings", "Credit Card", "Debt", 
   "Retirement", "Investment", "Loan", "Property", "Other"
] as const;

export const liabilityTypes = new Set(["Debt", "Credit Card", "Loan"]);
export const types = new Set(ACCOUNT_TYPES);
export const images = new Set(Array.from(types).map((type: string) => type.toLowerCase()));

export type Account = {
   account_id: string;
   name: string;
   type: string;
   image: string;
   balance: number;
   account_order: number;
   history: AccountHistory[];
}

export type AccountHistory = {
   balance: number;
   last_updated: string;
}

export const accountSchema = z.object({
   account_id: z.string().trim().uuid({
      message: "Account ID must be a valid UUID"
   }).optional(),
   name: z.string().trim().min(MIN_NAME_LENGTH, {
      message: `Name must be at least ${MIN_NAME_LENGTH} character`
   }).max(MAX_NAME_LENGTH, {
      message: `Name must be at most ${MAX_NAME_LENGTH} characters`
   }),
   balance: zodPreprocessNumber(z.coerce.number({
      message: "Balance must be a valid number"
   }).min(MIN_BALANCE, {
      message: `Balance must be at least -$${Math.abs(MIN_BALANCE).toLocaleString()}`
   }).max(MAX_BALANCE, {
      message: `Balance cannot exceed $${MAX_BALANCE.toLocaleString()}`
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
   }).max(MAX_INT, {
      message: `Account order must be at most ${MAX_INT}`
   }))
});

// One day in milliseconds for date validation
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const accountHistorySchema = z.object({
   balance: accountSchema.shape.balance,
   history_balance: accountSchema.shape.balance.optional(),
   last_updated: z.coerce.date({
      message: "Last updated must be a valid date"
   }).min(new Date("1800-01-01"), {
      message: "Update cannot be earlier than the year 1800"
   }).max(new Date(new Date().getTime() + ONE_DAY_MS), {
      message: "Update cannot be more than 1 day in the future"
   })
});
