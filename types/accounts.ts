import { z } from 'zod';

export const liabilityTypes = new Set(["Debt", "Credit Card", "Loan"]);
export const types = new Set(["Checking", "Savings", "Credit Card", "Debt", "Retirement", "Investment", "Loan", "Property", "Other"]);
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
   account_id: z.string().uuid().optional(),
   name: z.string().min(1, {
      message: "Name must be at least 1 character"
   }).max(30, {
      message: "Name must be at most 30 characters"
   }),
   balance: z.preprocess((value) => {
      if (typeof value === "string" && (value.trim() === "" || isNaN(Number(value)))) {
         return NaN; // Force validation failure for non-numeric strings
      } else {
         return Number(value); // Otherwise, return the original value
      }
   },z.number({
      message: "Balance must be a valid number"
   }).min(-99_999_999_999.99, {
      message: "Balance must be at least -$99,999,999,999.99"
   }).max(99_999_999_999.99, {
      message: "Balance cannot exceed $99,999,999,999.99"
   })),
   type: z.enum(Array.from(types) as any, {
      message: "Type must be one of: Checking, Savings, Credit Card, Debt, Retirement, Investment, Loan, Property, Other"
   }),
   image: z.enum(Array.from(images) as any).or(z.string().url()).or(z.literal("")).nullable().optional(),
   account_order: z.coerce.number().min(0, {
      message: "Account order must be at least 0"
   }).max(2_147_483_647, {
      message: "Account order must be at most 2,147,483,647"
   })
});

export const accountHistorySchema = z.object({
   balance: accountSchema.shape.balance,
   history_balance: accountSchema.shape.balance.optional(),
   last_updated: z.coerce.date({
      message: "Last updated must be a valid date"
   }).min(new Date("1800-01-01"), {
      message: "Update cannot be earlier than the year 1800"
   }).max(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), {
      message: "Update cannot be in the future"
   })
});
