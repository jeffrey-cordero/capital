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

// Cache duration in seconds for user budgets (25 minutes)
const BUDGET_CACHE_DURATION = 25 * 60;

// Helper function to generate budgets cache key
const getBudgetsCacheKey = (user_id: string) => `budgets:${user_id}`;

// Helper function to clear budget cache on successful budget updates
const clearBudgetCache = (user_id: string) => {
   removeCacheValue(getBudgetsCacheKey(user_id));
};

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

export async function updateCategory(user_id: string, category: Partial<BudgetCategory>): Promise<ServerResponse> {
   // Validate category data structure
   const fields = budgetCategorySchema.partial().safeParse(category);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid budget category fields");
   } else if (!category.budget_category_id) {
      return sendValidationErrors(null, "Invalid budget category fields",
         { budget_category_id: "Budget category ID is required" }
      );
   } else if (category.name === null) {
      return sendValidationErrors(null, "Invalid budget category fields",
         { name: "Budget category name can't be null" }
      );
   }

   // Attempt to update the category
   const result = await budgetsRepository.updateCategory(category);

   // Handle different update scenarios
   if (result === "failure") {
      return sendServiceResponse(404, "Budget category not found", undefined,
         { category: "Budget category does not exist based on the provided ID" }
      );
   } else if (result === "no_updates") {
      // No updates to budget category, prevent unnecessary cache invalidation
      return sendServiceResponse(204);
   } else if (result === "main_category_conflict") {
      return sendServiceResponse(409, "Budget category conflicts", undefined,
         { category: "Main budget categories can't be updated" }
      );
   }

   // Success - invalidate cache and return success response
   clearBudgetCache(user_id);
   return sendServiceResponse(204);
}

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

export async function updateBudget(user_id: string, budget: Budget): Promise<ServerResponse> {
   // Validate budget and category fields separately to ensure Zod refines are applied
   const budgetFields = budgetSchema.safeParse(budget);

   if (!budgetFields.success) {
      return sendValidationErrors(budgetFields, "Invalid budget fields");
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
         { category: "Budget category does not exist based on the provided budget category ID" }
      );
   }

   // Success - invalidate cache and return success response
   clearBudgetCache(user_id);
   return sendServiceResponse(204);
}