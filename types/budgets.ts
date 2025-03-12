import { z } from "zod";
import { zodPreprocessNumber } from "./numerics";

export const budgetSchema = z.object({
   budget_category_id: z.string().uuid(),
   goal: zodPreprocessNumber(z.coerce.number({
      message: "Goal must be a valid number"
   }).min(0, {
      message: "Goal must be at least $0"
   }).max(999_999_999_999_999.99, {
      message: "Goal cannot exceed $999,999,999,999,999.99"
   })),
   month: zodPreprocessNumber(z.coerce.number().min(1, {
      message: "Month must be between 1 and 12"
   }).max(12, {
      message: "Month must be between 1 and 12"
   })),
   year: zodPreprocessNumber(z.coerce.number().min(1800, {
      message: "Year must be at least 1800"
   }).max(new Date().getUTCFullYear(), {
      message: "Year must be less than or equal to the current year"
   }))
});

export const budgetCategorySchema = z.object({
   user_id: z.string().uuid().optional(),
   budget_category_id: z.string().uuid(),
   type: z.enum(['Income', 'Expenses'], {
      message: "Type must be either Income or Expenses"
   }),
   name: z.preprocess((value) => {
      if (typeof value === "string" && (value.trim() === "Income" || value.trim() === "Expenses")) {
         return undefined; // Block reserved names
      }

      return value === null ? null : String(value);
   }, z.string()
      .min(1, { message: "Name must be at least 1 character" })
      .max(30, { message: "Name must be less than 30 characters" })
      .nullable()
   ),
   category_order: zodPreprocessNumber(z.coerce.number().min(0, {
      message: "Category order must be at least 0"
   }).max(2_147_483_647, {
      message: "Category order must be at most 2,147,483,647"
   })).nullable()
});

export type BudgetType = "Income" | "Expenses";
export type Budget = Omit<z.infer<typeof budgetSchema>, "user_id">;
export type BudgetCategory = Omit<z.infer<typeof budgetCategorySchema>, "user_id">;

export interface OrganizedBudgets {
   Income: {
      goals: Budget[];
      categories: Array<[BudgetCategory, Budget[]]>;
   };
   Expenses: {
      goals: Budget[];
      categories: Array<[BudgetCategory, Budget[]]>;
   };
}