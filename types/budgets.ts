import { z } from "zod";

import { zodPreprocessNumber } from "./numerics";

/**
 * Reserved words (case-insensitive) for budget system integrity
 */
const RESERVED_NAMES: readonly string[] = ["income", "expenses"];

/**
 * Robust schema for monthly budget goals with comprehensive validation, which
 * ensures data integrity with strict validation for identifiers, numeric values,
 * and temporal constraints preventing impossible budget configurations.
 *
 * @see {@link Budget} - The type inferred from this schema.
 */
export const budgetSchema = z.object({
   /** Unique budget category identifier (UUID) */
   budget_category_id: z.string().trim().uuid({
      message: "Budget category ID must be a valid UUID"
   }),

   /** Target monetary amount with range protection (0-999B) */
   goal: zodPreprocessNumber(z.coerce.number({
      message: "Goal must be a valid number"
   }).min(0, {
      message: "Goal must be $0 or greater"
   }).max(999_999_999_999.99, {
      message: "Goal exceeds the maximum allowed value"
   })),

   /** Target month with historical and future bounds (1-12) */
   month: zodPreprocessNumber(z.coerce.number({
      message: "Month must be a valid number"
   }).int({
      message: "Month must be a whole number between 1 and 12"
   }).min(1, {
      message: "Month must be 1 or greater"
   }).max(12, {
      message: "Month must be 12 or less"
   })),

   /** Target year with historical and future bounds (1800-present) */
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
   // Protection against future budget entries
   const today = new Date();
   const month = today.getMonth() + 1;
   const year = today.getFullYear();

   return data.year < year || (data.year === year && data.month <= month);
}, {
   message: "Budget entries cannot be set for future months in the current year",
   path: ["month"]
});

/**
 * Robust schema for budget categories with data integrity safeguards, which
 * enforces consistent naming, type classification, and order sequencing
 * with protection against reserved names and invalid inputs.
 *
 * @see {@link BudgetCategory} - The type inferred from this schema.
 */
export const budgetCategorySchema = z.object({
   /** Unique user identifier (UUID) */
   user_id: z.string().trim().uuid({
      message: "User ID must be a valid UUID"
   }).optional(),

   /** Unique budget category identifier (UUID) */
   budget_category_id: z.string().trim().uuid({
      message: "Budget category ID must be a valid UUID"
   }),

   /** Income/Expenses classification */
   type: z.enum(['Income', 'Expenses'], {
      message: "Type must be either 'Income' or 'Expenses'"
   }),

   /** Budget category identifier with reserved word protection (1-30 characters) */
   name: z.preprocess((value) => {
      if (typeof value === "string") {
         const trimmed = value.trim();

         if (RESERVED_NAMES.includes(trimmed.toLowerCase()) || trimmed.toLowerCase() === "null") {
            // Reserved for main categories
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
      })
      .nullable()
   ),

   /** Display sequence with integer validation (0-2B) */
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
 */
export type BudgetType = "Income" | "Expenses";

/**
 * Represents the budget period for a budget entry to a respective budget category
 */
export type BudgetPeriod = { month: number, year: number };

/**
 * Represents budget goal entry excluding user identifier inferred from the validation schema
 *
 * @see {@link budgetSchema} - The Zod schema defining this structure's validation rules.
 */
export type Budget = Omit<z.infer<typeof budgetSchema>, "user_id">;

/**
 * Represents budget amount and period without the unique budget category identifier
 */
export type BudgetGoal = Omit<Budget, "budget_category_id">;

/**
 * Represents complete budget category with associated goals and metadata, which
 * combines core category information with temporal goal entries and
 * tracking of current goal relevance with properties inferred from the
 * validation schema.
 *
 * @see {@link budgetCategorySchema} - The Zod schema defining this structure's validation rules.
 */
export type BudgetCategory = Omit<z.infer<typeof budgetCategorySchema>, "user_id"> & {
   /** List of goals associated with the budget category */
   goals: BudgetGoal[];
   /** Index of the current relevant goal */
   goalIndex: number;
};

/**
 * Represents hierarchical budget structure for a single type (Income/Expenses), which
 * organizes parent category with all subcategories and their respective goals.
 */
export type OrganizedBudget = {
   /** Unique budget category identifier (UUID) */
   budget_category_id: string;
   /** Index of the current relevant goal */
   goalIndex: number;
   /** List of goals associated with the main budget category */
   goals: BudgetGoal[];
   /** List of subcategories associated with the main budget category */
   categories: Array<BudgetCategory>;
};

/**
 * Represents complete budget domain model with Income and Expenses hierarchies, which
 * represents the entire budget system organization.
 *
 * @see {@link OrganizedBudget} - The type for a single budget type hierarchy.
 */
export interface OrganizedBudgets {
   /** Income budget hierarchy */
   Income: OrganizedBudget;
   /** Expenses budget hierarchy */
   Expenses: OrganizedBudget;
}