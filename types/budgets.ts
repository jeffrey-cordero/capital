import { z } from "zod";

import { zodPreprocessNumber } from "./numerics";

/**
 * Reserved names for main budget categories
 */
const RESERVED_NAMES: readonly string[] = ["income", "expenses"];

/**
 * Schema for monthly budget goal validation
 *
 * @see {@link Budget} - Type inferred from this schema
 */
export const budgetSchema = z.object({
   /* Unique budget category identifier */
   budget_category_id: z.string().trim().uuid({
      message: "Budget category ID must be a valid UUID"
   }),

   /* Target monetary amount */
   goal: zodPreprocessNumber(z.coerce.number({
      message: "Goal must be a valid currency amount"
   }).min(0, {
      message: "Goal must be $0 or greater"
   }).max(999_999_999_999.99, {
      message: "Goal exceeds the maximum allowed value"
   })),

   /* Budget month */
   month: zodPreprocessNumber(z.coerce.number({
      message: "Month must be a valid month"
   }).int({
      message: "Month must be a whole number between 1 and 12"
   }).min(1, {
      message: "Month must be 1 or greater"
   }).max(12, {
      message: "Month must be 12 or less"
   })),

   /* Budget year */
   year: zodPreprocessNumber(z.coerce.number({
      message: "Year must be a valid number"
   }).int({
      message: "Year must be a whole number"
   }).min(1800, {
      message: "Year must be 1800 or later"
   }).max(new Date().getFullYear(), {
      message: `Year cannot be later than ${new Date().getFullYear()}`
   }))
}).refine(data => {
   // Prevent future budget entries
   const today = new Date();
   const month = today.getMonth() + 1;
   const year = today.getFullYear();

   return data.year < year || (data.year === year && data.month <= month);
}, {
   message: "Budget entries cannot be set for future months in the current year",
   path: ["month"]
});

/**
 * Schema for budget category validation
 *
 * @see {@link BudgetCategory} - Type inferred from this schema
 */
export const budgetCategorySchema = z.object({
   /* Unique user identifier */
   user_id: z.string().trim().uuid({
      message: "User ID must be a valid UUID"
   }).optional(),

   /* Unique budget category identifier */
   budget_category_id: z.string().trim().uuid({
      message: "Budget category ID must be a valid UUID"
   }),

   /* Budget category type */
   type: z.enum(['Income', 'Expenses'], {
      message: "Type must be either 'Income' or 'Expenses'"
   }),

   /* Budget category name */
   name: z.preprocess((value) => {
      if (typeof value === "string") {
         const trimmed = value.trim();

         if (RESERVED_NAMES.includes(trimmed.toLowerCase()) || trimmed.toLowerCase() === "null") {
            return "__RESERVED__";
         }

         return trimmed;
      }
      return value;
   }, z.string()
      .min(1, { message: "Name must be at least 1 character" })
      .max(30, { message: "Name must be at most 30 characters" })
      .refine(val => val !== "__RESERVED__", {
         message: "Category name cannot be 'Income', 'Expenses', or 'null'"
      }).nullable()
   ),

   /* Display sequence */
   category_order: zodPreprocessNumber(z.coerce.number({
      message: "Category order must be a valid number"
   }).int({
      message: "Category order must be a whole number"
   }).min(0, {
      message: "Category order cannot be negative"
   }).max(2_147_483_647, {
      message: "Category order exceeds maximum value"
   })).nullable()
});

/**
 * Budget category classification types
 *
 * @see {@link OrganizedBudgets} - Budget structure using these classifications
 */
export type BudgetType = "Income" | "Expenses";

/**
 * Budget period for a specific category entry
 *
 * @see {@link Budget} - Budget entry type using this period definition
 */
export type BudgetPeriod = { month: number, year: number };

/**
 * Budget goal entry excluding user identifier
 *
 * @see {@link budgetSchema} - Schema defining validation rules
 */
export type Budget = Omit<z.infer<typeof budgetSchema>, "user_id">;

/**
 * Budget amount and period without category identifier
 */
export type BudgetGoal = Omit<Budget, "budget_category_id">;

/**
 * Complete budget category with goals and metadata
 *
 * @see {@link budgetCategorySchema} - Schema defining validation rules
 */
export type BudgetCategory = Omit<z.infer<typeof budgetCategorySchema>, "user_id"> & {
   /* List of goals associated with the budget category */
   goals: BudgetGoal[];
   /* Index of the current relevant goal */
   goalIndex: number;
};

/**
 * Hierarchical budget structure for a single type (Income/Expenses)
 */
export type OrganizedBudget = {
   /* Main budget category identifier */
   budget_category_id: string;
   /* Index of the current relevant goal */
   goalIndex: number;
   /* List of goals associated with the main budget category */
   goals: BudgetGoal[];
   /* List of subcategories associated with the main budget category */
   categories: Array<BudgetCategory>;
};

/**
 * Complete budget domain model with Income and Expenses hierarchies
 *
 * @see {@link OrganizedBudget} - Type for a single budget type hierarchy
 */
export interface OrganizedBudgets {
   /* Income budget hierarchy */
   Income: OrganizedBudget;
   /* Expenses budget hierarchy */
   Expenses: OrganizedBudget;
}