import {
   Budget,
   BudgetCategory,
   budgetCategorySchema,
   budgetSchema,
   OrganizedBudgets
} from "capital/budgets";
import { ServerResponse } from "capital/server";
import { z } from "zod";

import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as budgetsRepository from "@/repository/budgetsRepository";

/**
 * Cache duration in seconds for user budgets (30 minutes)
 */
const BUDGET_CACHE_DURATION = 30 * 60;

/**
 * Helper function to generate budgets cache key
 *
 * @param {string} user_id - User ID
 * @returns {string} Budgets cache key
 * @description
 * - Generates a cache key for the budgets data based on the user ID (budgets:${user_id})
 */
const getBudgetsCacheKey = (user_id: string): string => `budgets:${user_id}`;

/**
 * Helper function to clear budget cache on successful budget updates
 *
 * @param {string} user_id - User ID
 * @description
 * - Removes the budget cache key from Redis
 */
const clearBudgetCache = (user_id: string): void => {
   removeCacheValue(getBudgetsCacheKey(user_id));
};

/**
 * Fetches budgets from cache or database and returns them as a server response
 *
 * @param {string} user_id - User ID
 * @returns {Promise<ServerResponse>} Server response - 200 (OrganizedBudgets)
 * @description
 * - Fetches budgets from cache or database and returns them as a server response
 * - Writes most recent data to cache if budgets are fetched from the database
 */
export async function fetchBudgets(user_id: string): Promise<ServerResponse> {
   // Try to get from cache first for better performance
   const cacheKey = getBudgetsCacheKey(user_id);
   const cache = await getCacheValue(cacheKey);

   if (cache) {
      return sendServiceResponse(200, "Budgets", JSON.parse(cache) as OrganizedBudgets);
   }

   // Cache miss - fetch from repository and store in cache
   const result: OrganizedBudgets = await budgetsRepository.findByUserId(user_id);
   setCacheValue(cacheKey, BUDGET_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(200, "Budgets", result);
}

/**
 * Creates a new budget category
 *
 * @param {string} user_id - User ID
 * @param {Budget & BudgetCategory} category - Budget category object
 * @returns {Promise<ServerResponse>} Server response - 201 ({ budget_category_id: string }) or 400 (errors: Record<string, string>)
 * @description
 * - Validates the budget and category fields against the budget category schema
 * - Creates new budget category and initial budget records
 * - Invalidates cache to ensure fresh data on next fetch
 */
export async function createBudgetCategory(user_id: string, category: Budget & BudgetCategory): Promise<ServerResponse> {
   // Validate budget and category fields using schema separately to ensure Zod refines are applied
   const budgetFields = budgetSchema.safeParse(category);

   if (!budgetFields.success) {
      return sendValidationErrors(budgetFields, "Invalid budget fields");
   }

   const categoryFields = budgetCategorySchema.safeParse(category);

   if (!categoryFields.success) {
      return sendValidationErrors(categoryFields, "Invalid budget category fields");
   }

   // Create category and initial budget
   const result = await budgetsRepository.createCategory(user_id, category);

   // Invalidate cache to ensure fresh data on next fetch
   clearBudgetCache(user_id);
   return sendServiceResponse(201, "Budget category created", { budget_category_id: result });
}

/**
 * Updates a budget category
 *
 * @param {string} user_id - User ID
 * @param {Partial<BudgetCategory>} category - Budget category object
 * @returns {Promise<ServerResponse>} Server response - 204 (no content) or 400 (errors: Record<string, string>) or 404 ({budget_category_id: string}) or 409 ({budget_category_id: string})
 * @description
 * - Validates the budget category fields
 * - Updates the budget category
 * - Invalidates cache to ensure fresh data on next fetch
 */
export async function updateCategory(user_id: string, category: Partial<BudgetCategory>): Promise<ServerResponse> {
   // Validate required category ID first for early return
   if (!category.budget_category_id) {
      return sendValidationErrors(null, "Invalid budget category fields",
         { budget_category_id: "Budget category ID is required" }
      );
   }

   // Validate category data structure
   const fields = budgetCategorySchema.partial().safeParse(category);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid budget category fields");
   } else if (category.name === null) {
      return sendValidationErrors(null, "Invalid budget category fields",
         { name: "Budget category name can't be null" }
      );
   }

   // Attempt to update the category
   const result = await budgetsRepository.updateCategory(category);

   // Handle different update scenarios
   switch (result) {
      case "failure":
         return sendServiceResponse(404, "Budget category not found", undefined,
            { budget_category_id: "Budget category does not exist based on the provided ID" }
         );
      case "no_updates":
         return sendServiceResponse(204);
      case "main_category_conflict":
         return sendServiceResponse(409, "Budget category conflicts", undefined,
            { budget_category_id: "Main budget categories (Income/Expenses) can't be updated" }
         );
      case "success":
         clearBudgetCache(user_id);
         return sendServiceResponse(204);
      default:
         return sendServiceResponse(500, "Unexpected error updating budget category");
   }
}

