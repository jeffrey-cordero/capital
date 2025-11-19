import { jest } from "@jest/globals";
import { Budget, BudgetCategory, BudgetCategoryGoal, OrganizedBudgets } from "capital/budgets";
import { createValidBudget, createValidBudgetEntry, TEST_BUDGET_CATEGORY_ID, TEST_BUDGET_CATEGORY_IDS } from "capital/mocks/budgets";
import { TEST_USER_ID } from "capital/mocks/user";

import {
   arrangeMockQuery,
   arrangeMockQueryError,
   arrangeMockTransactionFlow,
   assertQueryCalledWithKeyPhrases,
   assertQueryNotCalled,
   assertQueryResult,
   assertRepositoryThrows,
   assertTransactionRollback,
   createMockClient,
   createMockPool,
   MockClient,
   MockPool,
   resetDatabaseMocks
} from "@/tests/utils/repositories";

/**
 * Global mock pool for the instance database connection
 */
const globalMockPool: MockPool = createMockPool();

jest.mock("pg", () => ({ Pool: jest.fn(() => globalMockPool) }));

import * as budgetsRepository from "@/repository/budgetsRepository";

describe("Budgets Repository", () => {
   const userId: string = TEST_USER_ID;
   const categoryId: string = TEST_BUDGET_CATEGORY_ID;
   const categoryIds: string[] = TEST_BUDGET_CATEGORY_IDS;

   let mockPool: MockPool;
   let mockClient: MockClient;

   beforeEach(async() => {
      mockPool = createMockPool();
      mockClient = createMockClient();
      resetDatabaseMocks(globalMockPool, mockPool, mockClient);
   });

   describe("findByUserId", () => {
      /**
       * Asserts the budget fetch query structure and parameters
       */
      const assertFindByUserIdStructure = (): void => {
         assertQueryCalledWithKeyPhrases([
            "SELECT bc.budget_category_id, bc.name, bc.type, bc.category_order, b.goal, b.year, b.month",
            "FROM budget_categories AS bc",
            "INNER JOIN budgets AS b",
            "ON b.budget_category_id = bc.budget_category_id",
            "WHERE bc.user_id = $1",
            "ORDER BY bc.type DESC, bc.category_order ASC NULLS FIRST, b.year DESC, b.month DESC"
         ], [userId], 0, mockPool);
      };

      it("should return organized budgets structure on success", async() => {
         // Mock raw query results with both Income and Expenses types, including duplicate categories with multiple goals
         const expenseCategoryId = categoryIds[1];
         const mockRows = [
            {
               budget_category_id: categoryId,
               name: null,
               type: "Income",
               category_order: null,
               goal: 5000.00,
               year: 2024,
               month: 11
            },
            {
               budget_category_id: categoryId,
               name: "Salary",
               type: "Income",
               category_order: 0,
               goal: 3000.00,
               year: 2024,
               month: 11
            },
            {
               budget_category_id: categoryId,
               name: "Salary",
               type: "Income",
               category_order: 0,
               goal: 2500.00,
               year: 2024,
               month: 10
            },
            {
               budget_category_id: expenseCategoryId,
               name: null,
               type: "Expenses",
               category_order: null,
               goal: 3000.00,
               year: 2024,
               month: 11
            },
            {
               budget_category_id: expenseCategoryId,
               name: "Groceries",
               type: "Expenses",
               category_order: 0,
               goal: 500.00,
               year: 2024,
               month: 11
            }
         ];

         arrangeMockQuery(mockRows, mockPool);

         const result: OrganizedBudgets = await budgetsRepository.findByUserId(userId);

         assertFindByUserIdStructure();

         // Build expected structure to validate complete transformation for both Income and Expenses
         const expectedIncome = {
            goals: [
               { goal: 5000.00, year: 2024, month: 11 }
            ],
            goalIndex: 0,
            budget_category_id: categoryId,
            categories: [
               {
                  budget_category_id: categoryId,
                  type: "Income",
                  name: "Salary",
                  category_order: 0,
                  goalIndex: 0,
                  goals: [
                     { goal: 3000.00, year: 2024, month: 11 },
                     { goal: 2500.00, year: 2024, month: 10 }
                  ]
               }
            ]
         };

         const expectedExpenses = {
            goals: [
               { goal: 3000.00, year: 2024, month: 11 }
            ],
            goalIndex: 0,
            budget_category_id: expenseCategoryId,
            categories: [
               {
                  budget_category_id: expenseCategoryId,
                  type: "Expenses",
                  name: "Groceries",
                  category_order: 0,
                  goalIndex: 0,
                  goals: [
                     { goal: 500.00, year: 2024, month: 11 }
                  ]
               }
            ]
         };

         expect(result.Income).toEqual(expectedIncome);
         expect(result.Expenses).toEqual(expectedExpenses);
      });

      it("should return empty budgets when user has no categories", async() => {
         arrangeMockQuery([], mockPool);

         const result: OrganizedBudgets = await budgetsRepository.findByUserId(userId);

         assertFindByUserIdStructure();

         const expectedEmpty = {
            goals: [],
            goalIndex: 0,
            budget_category_id: "",
            categories: []
         };

         expect(result.Income).toEqual(expectedEmpty);
         expect(result.Expenses).toEqual(expectedEmpty);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => budgetsRepository.findByUserId(userId),
            "Database connection failed"
         );
         assertFindByUserIdStructure();
      });
   });

   describe("createCategory", () => {
      /**
       * Arranges transaction flow for successful category creation
       */
      const arrangeCreateCategoryTransactionSuccess = (): void => {
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            { rows: [{ budget_category_id: categoryId }] }, // Category INSERT
            {} // Budget INSERT
         ]);
      };

      /**
       * Arranges transaction with error at specific stage
       */
      const arrangeCreateCategoryTransactionError = (errorMessage: string, failStage: "begin" | "category_insert" | "budget_insert"): void => {
         const error = new Error(errorMessage);

         switch (failStage) {
            case "begin":
               arrangeMockTransactionFlow(mockClient.query, [error]);
               break;
            case "category_insert":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  error // Category INSERT fails
               ]);
               break;
            case "budget_insert":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [{ budget_category_id: categoryId }] }, // Category INSERT
                  error // Budget INSERT fails
               ]);
               break;
            default:
               throw new Error(`Unknown fail stage: ${failStage}`);
         }
      };

      /**
       * Asserts category creation query structure
       */
      const assertCreateCategoryStructure = (category: Omit<BudgetCategoryGoal, "budget_category_id">): void => {
         assertQueryCalledWithKeyPhrases([
            "INSERT INTO budget_categories (user_id, type, name, category_order)",
            "VALUES ($1, $2, $3, $4)",
            "RETURNING budget_category_id"
         ], [userId, category.type, category.name, category.category_order], 1, mockPool);
      };

      it("should create category successfully with transaction", async() => {
         const category = createValidBudgetEntry();
         arrangeCreateCategoryTransactionSuccess();

         const result: string = await budgetsRepository.createCategory(userId, category);

         assertCreateCategoryStructure(category);
         assertQueryResult(result, categoryId);
      });

      it("should create category with external client for nested transaction", async() => {
         const category = createValidBudgetEntry();
         arrangeMockTransactionFlow(mockClient.query, [
            { rows: [{ budget_category_id: categoryId }] }, // Category INSERT
            {} // Budget INSERT
         ]);

         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const result: string = await budgetsRepository.createCategory(userId, category, mockClient as any);

         assertQueryResult(result, categoryId);
      });

      it("should throw error on BEGIN failure", async() => {
         const category = createValidBudgetEntry();
         arrangeCreateCategoryTransactionError("Transaction begin failed", "begin");

         await assertRepositoryThrows(
            () => budgetsRepository.createCategory(userId, category),
            "Transaction begin failed"
         );
         assertTransactionRollback(mockClient, 0);
      });

      it("should rollback on category INSERT failure", async() => {
         const category = createValidBudgetEntry();
         arrangeCreateCategoryTransactionError("Category INSERT failed", "category_insert");

         await assertRepositoryThrows(
            () => budgetsRepository.createCategory(userId, category),
            "Category INSERT failed"
         );
         assertTransactionRollback(mockClient, 1);
      });

      it("should rollback on budget INSERT failure", async() => {
         const category = createValidBudgetEntry();
         arrangeCreateCategoryTransactionError("Budget INSERT failed", "budget_insert");

         await assertRepositoryThrows(
            () => budgetsRepository.createCategory(userId, category),
            "Budget INSERT failed"
         );
         assertTransactionRollback(mockClient, 2);
      });
   });

   describe("updateCategory", () => {
      const mockUpdateData: Partial<BudgetCategory> = {
         name: "Updated Name",
         type: "Income",
         category_order: 2
      };

      /**
       * Asserts update query structure with dynamic field filtering and parameter validation
       */
      const assertUpdateCategoryStructure = (updates: Partial<BudgetCategory>): void => {
         const validFields = ["name", "type", "category_order"].filter(field => field in updates);
         const paramCount = validFields.length;
         const setClauses = validFields.map((field, index) => `${field} = $${index + 1}`);
         const expectedParams: unknown[] = [
            ...validFields.map((field: string) => updates[field as keyof BudgetCategory]),
            userId,
            categoryId
         ];

         assertQueryCalledWithKeyPhrases([
            "UPDATE budget_categories",
            "SET",
            ...setClauses,
            `WHERE user_id = $${paramCount + 1}`,
            `AND budget_category_id = $${paramCount + 2}`,
            "RETURNING budget_category_id"
         ], expectedParams, 0, mockPool);
      };

      it("should update category name successfully", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: categoryId, name: mockUpdateData.name };
         arrangeMockQuery([{ budget_category_id: categoryId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, categoryId, updates);

         assertUpdateCategoryStructure(updates);
         assertQueryResult(result, true);
      });

      it("should update category type successfully", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: categoryId, type: mockUpdateData.type };
         arrangeMockQuery([{ budget_category_id: categoryId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, categoryId, updates);

         assertUpdateCategoryStructure(updates);
         assertQueryResult(result, true);
      });

      it("should update category order successfully", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: categoryId, category_order: mockUpdateData.category_order };
         arrangeMockQuery([{ budget_category_id: categoryId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, categoryId, updates);

         assertUpdateCategoryStructure(updates);
         assertQueryResult(result, true);
      });

      it("should update multiple fields simultaneously", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: categoryId,
            name: mockUpdateData.name,
            type: mockUpdateData.type,
            category_order: mockUpdateData.category_order
         };
         arrangeMockQuery([{ budget_category_id: categoryId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, categoryId, updates);

         assertUpdateCategoryStructure(updates);
         assertQueryResult(result, true);
      });

      it("should return false when category not found", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: categoryId, name: "Updated" };
         arrangeMockQuery([], mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, categoryId, updates);

         assertQueryResult(result, false);
      });

      it("should return true immediately when no valid fields to update", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: categoryId };
         const result: boolean = await budgetsRepository.updateCategory(userId, categoryId, updates);

         assertQueryNotCalled(mockPool);
         assertQueryResult(result, true);
      });

      it("should return false for main category update restriction error", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: categoryId, name: "Invalid" };
         arrangeMockQueryError("Main budget category cannot be updated", mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, categoryId, updates);

         assertQueryResult(result, false);
      });

      it("should throw error on database connection failure", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: categoryId, name: "Updated" };
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => budgetsRepository.updateCategory(userId, categoryId, updates),
            "Database connection failed"
         );
      });
   });

   describe("deleteCategory", () => {
      /**
       * Asserts delete query structure and parameters
       */
      const assertDeleteCategoryStructure = (): void => {
         assertQueryCalledWithKeyPhrases([
            "DELETE FROM budget_categories",
            "WHERE user_id = $1",
            "AND budget_category_id = $2",
            "RETURNING budget_category_id"
         ], [userId, categoryId], 0, mockPool);
      };

      it("should delete category successfully", async() => {
         arrangeMockQuery([{ budget_category_id: categoryId }], mockPool);

         const result: boolean = await budgetsRepository.deleteCategory(userId, categoryId);

         assertDeleteCategoryStructure();
         assertQueryResult(result, true);
      });

      it("should return false when category not found", async() => {
         arrangeMockQuery([], mockPool);

         const result: boolean = await budgetsRepository.deleteCategory(userId, categoryId);

         assertDeleteCategoryStructure();
         assertQueryResult(result, false);
      });

      it("should throw error on database connection failure", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => budgetsRepository.deleteCategory(userId, categoryId),
            "Database connection failed"
         );
         assertDeleteCategoryStructure();
      });
   });

   describe("updateCategoryOrderings", () => {
      /**
       * Asserts bulk update query with dynamic VALUES clause and parameter count validation
       */
      const assertUpdateCategoryOrderingsStructure = (updateCount: number): void => {
         const expectedParamCount = (updateCount * 2) + 1; // (categoryId + order) * count + userId
         const queryCall = mockPool.query.mock.calls[0];
         const sql: string = queryCall[0];
         const params: unknown[] = queryCall[1];

         const hasUpdate = sql.includes("UPDATE budget_categories");
         const hasValues = sql.includes("FROM (VALUES");
         const hasWhere = sql.includes("WHERE budget_categories.budget_category_id");

         assertQueryResult(hasUpdate && hasValues && hasWhere, true);
         assertQueryResult(params.length, expectedParamCount);
      };

      it("should update ordering for single category", async() => {
         const updates: Partial<BudgetCategory>[] = [
            { budget_category_id: categoryIds[0], category_order: 0 }
         ];
         arrangeMockQuery([{ user_id: userId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategoryOrderings(userId, updates);

         assertUpdateCategoryOrderingsStructure(updates.length);
         assertQueryResult(result, true);
      });

      it("should update ordering for multiple categories", async() => {
         const updates: Partial<BudgetCategory>[] = [
            { budget_category_id: categoryIds[0], category_order: 0 },
            { budget_category_id: categoryIds[1], category_order: 1 },
            { budget_category_id: categoryIds[2], category_order: 2 }
         ];
         arrangeMockQuery([{ user_id: userId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategoryOrderings(userId, updates);

         assertUpdateCategoryOrderingsStructure(updates.length);
         assertQueryResult(result, true);
      });

      it("should return false when categories not found", async() => {
         const updates: Partial<BudgetCategory>[] = [
            { budget_category_id: categoryIds[0], category_order: 0 }
         ];
         arrangeMockQuery([], mockPool);

         const result: boolean = await budgetsRepository.updateCategoryOrderings(userId, updates);

         assertUpdateCategoryOrderingsStructure(updates.length);
         assertQueryResult(result, false);
      });

      it("should throw error on database connection failure", async() => {
         const updates: Partial<BudgetCategory>[] = [
            { budget_category_id: categoryIds[0], category_order: 0 }
         ];
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => budgetsRepository.updateCategoryOrderings(userId, updates),
            "Database connection failed"
         );
         assertUpdateCategoryOrderingsStructure(updates.length);
      });
   });

   describe("createBudget", () => {
      /**
       * Arranges transaction flow for successful budget creation
       */
      const arrangeCreateBudgetTransactionSuccess = (): void => {
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            { rows: [{ budget_category_id: categoryId }] }, // Ownership verification
            { rows: [{ budget_category_id: categoryId }] } // Budget INSERT
         ]);
      };

      /**
       * Arranges transaction with error at specific stage
       */
      const arrangeCreateBudgetTransactionError = (errorMessage: string, failStage: "begin" | "ownership_check" | "budget_insert"): void => {
         const error = new Error(errorMessage);

         switch (failStage) {
            case "begin":
               arrangeMockTransactionFlow(mockClient.query, [error]);
               break;
            case "ownership_check":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  error // Ownership verification fails
               ]);
               break;
            case "budget_insert":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [{ budget_category_id: categoryId }] }, // Ownership verification
                  error // Budget INSERT fails
               ]);
               break;
            default:
               throw new Error(`Unknown fail stage: ${failStage}`);
         }
      };

      /**
       * Asserts budget creation query structure
       */
      const assertCreateBudgetStructure = (budget: Budget): void => {
         assertQueryCalledWithKeyPhrases([
            "INSERT INTO budgets (budget_category_id, goal, year, month)",
            "VALUES ($1, $2, $3, $4)",
            "RETURNING budget_category_id"
         ], [budget.budget_category_id, budget.goal, budget.year, budget.month], 2, mockPool);
      };

      it("should create budget successfully with ownership verification", async() => {
         const budget = createValidBudget();
         arrangeCreateBudgetTransactionSuccess();

         const result: boolean = await budgetsRepository.createBudget(userId, budget);

         assertCreateBudgetStructure(budget);
         assertQueryResult(result, true);
      });

      it("should return false when category does not belong to user", async() => {
         const budget = createValidBudget();
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            { rows: [] } // Ownership verification returns empty (not found)
         ]);

         const result: boolean = await budgetsRepository.createBudget(userId, budget);

         assertQueryResult(result, false);
      });

      it("should throw error on BEGIN failure", async() => {
         const budget = createValidBudget();
         arrangeCreateBudgetTransactionError("Transaction begin failed", "begin");

         await assertRepositoryThrows(
            () => budgetsRepository.createBudget(userId, budget),
            "Transaction begin failed"
         );
         assertTransactionRollback(mockClient, 0);
      });

      it("should throw error on ownership verification failure", async() => {
         const budget = createValidBudget();
         arrangeCreateBudgetTransactionError("Ownership check failed", "ownership_check");

         await assertRepositoryThrows(
            () => budgetsRepository.createBudget(userId, budget),
            "Ownership check failed"
         );
         assertTransactionRollback(mockClient, 1);
      });

      it("should rollback on budget INSERT failure", async() => {
         const budget = createValidBudget();
         arrangeCreateBudgetTransactionError("Budget INSERT failed", "budget_insert");

         await assertRepositoryThrows(
            () => budgetsRepository.createBudget(userId, budget),
            "Budget INSERT failed"
         );
         assertTransactionRollback(mockClient, 2);
      });
   });

   describe("updateBudget", () => {
      /**
       * Arranges transaction flow for successful budget update
       */
      const arrangeUpdateBudgetTransactionSuccess = (): void => {
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            { rows: [{ budget_category_id: categoryId }] }, // Ownership verification
            { rows: [{ budget_category_id: categoryId }] } // Budget UPDATE
         ]);
      };

      /**
       * Arranges transaction with error at specific stage
       */
      const arrangeUpdateBudgetTransactionError = (errorMessage: string, failStage: "begin" | "ownership_check" | "budget_update"): void => {
         const error = new Error(errorMessage);

         switch (failStage) {
            case "begin":
               arrangeMockTransactionFlow(mockClient.query, [error]);
               break;
            case "ownership_check":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  error // Ownership verification fails
               ]);
               break;
            case "budget_update":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [{ budget_category_id: categoryId }] }, // Ownership verification
                  error // Budget UPDATE fails
               ]);
               break;
            default:
               throw new Error(`Unknown fail stage: ${failStage}`);
         }
      };

      /**
       * Asserts budget update query structure
       */
      const assertUpdateBudgetStructure = (budget: Budget): void => {
         assertQueryCalledWithKeyPhrases([
            "UPDATE budgets",
            "SET goal = $1",
            "WHERE budget_category_id = $2",
            "AND year = $3",
            "AND month = $4",
            "RETURNING budget_category_id"
         ], [budget.goal, budget.budget_category_id, budget.year, budget.month], 2, mockPool);
      };

      it("should update budget successfully with ownership verification", async() => {
         const budget = createValidBudget();
         arrangeUpdateBudgetTransactionSuccess();

         const result: boolean = await budgetsRepository.updateBudget(userId, categoryId, budget);

         assertUpdateBudgetStructure(budget);
         assertQueryResult(result, true);
      });

      it("should return false when category does not belong to user", async() => {
         const budget = createValidBudget();
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            { rows: [] } // Ownership verification returns empty (not found)
         ]);

         const result: boolean = await budgetsRepository.updateBudget(userId, categoryId, budget);

         assertQueryResult(result, false);
      });

      it("should return false when budget not found for update", async() => {
         const budget = createValidBudget();
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            { rows: [{ budget_category_id: categoryId }] }, // Ownership verification succeeds
            { rows: [] } // Budget UPDATE returns empty (not found)
         ]);

         const result: boolean = await budgetsRepository.updateBudget(userId, categoryId, budget);

         assertQueryResult(result, false);
      });

      it("should throw error on BEGIN failure", async() => {
         const budget = createValidBudget();
         arrangeUpdateBudgetTransactionError("Transaction begin failed", "begin");

         await assertRepositoryThrows(
            () => budgetsRepository.updateBudget(userId, categoryId, budget),
            "Transaction begin failed"
         );
         assertTransactionRollback(mockClient, 0);
      });

      it("should throw error on ownership verification failure", async() => {
         const budget = createValidBudget();
         arrangeUpdateBudgetTransactionError("Ownership check failed", "ownership_check");

         await assertRepositoryThrows(
            () => budgetsRepository.updateBudget(userId, categoryId, budget),
            "Ownership check failed"
         );
         assertTransactionRollback(mockClient, 1);
      });

      it("should rollback on budget UPDATE failure", async() => {
         const budget = createValidBudget();
         arrangeUpdateBudgetTransactionError("Budget UPDATE failed", "budget_update");

         await assertRepositoryThrows(
            () => budgetsRepository.updateBudget(userId, categoryId, budget),
            "Budget UPDATE failed"
         );
         assertTransactionRollback(mockClient, 2);
      });
   });
});