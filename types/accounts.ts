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
 * Account types representing financial liabilities, which
 * categorizes accounts with negative expected balances.
 *
 * @see {@link Account} - The account type these liabilities are part of.
 */
export const liabilities: Set<string> = new Set(["Debt", "Credit Card", "Loan"]);

/**
 * All supported account types defined as a Set for efficient lookups, which
 * provides constant-time membership testing for account type validation.
 *
 * @see {@link Account} - The account type using these type definitions.
 */
export const types: Set<string> = new Set(ACCOUNT_TYPES);

/**
 * Lowercase account types for client-side image mapping, which
 * enables consistent visual representation across the application.
 *
 * @see {@link Account} - The account type using these image mappings.
 */
export const images: Set<string> = new Set(Array.from(types).map((type: string) => type.toLowerCase()));

/**
 * Robust schema for financial account validation with comprehensive rules, which
 * enforces strict type safety and business logic constraints for all account data
 * including format validation, numeric boundaries, and temporal validations.
 *
 * @see {@link Account} - The type inferred from this schema.
 */
export const accountSchema = z.object({
   /** Unique account identifier (UUID) */
   account_id: z.string().trim().uuid({
      message: "Account ID must be a valid UUID"
   }).optional(),

   /** Account display name (1-30 characters) */
   name: z.string().trim().min(1, {
      message: "Name must be at least 1 character"
   }).max(30, {
      message: "Name must be at most 30 characters"
   }),

   /** Current monetary balance with strict range validation (-999B to 999B) */
   balance: zodPreprocessNumber(
      z.coerce.number().min(-999_999_999_999.99, {
         message: "Balance is below the minimum allowed value"
      }).max(999_999_999_999.99, {
         message: "Balance exceeds the maximum allowed value"
      })
   ),

   /** Last update timestamp with validation against future dates (1800-present) */
   last_updated: z.coerce.date({
      message: "Last updated must be a valid date representation"
   }).min(new Date("1800-01-01"), {
      message: "Last updated must be on or after 1800-01-01"
   }).max(new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" })), {
      message: "Last updated cannot be in the future"
   }).transform((date) => date.toISOString()),

   /** Account classification from predefined types */
   type: z.enum(ACCOUNT_TYPES as [string, ...string[]], {
      message: `Invalid account type. Must be one of: ${ACCOUNT_TYPES.join(', ')}`
   }),

   /** Visual representation reference (predefined type or custom URL) */
   image: z.enum(Array.from(images) as [string, ...string[]]).or(z.string().url({
      message: "Image must be a valid URL"
   })).or(z.literal("")).nullable().optional(),

   /** Display priority with bounds protection (0-2B) */
   account_order: zodPreprocessNumber(z.coerce.number().int({
      message: "Account order must be an integer"
   }).min(0, {
      message: "Account order cannot be negative"
   }).max(2_147_483_647, {
      message: "Account order exceeds maximum value"
   }))
});

/**
 * Represents the type of a financial account inferred from the validation schema.
 *
 * @see {@link accountSchema} - The Zod schema defining this structure's validation rules.
 */
export type Account = z.infer<typeof accountSchema>;