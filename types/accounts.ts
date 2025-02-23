import { z } from 'zod';

export const images = ["property", "bank", "cash", "credit", "investment", "loan", "retirement", "savings"] as const;
export const types = ["Checking", "Savings", "Credit Card", "Retirement", "Investment", "Loan", "Property", "Other"] as const;

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
   balance: z.number(),
   last_updated: z.string(),
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
   type: z.enum(types),
   image: z.union([z.enum(images), z.string().url()]).optional(),
   history: z.array(accountHistorySchema).optional(),
   account_order: z.coerce.number().min(0, {
      message: "Account order must be at least 0"
   })
});