/**
 * Updates the ordering of budget categories
 *
 * @param {string} user_id - User ID
 * @param {string[]} categoryIds - Array of category IDs
 * @returns {Promise<ServerResponse>} Server response - 204 (no content) or 400 (errors: Record<string, string>) or 404 ({categories: string})
 * @description
 * - Validates the category IDs array
 * - Updates the ordering of budget categories
 * - Invalidates cache to ensure fresh data on next fetch
 */
export async function updateCategoryOrdering(user_id: string, categoryIds: string[]): Promise<ServerResponse> {
   // Validate category IDs array
   if (!Array.isArray(categoryIds) || !categoryIds.length) {
      return sendValidationErrors(null, "Invalid category ordering fields",
         { categories: "Category ID array must be non-empty" }
      );
   }

   // Validate each UUID and create updates array
   const uuidSchema = z.string().trim().uuid();
   const updates: Partial<BudgetCategory>[] = [];

   for (let i = 0; i < categoryIds.length; i++) {
      const categoryId = categoryIds[i];

      if (!uuidSchema.safeParse(categoryId).success) {
         return sendValidationErrors(null, "Invalid category ordering fields",
            { budget_category_id: `Category ID must be a valid UUID: '${categoryId}'` }
         );
      }

      updates.push({ budget_category_id: categoryId, category_order: i });
   }

   // Update category ordering in database
   const result = await budgetsRepository.updateCategoryOrderings(user_id, updates);

   if (!result) {
      return sendServiceResponse(404, "Invalid category ordering", undefined,
         { categories: "No possible ordering updates based on provided category IDs" }
      );
   }

   // Success - invalidate cache and return success response
   clearBudgetCache(user_id);
   return sendServiceResponse(204);
}

/**
 * Creates a new budget
 *
 * @param {string} user_id - User ID
 * @param {Budget} budget - Budget object
 * @returns {Promise<ServerResponse>} Server response - 201 ({ success: true }) or 204 (no content) or 400 (errors: Record<string, string>) or 404 ({budget_category_id: string})
 * @description
 * - Validates the budget fields
 * - Creates a new budget or updates an existing one following the UPSERT pattern
 * - Invalidates cache to ensure fresh data on next fetch
 */
export async function createBudget(user_id: string, budget: Budget): Promise<ServerResponse> {
   // Validate budget fields
   const fields = budgetSchema.safeParse(budget);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid budget fields");
   }

   // Create or update budget
   const result = await budgetsRepository.createBudget(budget);

   if (result === "failure") {
      return sendServiceResponse(404, "Budget category not found", undefined,
         { budget_category_id: "No budget category found based on the provided budget category ID" }
      );
   }

   // Invalidate cache to ensure fresh data on next fetch
   clearBudgetCache(user_id);

   // Return appropriate status code based on whether a new budget was created or an existing one was updated
   return result === "created"
      ? sendServiceResponse(201, "Budget created successfully", { success: true })
      : sendServiceResponse(204);
}

/**
 * Updates a budget
 *
 * @param {string} user_id - User ID
 * @param {Budget} budget - Budget object
 * @returns {Promise<ServerResponse>} Server response - 204 (no content) or 400 (errors: Record<string, string>) or 404 ({budget_category_id: string})
 * @description
 * - Validates the budget fields
 * - Updates the budget
 * - Invalidates cache to ensure fresh data on next fetch
 */
export async function updateBudget(user_id: string, budget: Budget): Promise<ServerResponse> {
   // Validate budget fields
   const fields = budgetSchema.safeParse(budget);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid budget fields");
   }

   // Update budget
   const result = await budgetsRepository.updateBudget(budget);

   if (!result) {
      return sendServiceResponse(404, "Budget not found", undefined,
         { budget_category_id: "Budget does not exist based on the provided year, month, and budget category ID" }
      );
   }

   // Success - invalidate cache and return success response
   clearBudgetCache(user_id);
   return sendServiceResponse(204);
}

/**
 * Deletes a budget category
 *
 * @param {string} user_id - User ID
 * @param {string} budget_category_id - Budget category ID
 * @returns {Promise<ServerResponse>} Server response - 204 (no content) or 400 ({budget_category_id: string}) or 404 ({budget_category_id: string})
 * @description
 * - Validates the budget category ID
 * - Deletes the budget category
 * - Invalidates cache to ensure fresh data on next fetch
 */
export async function deleteCategory(user_id: string, budget_category_id: string): Promise<ServerResponse> {
   // Validate category ID
   const uuidSchema = z.string().trim().uuid();

   if (!uuidSchema.safeParse(budget_category_id).success) {
      return sendValidationErrors(null, "Invalid budget category fields",
         { budget_category_id: `Category ID must be a valid UUID: '${budget_category_id}'` }
      );
   }

   // Delete category
   const result = await budgetsRepository.deleteCategory(user_id, budget_category_id);

   if (!result) {
      return sendServiceResponse(404, "Budget category not found", undefined,
         { budget_category_id: "Budget category does not exist based on the provided budget category ID" }
      );
   }

   // Success - invalidate cache and return success response
   clearBudgetCache(user_id);
   return sendServiceResponse(204);
}