import { z } from "zod";

export const budgetSchema = z.object({
   user_id: z.string().uuid(),
   budget_category_id: z.string().uuid().optional(),
   type: z.enum(['Income', 'Expenses'], {
      message: "Type must be either Income or Expenses"
   }),
   goal: z.number().min(0, {
      message: "Goal must be at least $0"
   }),
   month: z.number().min(1, {
      message: "Month must be between 1 and 12"
   }).max(12, {
      message: "Month must be between 1 and 12"
   }),
   year: z.number().min(1800, {
      message: "Year must be at least 1800"
   }).max(new Date().getFullYear(), {
      message: "Year must be less than or equal to the current year"
   })
});

export const budgetCategorySchema = z.object({
   user_id: z.string().uuid(),
   budget_category_id: z.string().uuid(),
   type: budgetSchema.shape.type,
   name: z.string().min(1, {
      message: "Name must be at least 1 character"
   }).max(30, {
      message: "Name must be less than 30 characters"
   }),
   category_order: z.number().min(0, {
      message: "Category order must be at least 0"
   })
});

export type BudgetType = "Income" | "Expenses";
export type Budget = z.infer<typeof budgetSchema>;
export type BudgetCategory = z.infer<typeof budgetCategorySchema>;
