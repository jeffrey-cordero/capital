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
   amount: z.preprocess(
      (val: any) => {
         // Preserve undefined to allow required check
         if (val === null || val === undefined) return undefined;

         // Pre-validate string inputs before zodPreprocessNumber
         if (typeof val === "string") {
            const trimmed = val.trim();

            if (trimmed === "" || isNaN(Number(trimmed))) {
               return "INVALID_NUMBER";
            }
         }

         return val;
      },
      z.union([
         z.literal(undefined).refine(() => false, {
            message: "Amount is required"
         }),
         z.literal("INVALID_NUMBER").refine(() => false, {
            message: "Amount must be a valid currency amount"
         }),
         zodPreprocessNumber(z.number()).refine((amount) => {
            const decimals = (amount.toString().split(".")[1] || "").length;

            return decimals <= 2;
         }, {
            message: "Amount must be a valid currency amount"
         }).refine((amount) => amount >= 1, {
            message: "Amount must be at least $1"
         }).refine((amount) => amount <= 999_999_999_999.99, {
            message: "Amount exceeds the maximum allowed value"
         })
      ])
   ),

   /* Simple description */
   description: z.string().trim().max(255, {
      message: "Description must be at most 255 characters"
   }).default(""),

   /* Type of the transaction */
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
         z.string().refine((val) => val === "Income" || val === "Expenses", {
            message: "Transaction type must be either Income or Expenses"
         })
      ])
   ),

   /* Date of the given transaction */
   date: z.preprocess(
      (val: any) => {
         // Preserve undefined/null for required check
         if (val === null || val === undefined) {
            return undefined;
         } else if (typeof val === "string") {
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
            message: "Date is required"
         }),
         z.literal("INVALID_DATE").refine(() => false, {
            message: "Date must be a valid date"
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
         message: "Date must be on or after 1800-01-01"
      }).refine((val) => {
         if (val === undefined || val === "INVALID_DATE") {
            return true;
         }

         const date = val as Date;
         const maxDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" }));

         return date <= maxDate;
      }, {
         message: "Date cannot be in the future"
      }).transform((val) => {
         if (val === undefined || val === "INVALID_DATE") {
            return val;
         } else {
            return val.toISOString();
         }
      })
   )
});

/**
 * Financial transaction record
 *
 * @see {@link transactionSchema} - Schema defining validation rules
 */
export type Transaction = z.infer<typeof transactionSchema>;