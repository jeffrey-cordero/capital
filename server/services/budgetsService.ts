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
import { clearCacheAndSendSuccess, sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as budgetsRepository from "@/repository/budgetsRepository";

/**
 * Cache duration in seconds for user budgets - `30` minutes
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
      return sendServiceResponse(200, JSON.parse(cache) as OrganizedBudgets);
   }

   // Cache miss - fetch from repository and store in cache
   const result: OrganizedBudgets = await budgetsRepository.findByUserId(user_id);
   setCacheValue(key, BUDGET_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(200, result);
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
      return sendValidationErrors(budgetFields);
   }

   const categoryFields = budgetCategorySchema.safeParse(category);

   if (!categoryFields.success) {
      return sendValidationErrors(categoryFields);
   }

   // Create the category and initial budget record
   const record: Budget & BudgetCategory = {
      ...categoryFields.data,
      ...budgetFields.data,
      goals: [],
      goalIndex: 0
   };
   const result = await budgetsRepository.createCategory(user_id, record);

   // Invalidate cache to ensure fresh data for the next request
   removeCacheValue(getBudgetsCacheKey(user_id));

   return sendServiceResponse(201, { budget_category_id: result });
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
      return sendValidationErrors(null, {
         budget_category_id: "Missing budget category ID"
      });
   }

   // Validate input against its partial schema
   const fields = budgetCategorySchema.partial().safeParse(category);

   if (!fields.success) {
      return sendValidationErrors(fields);
   } else if (category.name === null) {
      return sendValidationErrors(null, {
         name: "Budget category name can't be null"
      });
   }

   const result = await budgetsRepository.updateCategory(user_id, category.budget_category_id, fields.data);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         budget_category_id: "Budget category does not exist based on the provided ID or does not belong to the user"
      });
   }

   return clearCacheAndSendSuccess(getBudgetsCacheKey(user_id));
}

/**
 * Updates the ordering of budget categories.
 *
 * @param {string} user_id - User ID
 * @param {string[]} categoryIds - Array of category IDs
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404` with respective errors
 */
export async function updateCategoryOrdering(user_id: string, categoryIds: string[]): Promise<ServerResponse> {
   // Validate the array of category IDs
   if (!Array.isArray(categoryIds) || !categoryIds.length) {
      return sendValidationErrors(null, {
         categories: "Category ID's array must be a valid array representation"
      });
   }

   // Validate each UUID and create updates array
   const uuidSchema = z.string().trim().uuid();
   const updates: Partial<BudgetCategory>[] = [];

   for (let i = 0; i < categoryIds.length; i++) {
      const categoryId = categoryIds[i];
      const uuidFields = uuidSchema.safeParse(categoryId);

      if (!uuidFields.success) {
         return sendValidationErrors(null, {
            budget_category_id: `Invalid category ID: '${categoryId}'`
         });
      }

      updates.push({ budget_category_id: uuidFields.data, category_order: i });
   }

   const result = await budgetsRepository.updateCategoryOrderings(user_id, updates);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         categories: "No possible ordering updates based on provided category IDs"
      });
   }

   return clearCacheAndSendSuccess(getBudgetsCacheKey(user_id));
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
      return sendValidationErrors(fields);
   }

   // Create or update budget
   const result = await budgetsRepository.createBudget(user_id, fields.data);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         budget_category_id: "Budget category does not exist based on the provided ID or does not belong to the user"
      });
   }

   // Invalidate cache to ensure fresh data on next fetch
   removeCacheValue(getBudgetsCacheKey(user_id));

   return sendServiceResponse(201, { success: true });
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
      return sendValidationErrors(fields);
   }

   const result = await budgetsRepository.updateBudget(user_id, budget.budget_category_id, fields.data);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         budget_category_id: "Budget does not exist based on the provided year, month, and budget category ID or does not belong to the user"
      });
   }

   return clearCacheAndSendSuccess(getBudgetsCacheKey(user_id));
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
      return sendValidationErrors(null, {
         budget_category_id: "Missing budget category ID"
      });
   }

   const result = await budgetsRepository.deleteCategory(user_id, budget_category_id);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         budget_category_id: "Budget category does not exist based on the provided ID or does not belong to the user"
      });
   }

   return clearCacheAndSendSuccess(getBudgetsCacheKey(user_id));
}