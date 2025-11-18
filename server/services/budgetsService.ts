import {
   Budget,
   BudgetCategory,
   budgetCategorySchema,
   budgetSchema,
   OrganizedBudgets
} from "capital/budgets";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import { z } from "zod";

import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { clearCacheAndSendSuccess, sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as budgetsRepository from "@/repository/budgetsRepository";

/**
 * Cache duration for user budgets (30 minutes)
 */
const BUDGET_CACHE_DURATION = 30 * 60;

/**
 * Generates budgets cache key
 *
 * @param {string} user_id - User identifier
 * @returns {string} Redis cache key for budgets
 */
const getBudgetsCacheKey = (user_id: string): string => `budgets:${user_id}`;

/**
 * Fetches budgets for a user
 *
 * @param {string} user_id - User identifier
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.OK` with organized budgets
 */
export async function fetchBudgets(user_id: string): Promise<ServerResponse> {
   // Try to get from cache first
   const key: string = getBudgetsCacheKey(user_id);
   const cache: string | null = await getCacheValue(key);

   if (cache) {
      return sendServiceResponse(HTTP_STATUS.OK, JSON.parse(cache) as OrganizedBudgets);
   }

   // Cache miss - fetch from repository and store in cache
   const result: OrganizedBudgets = await budgetsRepository.findByUserId(user_id);
   setCacheValue(key, BUDGET_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(HTTP_STATUS.OK, result);
}

/**
 * Creates a new budget category with initial budget records
 *
 * @param {string} user_id - User identifier
 * @param {Budget & BudgetCategory} category - Budget category object
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.CREATED` with the inserted budget category ID or `HTTP_STATUS.BAD_REQUEST` with validation errors
 */
export async function createBudgetCategory(user_id: string, category: Budget & BudgetCategory): Promise<ServerResponse> {
   // Validate budget and category fields against their respective schemas
   const budgetFields = budgetSchema.safeParse(category);

   if (!budgetFields.success) {
      return sendValidationErrors(budgetFields);
   }

   const categoryFields = budgetCategorySchema.safeParse({ ...category, user_id });

   if (!categoryFields.success) {
      return sendValidationErrors(categoryFields);
   }

   // Create a complete record by combining validated data
   const record: Budget & BudgetCategory = {
      ...categoryFields.data,
      ...budgetFields.data,
      goals: [],
      goalIndex: 0
   };

   // Create the category in the database
   const result = await budgetsRepository.createCategory(user_id, record);

   // Invalidate cache to ensure fresh data for the next request
   removeCacheValue(getBudgetsCacheKey(user_id));

   return sendServiceResponse(HTTP_STATUS.CREATED, { budget_category_id: result });
}

/**
 * Updates a budget category
 *
 * @param {string} user_id - User identifier
 * @param {Partial<BudgetCategory>} category - Budget category object
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.NO_CONTENT` with no content or `HTTP_STATUS.BAD_REQUEST`/`HTTP_STATUS.NOT_FOUND` with respective errors
 */
export async function updateCategory(user_id: string, category: Partial<BudgetCategory>): Promise<ServerResponse> {
   // Ensure the category ID is provided to identify which record to update
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
         name: "Budget category name cannot be null"
      });
   }

   // Update the category in the database
   const result = await budgetsRepository.updateCategory(user_id, category.budget_category_id, fields.data);

   if (!result) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
         budget_category_id: "Budget category does not exist based on the provided ID or does not belong to the user"
      });
   }

   return clearCacheAndSendSuccess(getBudgetsCacheKey(user_id));
}

/**
 * Updates the ordering of budget categories
 *
 * @param {string} user_id - User identifier
 * @param {string[]} categoryIds - Array of category IDs
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.NO_CONTENT` with no content or `HTTP_STATUS.BAD_REQUEST`/`HTTP_STATUS.NOT_FOUND` with respective errors
 */
export async function updateCategoryOrdering(user_id: string, categoryIds: string[]): Promise<ServerResponse> {
   // Ensure the category IDs array is valid
   if (!Array.isArray(categoryIds) || !categoryIds.length) {
      return sendValidationErrors(null, {
         categories: "Category ID's array must be a valid array representation"
      });
   }

   // Validate each UUID in the array and build updates with new ordering
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

   // Perform bulk update of category ordering
   const result = await budgetsRepository.updateCategoryOrderings(user_id, updates);

   if (!result) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
         categories: "No possible ordering updates based on provided category IDs"
      });
   }

   return clearCacheAndSendSuccess(getBudgetsCacheKey(user_id));
}

/**
 * Creates a new budget
 *
 * @param {string} user_id - User identifier
 * @param {Budget} budget - Budget object
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.CREATED` with success status or `HTTP_STATUS.BAD_REQUEST`/`HTTP_STATUS.NOT_FOUND` with respective errors
 */
export async function createBudget(user_id: string, budget: Budget): Promise<ServerResponse> {
   // Validate budget data against schema
   const fields = budgetSchema.safeParse(budget);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   // Create budget record in the database
   const result = await budgetsRepository.createBudget(user_id, fields.data);

   if (!result) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
         budget_category_id: "Budget category does not exist based on the provided ID or does not belong to the user"
      });
   }

   // Invalidate cache to ensure fresh data on next fetch
   removeCacheValue(getBudgetsCacheKey(user_id));

   return sendServiceResponse(HTTP_STATUS.CREATED, { success: true });
}

/**
 * Updates a budget
 *
 * @param {string} user_id - User identifier
 * @param {Budget} budget - Budget object
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.NO_CONTENT` with no content or `HTTP_STATUS.BAD_REQUEST`/`HTTP_STATUS.NOT_FOUND` with respective errors
 */
export async function updateBudget(user_id: string, budget: Budget): Promise<ServerResponse> {
   // Validate budget data against schema
   const fields = budgetSchema.safeParse(budget);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   // Update the budget in the database
   const result = await budgetsRepository.updateBudget(user_id, budget.budget_category_id, fields.data);

   if (!result) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
         budget_category_id: "Budget does not exist based on the provided year, month, and budget category ID or does not belong to the user"
      });
   }

   return clearCacheAndSendSuccess(getBudgetsCacheKey(user_id));
}

/**
 * Deletes a budget category
 *
 * @param {string} user_id - User identifier
 * @param {string} budget_category_id - Budget category identifier
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.NO_CONTENT` with no content or `HTTP_STATUS.BAD_REQUEST`/`HTTP_STATUS.NOT_FOUND` with respective errors
 */
export async function deleteCategory(user_id: string, budget_category_id: string): Promise<ServerResponse> {
   // Ensure a category ID was provided
   if (!budget_category_id) {
      return sendValidationErrors(null, {
         budget_category_id: "Missing budget category ID"
      });
   }

   // Delete the category and all related budgets
   const result = await budgetsRepository.deleteCategory(user_id, budget_category_id);

   if (!result) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
         budget_category_id: "Budget category does not exist based on the provided ID or does not belong to the user"
      });
   }

   return clearCacheAndSendSuccess(getBudgetsCacheKey(user_id));
}