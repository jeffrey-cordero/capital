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
 * Helper function to generate budgets cache key.
 *
 * @param {string} user_id - User ID
 * @returns {string} Budgets cache key
 */
const getBudgetsCacheKey = (user_id: string): string => `budgets:${user_id}`;

/**
 * Helper function to clear budget cache on successful budget updates.
 *
 * @param {string} user_id - User ID
 */
const clearBudgetCache = (user_id: string): void => {
   removeCacheValue(getBudgetsCacheKey(user_id));
};

/**
 * Helper function to send a successful update response.
 *
 * @param {string} user_id - User ID
 * @returns {Promise<ServerResponse>} A server response of `204` (no content)
 */
const clearCacheOnSuccess = (user_id: string): ServerResponse => {
   // Invalidate cache to ensure fresh data on next fetch
   clearBudgetCache(user_id);
   return sendServiceResponse(204);
};

/**
 * Fetches budgets from cache or database and returns them as a server response.
 *
 * @param {string} user_id - User ID
 * @returns {Promise<ServerResponse>} A server response of `200` (`OrganizedBudgets`)
 */
export async function fetchBudgets(user_id: string): Promise<ServerResponse> {
   // Try to get from cache first
   const key: string = getBudgetsCacheKey(user_id);
   const cache: string | null = await getCacheValue(key);

   if (cache) {
      return sendServiceResponse(200, "Budgets", JSON.parse(cache) as OrganizedBudgets);
   }

   // Cache miss - fetch from repository and store in cache
   const result: OrganizedBudgets = await budgetsRepository.findByUserId(user_id);
   setCacheValue(key, BUDGET_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(200, "Budgets", result);
}

/**
 * Creates a new budget category with initial budget records.
 *
 * @param {string} user_id - User ID
 * @param {Budget & BudgetCategory} category - Budget category object
 * @returns {Promise<ServerResponse>} A server response of `201` (`{ budget_category_id: string }`) or `400` with respective errors
 */
export async function createBudgetCategory(user_id: string, category: Budget & BudgetCategory): Promise<ServerResponse> {
   // Validate budget and category fields against their respective schemas
   const budgetFields = budgetSchema.safeParse(category);

   if (!budgetFields.success) {
      return sendValidationErrors(budgetFields, "Invalid budget fields");
   }

   const categoryFields = budgetCategorySchema.safeParse(category);

   if (!categoryFields.success) {
      return sendValidationErrors(categoryFields, "Invalid budget category fields");
   }

   // Create category and initial budget
   const result = await budgetsRepository.createCategory(user_id, { ...categoryFields.data, ...budgetFields.data } as Budget & BudgetCategory);

   // Invalidate cache to ensure fresh data on next fetch
   clearBudgetCache(user_id);
   return sendServiceResponse(201, "Budget category created", { budget_category_id: result });
}

/**
 * Updates a budget category.
 *
 * @param {string} user_id - User ID
 * @param {Partial<BudgetCategory>} category - Budget category object
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404`/`409` with respective errors
 */
export async function updateCategory(user_id: string, category: Partial<BudgetCategory>): Promise<ServerResponse> {
   if (!category.budget_category_id) {
      return sendValidationErrors(null, "Invalid budget category fields",
         { budget_category_id: "Budget category ID is required" }
      );
   }

   // Validate input against its partial schema
   const fields = budgetCategorySchema.partial().safeParse(category);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid budget category fields");
   } else if (category.name === null) {
      return sendValidationErrors(null, "Invalid budget category fields",
         { name: "Budget category name can't be null" }
      );
   }

   // Attempt to update the category
   const result = await budgetsRepository.updateCategory(fields.data as Partial<BudgetCategory>);

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
         return clearCacheOnSuccess(user_id);
      default:
         return sendServiceResponse(500, "Unexpected error updating budget category");
   }
}

/**
 * Updates the ordering of budget categories.
 *
 * @param {string} user_id - User ID
 * @param {string[]} categoryIds - Array of category IDs
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404` with respective errors
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
      const uuidFields = uuidSchema.safeParse(categoryId);

      if (!uuidFields.success) {
         return sendValidationErrors(null, "Invalid category ordering fields",
            { budget_category_id: `Category ID must be a valid UUID: '${categoryId}'` }
         );
      }

      updates.push({ budget_category_id: uuidFields.data, category_order: i });
   }

   // Update category ordering in database
   const result = await budgetsRepository.updateCategoryOrderings(user_id, updates);

   if (!result) {
      return sendServiceResponse(404, "Invalid category ordering", undefined,
         { categories: "No possible ordering updates based on provided category IDs" }
      );
   }

   return clearCacheOnSuccess(user_id);
}

/**
 * Creates a new budget.
 *
 * @param {string} user_id - User ID
 * @param {Budget} budget - Budget object
 * @returns {Promise<ServerResponse>} A server response of `201` (`{ success: true }`) or `400`/`404` with respective errors
 */
export async function createBudget(user_id: string, budget: Budget): Promise<ServerResponse> {
   // Validate input against its schema
   const fields = budgetSchema.safeParse(budget);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid budget fields");
   }

   // Create or update budget
   const result = await budgetsRepository.createBudget(fields.data as Budget);

   if (result === "failure") {
      return sendServiceResponse(404, "Budget category not found", undefined,
         { budget_category_id: "No budget category found based on the provided budget category ID" }
      );
   }

   // Invalidate cache to ensure fresh data on next fetch
   clearBudgetCache(user_id);
   return sendServiceResponse(201, "Budget created successfully", { success: true });
}

/**
 * Updates a budget.
 *
 * @param {string} user_id - User ID
 * @param {Budget} budget - Budget object
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404` with respective errors
 */
export async function updateBudget(user_id: string, budget: Budget): Promise<ServerResponse> {
   // Validate input against its schema
   const fields = budgetSchema.safeParse(budget);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid budget fields");
   }

   // Update budget
   const result = await budgetsRepository.updateBudget(fields.data as Budget);

   if (!result) {
      return sendServiceResponse(404, "Budget not found", undefined,
         { budget_category_id: "Budget does not exist based on the provided year, month, and budget category ID" }
      );
   }

   return clearCacheOnSuccess(user_id);
}

/**
 * Deletes a budget category.
 *
 * @param {string} user_id - User ID
 * @param {string} budget_category_id - Budget category ID
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404` with respective errors
 */
export async function deleteCategory(user_id: string, budget_category_id: string): Promise<ServerResponse> {
   if (!budget_category_id) {
      return sendValidationErrors(null, "Invalid budget category fields",
         { budget_category_id: "Budget category ID is required" }
      );
   }

   // Delete category
   const result = await budgetsRepository.deleteCategory(user_id, budget_category_id);

   if (!result) {
      return sendServiceResponse(404, "Budget category not found", undefined,
         { budget_category_id: "Budget category does not exist based on the provided budget category ID" }
      );
   }

   return clearCacheOnSuccess(user_id);
}