import { z } from "zod";

import { zodPreprocessNumber } from "./numerics";

/**
 * Common validation constants
 */
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 30;
const MAX_INT = 2_147_483_647; // Maximum PostgreSQL integer value
const CURRENT_YEAR = new Date().getUTCFullYear();
const MAX_CURRENT_MONTH = new Date().getUTCMonth() + 1;
const MAX_GOAL_AMOUNT = 999_999_999_999_999.99; // 15 digits + 2 decimals

/**
 * Reserved words that cannot be used as category names
 */
const RESERVED_WORDS = ["income", "expenses"];

/**
 * Represents a budget schema
 */
export const budgetSchema = z.object({
   budget_category_id: z.string().trim().uuid({
      message: "Budget category ID must be a valid UUID"
   }),
   goal: zodPreprocessNumber(z.coerce.number({
      message: "Goal must be a valid number"
   }).min(0, {
      message: "Goal must be at least $0"
   }).max(MAX_GOAL_AMOUNT, {
      message: "Goal cannot exceed $999,999,999,999,999.99"
   })),
   month: zodPreprocessNumber(z.coerce.number({
      message: "Month must be a valid number"
   }).min(1, {
      message: "Month must be between 1 and 12"
   }).max(12, {
      message: "Month must be between 1 and 12"
   })),
   year: zodPreprocessNumber(z.coerce.number({
      message: "Year must be a valid number"
   }).min(1800, {
      message: "Year must be at least 1800"
   }).max(CURRENT_YEAR, {
      message: "Year must be not be in a future year"
   }))
}).refine(data => data.month <= MAX_CURRENT_MONTH || data.year < CURRENT_YEAR, {
   message: "Month must not be in a future month for the current year",
   path: ["month"]
});

/**
 * Represents a budget category schema
 */
export const budgetCategorySchema = z.object({
   user_id: z.string().trim().uuid({
      message: "User ID must be a valid UUID"
   }).optional(),
   budget_category_id: z.string().trim().uuid({
      message: "Budget category ID must be a valid UUID"
   }),
   type: z.enum(['Income', 'Expenses'], {
      message: "Type must be either Income or Expenses"
   }),
   name: z.preprocess((value) => {
      if (typeof value === "string") {
         const trimmed = value.trim();
         
         if (RESERVED_WORDS.includes(trimmed.toLowerCase()) || trimmed === "null") {
            // Return a special error indicator
            return "__RESERVED__"; 
         }
         
         return trimmed;
      } else {
         // Non-main budget categories name must be a string
         return undefined;
      }
   }, z.string()
      .trim()
      .refine(val => val !== "__RESERVED__", {
         message: "Name cannot be a null or a reserved word (Income or Expenses)"
      })
      .refine(val => val.length >= MIN_NAME_LENGTH && val.length <= MAX_NAME_LENGTH, {
         message: `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`
      })
      .nullable()
   ),
   category_order: zodPreprocessNumber(z.coerce.number({
      message: "Category order must be a valid number"
   }).min(0, {
      message: "Category order must be at least 0"
   }).max(MAX_INT, {
      message: "Category order must be at most 2,147,483,647"
   })).nullable()
});

/**
 * Represents the type of a budget
 */
export type BudgetType = "Income" | "Expenses";

/**
 * Represents the period of a budget
 */
export type BudgetPeriod = { month: number, year: number };

/**
 * Represents a budget with basic details for the specified period
 */
export type Budget = Omit<z.infer<typeof budgetSchema>, "user_id">;

/**
 * Represents a budget goal
 */
export type BudgetGoal = Omit<Budget, "budget_category_id">;

/**
 * Represents a budget category basic details with goals for the specified periods
 */
export type BudgetCategory = Omit<z.infer<typeof budgetCategorySchema>, "user_id"> & { goals: BudgetGoal[], goalIndex: number };

/**
 * Represents an organized budget
 */
export type OrganizedBudget = {
   goalIndex: number;
   goals: BudgetGoal[];
   budget_category_id: string;
   categories: Array<BudgetCategory>;
};

/**
 * Represents a collection of organized budgets (Income and Expenses) with current period tracking
 */
export interface OrganizedBudgets {
   Income: OrganizedBudget;
   Expenses: OrganizedBudget;
}