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
   }).max(new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" })), {
      message: "Date cannot be in the future"
   }).transform((date) => date.toISOString())
});

/**
 * Financial transaction record
 *
 * @see {@link transactionSchema} - Schema defining validation rules
 */
export type Transaction = z.infer<typeof transactionSchema>;