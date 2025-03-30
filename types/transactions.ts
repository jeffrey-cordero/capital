import { z } from "zod";
import { zodPreprocessNumber } from "./numerics";

/**
 * Represents a transaction schema
 */
export const transactionSchema = z.object({
   transaction_id: z.string().trim().uuid({
      message: "Transaction ID must be a valid UUID"
   }).optional(),
   title: z.string().trim().min(1, {
      message: "Title must be at least 1 character"
   }).max(30, {
      message: "Title must at most 30 characters"
   }),
   amount: zodPreprocessNumber(z.coerce.number({
      message: "Amount must be a valid number"
   }).min(-999_999_999_999.99, {
      message: "Amount must be at least -$999,999,999,999.99"
   }).max(999_999_999_999.99, {
      message: "Amount cannot exceed $999,999,999,999.99"
   })),
   description: z.string().trim().max(255, {
      message: "Description must at most 255 characters"
   }).default(""),
   date: z.coerce.date({
      message: "Date must be a valid date"
   }).min(new Date("1800-01-01"), {
      message: "Date must be at least 1800-01-01"
   }).max(new Date(new Date().getTime() + (24 * 60 * 60 * 1000)), {
      message: "Date cannot be more than 1 day in the future"
   }),
   account_id: z.string().trim().uuid({
      message: "Account ID must be a valid UUID"
   }).optional(),
   budget_category_id: z.string().trim().uuid({
      message: "Budget category ID must be a valid UUID"
   }).optional(),
});

/**
 * Represents a transaction
 */
export type Transaction = Omit<z.infer<typeof transactionSchema>, "user_id">;