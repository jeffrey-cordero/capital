import { z } from "zod";

import { zodPreprocessNumber } from "./numerics";

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
export const LIABILITIES: Set<string> = new Set(["Debt", "Credit Card", "Loan"]);

/**
 * All supported account types for efficient lookups
 *
 * @see {@link Account} - Account type using these definitions
 */
export const TYPES: Set<string> = new Set(ACCOUNT_TYPES);

/**
 * Lowercase account types for client-side image mapping
 *
 * @see {@link Account} - Account type using these image mappings
 */
export const IMAGES: Set<string> = new Set(Array.from(TYPES).map((type: string) => type.toLowerCase()));

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
   name: z.string({
      message: "Name is required"
   }).trim().min(1, {
      message: "Name must be at least 1 character"
   }).max(30, {
      message: "Name must be at most 30 characters"
   }),

   /* Current monetary balance */
   balance: z.preprocess(
      (val: any) => {
         // Preserve undefined to allow required check
         if (val === null || val === undefined) return undefined;

         return val;
      },
      z.union([
         z.literal(undefined).refine(() => false, {
            message: "Balance is required"
         }),
         zodPreprocessNumber(
            z.coerce.number({
               message: "Balance must be a valid currency amount"
            }).min(-999_999_999_999.99, {
               message: "Balance is below the minimum allowed value"
            }).max(999_999_999_999.99, {
               message: "Balance exceeds the maximum allowed value"
            })
         )
      ])
   ),

   /* Last update timestamp */
   last_updated: z.preprocess(
      (val: any) => {
         // Preserve undefined/null for required check
         if (val === null || val === undefined) {
            return undefined;
         } else if  (typeof val === "string") {
            // Handle the empty string case
            const trimmed = val.trim();

            if (trimmed === "") {
               return undefined;
            }

            // Handle the invalid date representation case
            const date = new Date(trimmed);

            if (isNaN(date.getTime())) {
               return "INVALID_DATE";
            }

            return date;
         } else {
            return val;
         }
      },
      z.union([
         z.literal(undefined).refine(() => false, {
            message: "Last updated is required"
         }),
         z.literal("INVALID_DATE").refine(() => false, {
            message: "Last updated must be a valid date"
         }),
         z.date()
      ]).refine((val) => {
         if (val === undefined || val === "INVALID_DATE") {
            return true;
         }

         const date = val as Date;
         const minDate = new Date("1800-01-01");

         return date >= minDate;
      }, {
         message: "Last updated must be on or after 1800-01-01"
      }).refine((val) => {
         if (val === undefined || val === "INVALID_DATE") {
            return true;
         }

         const date = val as Date;
         const maxDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" }));

         return date <= maxDate;
      }, {
         message: "Last updated cannot be in the future"
      }).transform((val) => {
         if (val === undefined || val === "INVALID_DATE") {
            return val;
         } else {
            return val.toISOString();
         }
      })
   ),

   /* Account classification */
   type: z.preprocess(
      (val: any) => {
         // Preserve undefined to allow required check
         if (val === null || val === undefined) return undefined;

         return val;
      },
      z.union([
         z.literal(undefined).refine(() => false, {
            message: "Type is required"
         }),
         z.string().refine((val) => ACCOUNT_TYPES.includes(val), {
            message: `Account type must be one of the following: ${ACCOUNT_TYPES.join(", ")}`
         })
      ])
   ),

   /* Visual account representation */
   image: z.enum(Array.from(IMAGES) as [string, ...string[]]).or(z.string().url({
      message: "Image must be a valid URL"
   })).or(z.literal("")).nullable().optional(),

   /* Display priority */
   account_order: z.preprocess(
      (val: any) => {
         // Preserve undefined to allow required check
         if (val === null || val === undefined) return undefined;

         return val;
      },
      z.union([
         z.literal(undefined).refine(() => false, {
            message: "Account order is required"
         }),
         zodPreprocessNumber(z.coerce.number({
            message: "Account order must be a valid number"
         }).int({
            message: "Account order must be an integer"
         }).min(0, {
            message: "Account order cannot be negative"
         }).max(2_147_483_647, {
            message: "Account order exceeds maximum value"
         }))
      ])
   )
});

/**
 * Financial account type definition
 *
 * @see {@link accountSchema} - Schema defining validation rules
 */
export type Account = z.infer<typeof accountSchema>;