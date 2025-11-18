import { Budget, BudgetCategory, OrganizedBudgets } from "capital/budgets";
import {
   createValidBudget,
   createValidBudgetEntry,
   createValidOrganizedBudgets,
   TEST_BUDGET_CATEGORY_ID,
   TEST_BUDGET_CATEGORY_IDS
} from "capital/mocks/budgets";
import { TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";

import * as budgetsService from "@/services/budgetsService";
import {
   arrangeDefaultRedisCacheBehavior,
   arrangeMockCacheHit,
   arrangeMockCacheMiss,
   arrangeMockRepositoryError,
   arrangeMockRepositorySuccess,
   assertCacheHitBehavior,
   assertCacheInvalidation,
   assertCacheInvalidationNotCalled,
   assertCacheMissBehavior,
   assertMethodsNotCalled,
   assertRepositoryCall,
   assertServiceErrorResponse,
   assertServiceSuccessResponse,
   assertServiceThrows
} from "@/tests/utils/services";

jest.mock("@/lib/redis");
jest.mock("@/repository/budgetsRepository");

describe("Budgets Service", () => {
   const userId: string = TEST_USER_ID;
   const categoryId: string = TEST_BUDGET_CATEGORY_ID;
   const categoryIds: string[] = TEST_BUDGET_CATEGORY_IDS;
   const budgetsCacheKey: string = `budgets:${userId}`;
   const BUDGET_CACHE_DURATION: number = 30 * 60;

   let redis: typeof import("@/lib/redis");
   let budgetsRepository: typeof import("@/repository/budgetsRepository");

   /**
	 * Asserts budget validation error response - no repository or cache calls
	 *
	 * @param {ServerResponse} result - Service response
	 * @param {Record<string, string>} [expectedErrors] - Optional error fields to verify
	 */
   const assertBudgetValidationErrorResponse = (result: ServerResponse, expectedErrors?: Record<string, string>): void => {
      assertMethodsNotCalled([
         {
            module: budgetsRepository,
            methods: ["createCategory", "updateCategory", "updateCategoryOrderings", "createBudget", "updateBudget", "deleteCategory", "findByUserId"]
         },
         {
            module: redis,
            methods: ["removeCacheValue"]
         }
      ]);
      assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, expectedErrors || {});
   };

   /**
	 * Asserts budget operation success - repository call and cache invalidation
	 *
	 * @param {string} repositoryMethod - Repository method name
	 * @param {unknown[]} expectedParams - Expected parameters for repository call
	 */
   const assertBudgetOperationSuccess = (repositoryMethod: string, expectedParams: unknown[]): void => {
      assertRepositoryCall(budgetsRepository, repositoryMethod, expectedParams);
      assertCacheInvalidation(redis, budgetsCacheKey);
   };

   beforeEach(async() => {
      jest.clearAllMocks();

      budgetsRepository = await import("@/repository/budgetsRepository");
      redis = await import("@/lib/redis");

      arrangeDefaultRedisCacheBehavior(redis);
   });

   describe("fetchBudgets", () => {
      it("should return cached budgets on cache hit", async() => {
         const cachedBudgets: OrganizedBudgets = createValidOrganizedBudgets();
         const cachedData: string = JSON.stringify(cachedBudgets);
         arrangeMockCacheHit(redis, cachedData);

         const result: ServerResponse = await budgetsService.fetchBudgets(userId);

         assertCacheHitBehavior(redis, budgetsRepository, "findByUserId", budgetsCacheKey);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, cachedBudgets);
      });

      it("should fetch from database and cache on cache miss", async() => {
         const mockBudgets: OrganizedBudgets = createValidOrganizedBudgets();

         arrangeMockCacheMiss(redis);
         arrangeMockRepositorySuccess(budgetsRepository, "findByUserId", mockBudgets);

         const result: ServerResponse = await budgetsService.fetchBudgets(userId);

         assertCacheMissBehavior(redis, budgetsRepository, "findByUserId", budgetsCacheKey, userId, mockBudgets, BUDGET_CACHE_DURATION);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, mockBudgets);
      });

      it("should handle repository errors during fetch using helper", async() => {
         arrangeMockCacheMiss(redis);
         arrangeMockRepositoryError(budgetsRepository, "findByUserId", "Database connection failed");

         await assertServiceThrows(
            () => budgetsService.fetchBudgets(userId),
            "Database connection failed"
         );

         assertRepositoryCall(budgetsRepository, "findByUserId", [userId]);
      });
   });

   describe("createBudgetCategory", () => {
      it("should create budget category successfully with valid data", async() => {
         const validCategory: BudgetCategory = createValidBudgetEntry();

         arrangeMockRepositorySuccess(budgetsRepository, "createCategory", categoryId);

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, validCategory);

         assertBudgetOperationSuccess("createCategory", [userId, validCategory]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { budget_category_id: categoryId });
      });

      it("should return validation errors for missing required budget fields", async() => {
         const { budget_category_id, ...invalidCategory } = createValidBudgetEntry();

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory as BudgetCategory);

         assertBudgetValidationErrorResponse(result, { budget_category_id: "Required" });
      });

      it("should return validation errors for missing required category fields", async() => {
         const { type, ...invalidCategory } = createValidBudgetEntry();

         const result: ServerResponse = await budgetsService.createBudgetCategory(
            userId,
				invalidCategory as BudgetCategory
         );

         assertBudgetValidationErrorResponse(result, {
            type: "Type must be either 'Income' or 'Expenses'"
         });
      });

      it("should return validation errors for invalid budget category type", async() => {
         const invalidCategory = { ...createValidBudgetEntry() };
         const invalidType: string = "InvalidType";

         const result: ServerResponse = await budgetsService.createBudgetCategory(
            userId,
				{ ...invalidCategory, type: invalidType } as BudgetCategory
         );

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for invalid goal amount (negative)", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({},
            { goal: -100.00 }
         );

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for goal exceeding maximum", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({},
            { goal: 1_000_000_000_000_000 }
         );

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for invalid month (0)", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({},
            { month: 0 }
         );

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for invalid month (13)", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({},
            { month: 13 }
         );

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for invalid year (before 1800)", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({},
            { year: 1799 }
         );

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for future month in current year", async() => {
         const futureMonth = new Date().getMonth() + 2; // Next month
         const futureYear = new Date().getFullYear();
         const invalidCategory: BudgetCategory = createValidBudgetEntry({},
            { year: futureYear, month: futureMonth > 12 ? 1 : futureMonth }
         );

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for future year", async() => {
         const futureYear = new Date().getFullYear() + 1;
         const invalidCategory: BudgetCategory = createValidBudgetEntry({},
            { year: futureYear }
         );

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for category name too short", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({
            name: ""
         });

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for category name too long", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({
            name: "a".repeat(31)
         });

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for reserved category name 'income'", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({
            name: "income"
         });

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for reserved category name 'expenses'", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({
            name: "expenses"
         });

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for reserved category name 'null'", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({
            name: "null"
         });

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for category order negative", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({
            category_order: -1
         });

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for category order exceeding maximum", async() => {
         const invalidCategory: BudgetCategory = createValidBudgetEntry({
            category_order: 2_147_483_648
         });

         const result: ServerResponse = await budgetsService.createBudgetCategory(userId, invalidCategory);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for invalid budget category ID UUID", async() => {
         const invalidUUID: string = "not-a-uuid";
         const invalidCategory = { ...createValidBudgetEntry(), budget_category_id: invalidUUID };

         const result: ServerResponse = await budgetsService.createBudgetCategory(
            userId,
				invalidCategory as BudgetCategory
         );

         assertBudgetValidationErrorResponse(result, {
            budget_category_id: "Budget category ID must be a valid UUID"
         });
      });

      it("should handle repository errors during creation using helper", async() => {
         const validCategory: BudgetCategory = createValidBudgetEntry();

         arrangeMockRepositoryError(budgetsRepository, "createCategory", "Database connection failed");

         await assertServiceThrows(
            () => budgetsService.createBudgetCategory(userId, validCategory),
            "Database connection failed"
         );

         assertRepositoryCall(budgetsRepository, "createCategory", [userId, validCategory]);
         assertCacheInvalidationNotCalled(redis);
      });
   });

   describe("updateCategory", () => {
      it("should update category successfully with valid data", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: categoryId,
            name: "Updated Category",
            type: "Income",
            category_order: 1
         };

         arrangeMockRepositorySuccess(budgetsRepository, "updateCategory", true);

         const result: ServerResponse = await budgetsService.updateCategory(userId, updates);

         assertBudgetOperationSuccess("updateCategory", [userId, categoryId, updates]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return validation errors for missing budget_category_id", async() => {
         const updates: Partial<BudgetCategory> = {
            name: "Updated Category"
         };

         const result: ServerResponse = await budgetsService.updateCategory(userId, updates);

         assertBudgetValidationErrorResponse(result, {
            budget_category_id: "Missing budget category ID"
         });
      });

      it("should return validation errors for name too short", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: categoryId,
            name: ""
         };

         const result: ServerResponse = await budgetsService.updateCategory(userId, updates);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for name too long", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: categoryId,
            name: "a".repeat(31)
         };

         const result: ServerResponse = await budgetsService.updateCategory(userId, updates);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for reserved name 'income'", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: categoryId,
            name: "income"
         };

         const result: ServerResponse = await budgetsService.updateCategory(userId, updates);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for reserved name 'expenses'", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: categoryId,
            name: "expenses"
         };

         const result: ServerResponse = await budgetsService.updateCategory(userId, updates);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for invalid category type", async() => {
         const invalidType: string = "InvalidType";
         const updates = {
            budget_category_id: categoryId,
            type: invalidType
         };

         const result: ServerResponse = await budgetsService.updateCategory(
            userId,
				updates as Partial<BudgetCategory>
         );

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for category order negative", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: categoryId,
            category_order: -1
         };

         const result: ServerResponse = await budgetsService.updateCategory(userId, updates);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for explicitly null name", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: categoryId,
            name: null
         };

         const result: ServerResponse = await budgetsService.updateCategory(userId, updates);

         assertBudgetValidationErrorResponse(result, {
            name: "Budget category name cannot be null"
         });
      });

      it("should return not found when category does not exist", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: categoryId,
            name: "Updated Category"
         };

         arrangeMockRepositorySuccess(budgetsRepository, "updateCategory", false);

         const result: ServerResponse = await budgetsService.updateCategory(userId, updates);

         assertRepositoryCall(budgetsRepository, "updateCategory", [userId, categoryId, updates]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, {
            budget_category_id:
					"Budget category does not exist based on the provided ID or does not belong to the user"
         });
      });

      it("should handle repository errors during update using helper", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: categoryId,
            name: "Updated Category"
         };

         arrangeMockRepositoryError(budgetsRepository, "updateCategory", "Database connection failed");

         await assertServiceThrows(
            () => budgetsService.updateCategory(userId, updates),
            "Database connection failed"
         );

         assertRepositoryCall(budgetsRepository, "updateCategory", [userId, categoryId, updates]);
         assertCacheInvalidationNotCalled(redis);
      });
   });

   describe("updateCategoryOrdering", () => {
      it("should update category ordering successfully with valid data", async() => {
         arrangeMockRepositorySuccess(budgetsRepository, "updateCategoryOrderings", true);

         const result: ServerResponse = await budgetsService.updateCategoryOrdering(userId, categoryIds);

         const expectedOrdering: Partial<BudgetCategory>[] = categoryIds.map((id, index) => ({
            budget_category_id: id,
            category_order: index
         }));
         assertBudgetOperationSuccess("updateCategoryOrderings", [userId, expectedOrdering]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return not found when categories do not exist", async() => {
         arrangeMockRepositorySuccess(budgetsRepository, "updateCategoryOrderings", false);

         const result: ServerResponse = await budgetsService.updateCategoryOrdering(userId, categoryIds);

         const expectedOrdering: Partial<BudgetCategory>[] = categoryIds.map((id, index) => ({
            budget_category_id: id,
            category_order: index
         }));
         assertRepositoryCall(budgetsRepository, "updateCategoryOrderings", [userId, expectedOrdering]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, {
            categories: "No possible ordering updates based on provided category IDs"
         });
      });

      it("should return validation errors for non-array input", async() => {
         const invalidIds = "not-an-array" as unknown as string[];

         const result: ServerResponse = await budgetsService.updateCategoryOrdering(userId, invalidIds);

         assertBudgetValidationErrorResponse(result, {
            categories: "Category ID's array must be a valid array representation"
         });
      });

      it("should return validation errors for empty array", async() => {
         const result: ServerResponse = await budgetsService.updateCategoryOrdering(userId, []);

         assertBudgetValidationErrorResponse(result, {
            categories: "Category ID's array must be a valid array representation"
         });
      });

      it("should return validation errors for single invalid UUID in array", async() => {
         const testIds: string[] = [categoryIds[0], "invalid-uuid"];

         const result: ServerResponse = await budgetsService.updateCategoryOrdering(userId, testIds);

         assertBudgetValidationErrorResponse(result, {
            budget_category_id: "Invalid category ID: 'invalid-uuid'"
         });
      });

      it("should return validation errors for multiple invalid UUIDs in array", async() => {
         const testIds: string[] = ["invalid-1", "invalid-2"];

         const result: ServerResponse = await budgetsService.updateCategoryOrdering(userId, testIds);

         assertBudgetValidationErrorResponse(result, {
            budget_category_id: "Invalid category ID: 'invalid-1'"
         });
      });

      it("should return validation errors for mixed valid and invalid UUIDs", async() => {
         const testIds: string[] = [categoryIds[0], "not-a-uuid", categoryIds[1]];

         const result: ServerResponse = await budgetsService.updateCategoryOrdering(userId, testIds);

         assertBudgetValidationErrorResponse(result, {
            budget_category_id: "Invalid category ID: 'not-a-uuid'"
         });
      });

      it("should handle repository errors during ordering update using helper", async() => {
         const testIds: string[] = categoryIds.slice(0, 2);

         arrangeMockRepositoryError(budgetsRepository, "updateCategoryOrderings", "Database connection failed");

         await assertServiceThrows(
            () => budgetsService.updateCategoryOrdering(userId, testIds),
            "Database connection failed"
         );

         const expectedOrdering = testIds.map((id, index) => ({
            budget_category_id: id,
            category_order: index
         }));
         assertRepositoryCall(budgetsRepository, "updateCategoryOrderings", [userId, expectedOrdering]);
         assertCacheInvalidationNotCalled(redis);
      });
   });

   describe("createBudget", () => {
      it("should create budget successfully with valid data", async() => {
         const validBudget: Budget = createValidBudget();

         arrangeMockRepositorySuccess(budgetsRepository, "createBudget", true);

         const result: ServerResponse = await budgetsService.createBudget(userId, validBudget);

         assertBudgetOperationSuccess("createBudget", [userId, validBudget]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { success: true });
      });

      it("should return validation errors for invalid budget category ID UUID", async() => {
         const invalidBudget: Budget = createValidBudget({
            budget_category_id: "not-a-uuid"
         });

         const result: ServerResponse = await budgetsService.createBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for negative goal", async() => {
         const invalidBudget: Budget = createValidBudget({
            goal: -100.00
         });

         const result: ServerResponse = await budgetsService.createBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for goal exceeding maximum", async() => {
         const invalidBudget: Budget = createValidBudget({
            goal: 1_000_000_000_000_000
         });

         const result: ServerResponse = await budgetsService.createBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for invalid month (0)", async() => {
         const invalidBudget: Budget = createValidBudget({
            month: 0
         });

         const result: ServerResponse = await budgetsService.createBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for invalid month (13)", async() => {
         const invalidBudget: Budget = createValidBudget({
            month: 13
         });

         const result: ServerResponse = await budgetsService.createBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for year before 1800", async() => {
         const invalidBudget: Budget = createValidBudget({
            year: 1799
         });

         const result: ServerResponse = await budgetsService.createBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for future month in current year", async() => {
         const futureMonth = new Date().getMonth() + 2;
         const futureYear = new Date().getFullYear();
         const invalidBudget: Budget = createValidBudget({
            year: futureYear,
            month: futureMonth > 12 ? 1 : futureMonth
         });

         const result: ServerResponse = await budgetsService.createBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return not found when category does not exist", async() => {
         const validBudget: Budget = createValidBudget();

         arrangeMockRepositorySuccess(budgetsRepository, "createBudget", false);

         const result: ServerResponse = await budgetsService.createBudget(userId, validBudget);

         assertRepositoryCall(budgetsRepository, "createBudget", [userId, validBudget]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, {
            budget_category_id:
					"Budget category does not exist based on the provided ID or does not belong to the user"
         });
      });

      it("should handle repository errors during creation using helper", async() => {
         const validBudget: Budget = createValidBudget();

         arrangeMockRepositoryError(budgetsRepository, "createBudget", "Database connection failed");

         await assertServiceThrows(
            () => budgetsService.createBudget(userId, validBudget),
            "Database connection failed"
         );

         assertRepositoryCall(budgetsRepository, "createBudget", [userId, validBudget]);
         assertCacheInvalidationNotCalled(redis);
      });
   });

   describe("updateBudget", () => {
      it("should update budget successfully with valid data", async() => {
         const updates: Budget = createValidBudget({
            goal: 750.00
         });

         arrangeMockRepositorySuccess(budgetsRepository, "updateBudget", true);

         const result: ServerResponse = await budgetsService.updateBudget(userId, updates);

         assertBudgetOperationSuccess("updateBudget", [userId, updates.budget_category_id, updates]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return validation errors for invalid budget category ID UUID", async() => {
         const invalidBudget: Budget = createValidBudget({
            budget_category_id: "not-a-uuid"
         });

         const result: ServerResponse = await budgetsService.updateBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for negative goal", async() => {
         const invalidBudget: Budget = createValidBudget({
            goal: -50.00
         });

         const result: ServerResponse = await budgetsService.updateBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for goal exceeding maximum", async() => {
         const invalidBudget: Budget = createValidBudget({
            goal: 1_000_000_000_000_000
         });

         const result: ServerResponse = await budgetsService.updateBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for invalid month (0)", async() => {
         const invalidBudget: Budget = createValidBudget({
            month: 0
         });

         const result: ServerResponse = await budgetsService.updateBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for invalid month (13)", async() => {
         const invalidBudget: Budget = createValidBudget({
            month: 13
         });

         const result: ServerResponse = await budgetsService.updateBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for year before 1800", async() => {
         const invalidBudget: Budget = createValidBudget({
            year: 1799
         });

         const result: ServerResponse = await budgetsService.updateBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return validation errors for future month in current year", async() => {
         const futureMonth = new Date().getMonth() + 2;
         const futureYear = new Date().getFullYear();
         const invalidBudget: Budget = createValidBudget({
            year: futureYear,
            month: futureMonth > 12 ? 1 : futureMonth
         });

         const result: ServerResponse = await budgetsService.updateBudget(userId, invalidBudget);

         assertBudgetValidationErrorResponse(result);
      });

      it("should return not found when budget does not exist", async() => {
         const validBudget: Budget = createValidBudget();

         arrangeMockRepositorySuccess(budgetsRepository, "updateBudget", false);

         const result: ServerResponse = await budgetsService.updateBudget(userId, validBudget);

         assertRepositoryCall(budgetsRepository, "updateBudget", [userId, validBudget.budget_category_id, validBudget]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, {
            budget_category_id:
					"Budget does not exist based on the provided year, month, and budget category ID or does not belong to the user"
         });
      });

      it("should handle repository errors during update using helper", async() => {
         const validBudget: Budget = createValidBudget();

         arrangeMockRepositoryError(budgetsRepository, "updateBudget", "Database connection failed");

         await assertServiceThrows(
            () => budgetsService.updateBudget(userId, validBudget),
            "Database connection failed"
         );

         assertRepositoryCall(budgetsRepository, "updateBudget", [userId, validBudget.budget_category_id, validBudget]);
         assertCacheInvalidationNotCalled(redis);
      });
   });

   describe("deleteCategory", () => {
      it("should delete category successfully", async() => {
         arrangeMockRepositorySuccess(budgetsRepository, "deleteCategory", true);

         const result: ServerResponse = await budgetsService.deleteCategory(userId, categoryId);

         assertBudgetOperationSuccess("deleteCategory", [userId, categoryId]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return not found when category does not exist", async() => {
         arrangeMockRepositorySuccess(budgetsRepository, "deleteCategory", false);

         const result: ServerResponse = await budgetsService.deleteCategory(userId, categoryId);

         assertRepositoryCall(budgetsRepository, "deleteCategory", [userId, categoryId]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, {
            budget_category_id:
					"Budget category does not exist based on the provided ID or does not belong to the user"
         });
      });

      it("should return validation errors for missing category_id", async() => {
         const result: ServerResponse = await budgetsService.deleteCategory(userId, "");

         assertBudgetValidationErrorResponse(result, {
            budget_category_id: "Missing budget category ID"
         });
      });

      it("should handle repository errors during deletion using helper", async() => {
         arrangeMockRepositoryError(budgetsRepository, "deleteCategory", "Database connection failed");

         await assertServiceThrows(
            () => budgetsService.deleteCategory(userId, categoryId),
            "Database connection failed"
         );

         assertRepositoryCall(budgetsRepository, "deleteCategory", [userId, categoryId]);
         assertCacheInvalidationNotCalled(redis);
      });
   });
});