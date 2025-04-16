import { z } from 'zod';

import { zodPreprocessNumber } from './numerics';

/**
 * Defines the specific allowed account type strings used throughout the system.
 * @type {readonly string[]}
 */
const ACCOUNT_TYPES: string[] = [
   "Checking", "Savings", "Credit Card", "Debt",
   "Retirement", "Investment", "Loan", "Property", "Other"
] as const;

/**
 * A set containing account types classified as liabilities.
 * @type {Set<string>}
 * @see {@link ACCOUNT_TYPES}
 */
export const liabilities: Set<string> = new Set(["Debt", "Credit Card", "Loan"]);

/**
 * A set containing all valid account types defined in {@link ACCOUNT_TYPES}.
 * @type {Set<string>}
 * @see {@link ACCOUNT_TYPES}
 */
export const types: Set<string> = new Set(ACCOUNT_TYPES);

/**
 * A set of lowercase strings corresponding to the valid account types.
 * @type {Set<string>}
 * @see {@link types}
 */
export const images: Set<string> = new Set(Array.from(types).map((type: string) => type.toLowerCase()));

/**
 * Zod schema definition for validating financial account data structures.
 * This schema enforces type correctness, presence of required fields,
 * string formats (UUID, URL), numeric ranges, date constraints, and
 * restricts certain fields to predefined enum values.
 *
 * @see {@link Account} - The TypeScript type automatically inferred from this schema.
 * @see {@link ACCOUNT_TYPES} - Defines the allowed values for the `type` field.
 * @see {@link images} - Defines allowed lowercase type names for the `image` field.
 */
export const accountSchema = z.object({
   /** Unique identifier for the account (UUID - Optional) */
   account_id: z.string().trim().uuid({
      message: "Account ID must be a valid UUID"
   }).optional(),

   /** Name of the account (1-30 characters - Required) */
   name: z.string().trim().min(1, {
      message: "Name must be at least 1 character"
   }).max(30, {
      message: "Name must be at most 30 characters"
   }),

   /** Current balance of the account (number within +/- $999,999,999,999.99 - Required) */
   balance: zodPreprocessNumber(
      z.coerce.number()
         .min(-999_999_999_999.99, { message: "Balance is below the minimum allowed value" })
         .max(999_999_999_999.99, { message: "Balance exceeds the maximum allowed value" })
   ),

   /** Date and time the account information was last updated (date format - Required) */
   last_updated: z.coerce.date({
      message: "Last updated must be a valid date representation"
   }).min(new Date("1800-01-01"), {
      message: "Date must be on or after 1800-01-01"
   }).max(new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" })), {
      message: "Date cannot be in the future"
   }).transform((date) => date.toISOString()),

   /** The type classification of the account (predefined account types - Required) */
   type: z.enum(ACCOUNT_TYPES as [string, ...string[]], {
      message: `Invalid account type. Must be one of: ${ACCOUNT_TYPES.join(', ')}`
   }),

   /** Optional reference to an image for the account (URL or predefined image types - Optional) */
   image: z.enum(Array.from(images) as [string, ...string[]])
      .or(z.string().url({ message: "Image must be a valid URL" }))
      .or(z.literal(""))
      .nullable()
      .optional(),

   /** A number determining the display order of the account (non-negative number up to 2,147,483,647 - Required) */
   account_order: zodPreprocessNumber(z.coerce.number()
      .min(0, { message: "Account order cannot be negative" })
      .max(2_147_483_647, { message: "Account order exceeds maximum value" })
   )
});

/**
 * Represents the data structure for a financial account automatically inferred from the schema.
 *
 * @see {@link accountSchema} - The Zod schema defining this structure's validation rules.
 *
 * @property {string} [account_id] - Optional unique identifier (UUID format).
 * @property {string} name - Account name (1-30 characters).
 * @property {number} balance - Current numerical balance.
 * @property {string} last_updated - ISO 8601 timestamp of the last update.
 * @property {typeof ACCOUNT_TYPES[number]} type - The account's classification, matching one of the {@link ACCOUNT_TYPES}.
 * @property {string | null | undefined} [image] - Optional image reference: URL or predefined image type.
 * @property {number} account_order - Account display order.
 */
export type Account = z.infer<typeof accountSchema>;