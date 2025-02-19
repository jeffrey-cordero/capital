import { z } from 'zod';

export const images = ["property", "bank", "cash", "credit", "investment", "loan", "retirement", "savings"] as const;
export const types = ["Checking", "Savings", "Credit Card", "Retirement", "Investment", "Loan", "Property", "Other"] as const;

export type Account = {
   account_id: number | null;
   name: string;
   type: string;
   image: string;
   history: { 
      year: string; 
      month: string;
      amount: number; 
      last_updated: string;
   }[];
   account_order: number;
}

export const accountSchema = z.object({
   account_id: z.number().nullable(),
   name: z.string().min(1).max(30),
   type: z.enum(types),
   image: z.union([z.enum(images), z.string().url()]).optional(),
   history: z.array(z.object({
      year: z.string(),
      month: z.string(),
      amount: z.number(),
      last_updated: z.string().datetime()
   })),
   account_order: z.number().min(0)
});