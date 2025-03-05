import { z } from 'zod';

export const images = new Set(["property", "bank", "cash", "credit", "debt", "investment", "loan", "retirement", "savings"]);
export const decrementingTypes = new Set(["Debt", "Credit Card", "Loan"]);
export const types = new Set(["Checking", "Savings", "Credit Card", "Debt", "Retirement", "Investment", "Loan", "Property", "Other"]);

const imageRegex = /^(property|bank|cash|credit|debt|investment|loan|retirement|savings)$/;
const typeRegex = /^(Checking|Savings|Credit Card|Debt|Retirement|Investment|Loan|Property|Other)$/;

export type Account = {
   account_id: string | null;
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

export const accountHistorySchema = z.object({
   balance: z.coerce.number({
      message: "Balance must be a valid number"
   }).min(0, {
      message: "Balance must be at least $0"
   }).max(99999999999.99, {
      message: "Balance cannot exceed $99,999,999,999.99"
   }),
   last_updated: z.coerce.date().min(new Date("1800-01-01"), {
      message: "Update cannot be earlier than the year 1800"
   }).max(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), {
      message: "Update cannot be in the future"
   })
});

export const accountSchema = z.object({
   account_id: z.string().uuid().optional(),
   name: z.string().min(1, {
      message: "Name must be at least 1 character"
   }).max(30, {
      message: "Name must be at most 30 characters"
   }),
   balance: z.coerce.number({
      message: "Balance must be a valid number"
   }).min(0, {
      message: "Balance must be at least 0"
   }).max(99999999999.99, {
      message: "Balance cannot exceed 99,999,999,999.99"
   }),
   type: z.string().regex(typeRegex, {
      message: "Type must be one of: Checking, Savings, Credit Card, Retirement, Investment, Loan, Property, Other"
   }),
   image: z.string().regex(imageRegex).or(z.string().url()).or(z.literal("")).nullable().optional(),
   history: z.array(accountHistorySchema).optional()
}).passthrough();