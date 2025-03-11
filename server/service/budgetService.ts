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
import * as budgetRepository from "@/repository/budgetRepository";

// Cache duration in seconds for budget data
const BUDGET_CACHE_DURATION = 25 * 60;

// Helper function to generate budgets cache key
const getBudgetsCacheKey = (user_id: string) => `budgets:${user_id}`;

// Helper function to clear budget cache on successful budget updates
const clearBudgetCache = (user_id: string) => {
   removeCacheValue(getBudgetsCacheKey(user_id));
};

export async function getBudgets(user_id: string): Promise<ServerResponse> {
   // Try to get from cache first
   const cacheKey = getBudgetsCacheKey(user_id);
   const cache = await getCacheValue(cacheKey);

   if (cache) {
      return sendServiceResponse(200, "Budgets", JSON.parse(cache) as Budget[]);
   }

   // If not in cache, fetch from the budget repository and cache the result
   const result: OrganizedBudgets = await budgetRepository.findByUserId(user_id);

   setCacheValue(cacheKey, BUDGET_CACHE_DURATION, JSON.stringify(result));
   return sendServiceResponse(200, "Budgets", result);
}

export async function createBudget(user_id: string, budget: Budget): Promise<ServerResponse> {
   // Validate budget fields
   const fields = budgetSchema.strict().safeParse(budget);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid budget fields");
   }

   const result = await budgetRepository.createBudget(budget);

   clearBudgetCache(user_id);
   return sendServiceResponse(201, "Budget created", { success: result });
}

export async function createCategory(user_id: string, category: Budget & BudgetCategory): Promise<ServerResponse> {
   // Validate budget and category fields to ensure their creation and insertion into the budgets relation
   const categoryFields = budgetCategorySchema.strict().safeParse(category);

   if (!categoryFields.success) {
      return sendValidationErrors(categoryFields, "Invalid budget category fields");
   }

   const budgetFields = budgetSchema.strict().safeParse(category);

   if (!budgetFields.success) {
      return sendValidationErrors(budgetFields, "Invalid budget fields");
   }

   const result: string = await budgetRepository.createCategory(category);

   if (result !== "conflict") {
      // Successfully created budget category
      clearBudgetCache(user_id);
      return sendServiceResponse(201, "Budget category created", { budget_category_id: result });
   } else {
      // Conflict with existing budget category name (unique constraint for each budget type)
      return sendServiceResponse(409, "Budget category conflicts",
         { name: "Budget category name already exists" }
      );
   }
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
   }

   const result = await budgetRepository.updateCategory(user_id, category);

   if (!result) {
      return sendServiceResponse(404, "Budget category not found", undefined,
         { category: "Budget category does not exist based on the provided ID" }
      );
   }

   clearBudgetCache(user_id);
   return sendServiceResponse(204, "Budget category updated");
}

export async function updateCategoryOrdering(user_id: string, categoryIds: string[]): Promise<ServerResponse> {
   // Validate category IDs array
   if (!categoryIds?.length) {
      return sendValidationErrors(null, "Invalid category ordering fields",
         { categories: "Category ID array must be non-empty" }
      );
   }

   // Validate each UUID
   const uuidSchema = z.string().uuid();
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

   const result = await budgetRepository.updateCategoryOrderings(user_id, updates);

   if (!result) {
      return sendServiceResponse(404, "Invalid category ordering", undefined,
         { categories: "No possible ordering updates based on provided category IDs" }
      );
   }

   clearBudgetCache(user_id);
   return sendServiceResponse(204);
}

export async function deleteCategory(user_id: string, budget_category_id: string): Promise<ServerResponse> {
   // Validate category ID
   const uuidSchema = z.string().uuid();

   if (!uuidSchema.safeParse(budget_category_id).success) {
      return sendValidationErrors(null, "Invalid budget category fields",
         { budget_category_id: `Category ID must be a valid UUID: '${budget_category_id}'` }
      );
   }

   // Submit the delete request to the repository
   const result = await budgetRepository.deleteCategory(user_id, budget_category_id);

   if (!result) {
      return sendServiceResponse(404, "Budget category not found", undefined,
         { category: "Budget category does not exist based on the provided ID" }
      );
   }

   clearBudgetCache(user_id);
   return sendServiceResponse(204);
}

export async function deleteBudget(user_id: string, budget: Budget): Promise<ServerResponse> {
   // Validate budget fields
   const fields = budgetSchema.strict().safeParse(budget);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid budget fields");
   } else if (!budget.budget_category_id) {
      return sendValidationErrors(null, "Invalid budget fields",
         { budget_category_id: "Non-category budgets cannot be deleted" }
      );
   }

   const result = await budgetRepository.deleteBudget(budget);

   if (!result) {
      return sendServiceResponse(404, "Budget not found", undefined,
         { budget: "Budget does not exist based on the provided ID" }
      );
   }

   clearBudgetCache(user_id);
   return sendServiceResponse(204);
}