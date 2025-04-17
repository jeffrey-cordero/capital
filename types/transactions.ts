import { z } from "zod";
import { zodPreprocessNumber } from "./numerics";

/**
 * Robust schema for financial transactions with comprehensive rules, which
 * enforces strict type safety and business logic constraints for all transaction data
 * including monetary validation, temporal boundaries, and referential integrity.
 *
 * @see {@link Transaction} - The type inferred from this schema.
 */
export const transactionSchema = z.object({
   /** Unique transaction identifier (UUID) */
   transaction_id: z.string().trim().uuid({
      message: "Transaction ID must be a valid UUID"
   }).optional(),

   /** Budget category identifier (UUID) */
   budget_category_id: z.string().trim().uuid({
      message: "Budget category ID must be a valid UUID"
   }).or(z.literal("")).optional(),

   /** Financial account identifier (UUID) */
   account_id: z.string().trim().uuid({
      message: "Account ID must be a valid UUID"
   }).or(z.literal("")).optional(),

   /** Monetary amount with strict range validation */
   amount: zodPreprocessNumber(z.coerce.number({
      message: "Amount must be a valid currency amount"
   }).min(-999_999_999_999.99, {
      message: "Amount is below the minimum allowed value"
   }).max(999_999_999_999.99, {
      message: "Amount exceeds the maximum allowed value"
   })).refine((amount) => amount !== 0, {
      message: "Amount cannot be $0"
   }),

   /** Transaction description with length constraints */
   description: z.string().trim().max(255, {
      message: "Description must be at most 255 characters"
   }).default(""),

   /** Transaction date with historical and future bounds protection */
   date: z.coerce.date({
      message: "Date must be a valid date"
   }).min(new Date("1800-01-01"), {
      message: "Date must be on or after 1800-01-01"
   }).max(new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" })),{
      message: "Date cannot be in the future"
   }).transform((date) => date.toISOString()),
});

/**
 * Type definition for a financial transaction record automatically inferred from the validation schema.
 *
 * @see {@link transactionSchema} - The Zod schema defining this structure's validation rules.
 */
export type Transaction = z.infer<typeof transactionSchema>;