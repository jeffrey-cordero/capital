import { jest } from "@jest/globals";
import { Budget, BudgetCategory, BudgetCategoryGoal, OrganizedBudgets } from "capital/budgets";
import { createValidBudget, createValidBudgetEntry, TEST_BUDGET_CATEGORY_IDS } from "capital/mocks/budgets";
import { TEST_USER_ID } from "capital/mocks/user";

import {
   arrangeMockQuery,
   arrangeMockQueryError,
   arrangeMockTransactionFlow,
   assertQueryCalledWithKeyPhrases,
   assertQueryNotCalled,
   assertQueryResult,
   assertRepositoryThrows,
   assertTransactionResult,
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
import { PoolClient } from "pg";

describe("Budgets Repository", () => {
   const userId: string = TEST_USER_ID;
   const [mainIncomeCategoryId, subIncomeCategoryId, mainExpensesCategoryId, subExpensesCategoryId] = TEST_BUDGET_CATEGORY_IDS;

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
         // Ordering of Income/Expenses records should not affect the overall structure of the organized budgets
         const mockRows = [
            {
               budget_category_id: mainExpensesCategoryId,
               name: null,
               type: "Expenses",
               category_order: null,
               goal: 3000.00,
               year: 2024,
               month: 11
            },
            {
               budget_category_id: mainIncomeCategoryId,
               name: null,
               type: "Income",
               category_order: null,
               goal: 5000.00,
               year: 2024,
               month: 11
            },
            {
               budget_category_id: subIncomeCategoryId,
               name: "Salary",
               type: "Income",
               category_order: 0,
               goal: 3000.00,
               year: 2024,
               month: 11
            },
            {
               budget_category_id: subExpensesCategoryId,
               name: "Groceries",
               type: "Expenses",
               category_order: 0,
               goal: 500.00,
               year: 2024,
               month: 11
            },
            {
               budget_category_id: subIncomeCategoryId,
               name: "Salary",
               type: "Income",
               category_order: 0,
               goal: 2500.00,
               year: 2024,
               month: 10
            }
         ];

         arrangeMockQuery(mockRows, mockPool);

         const result: OrganizedBudgets = await budgetsRepository.findByUserId(userId);

         // Build expected structure to validate complete transformation for both Income and Expenses
         const expectedIncome = {
            goals: [{ goal: 5000.00, year: 2024, month: 11 }],
            goalIndex: 0,
            budget_category_id: mainIncomeCategoryId,
            categories: [
               {
                  budget_category_id: subIncomeCategoryId,
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
            goals: [{ goal: 3000.00, year: 2024, month: 11 }],
            goalIndex: 0,
            budget_category_id: mainExpensesCategoryId,
            categories: [
               {
                  budget_category_id: subExpensesCategoryId,
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

         assertFindByUserIdStructure();
         assertQueryResult(result, { Income: expectedIncome, Expenses: expectedExpenses });
      });

      it("should return empty budgets when user has no categories", async() => {
         arrangeMockQuery([], mockPool);

         const result: OrganizedBudgets = await budgetsRepository.findByUserId(userId);

         const expectedEmpty = {
            goals: [],
            goalIndex: 0,
            budget_category_id: "",
            categories: []
         };

         assertFindByUserIdStructure();
         assertQueryResult(result, { Income: expectedEmpty, Expenses: expectedEmpty });
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
       *
       * @param {MockClient} [client=mockClient] - The mock client to use for transaction flow
       * @param {boolean} [isNested=false] - Whether this is a nested transaction (skips BEGIN)
       */
      const arrangeCreateCategoryTransactionSuccess = (client: MockClient = mockClient, isNested: boolean = false): void => {
         const categoryInsert = { rows: [{ budget_category_id: mainIncomeCategoryId }] }; // Category INSERT
         const budgetInsert = {}; // Budget INSERT
         const flow = isNested
            ? [categoryInsert, budgetInsert]
            : [{}, // BEGIN
               categoryInsert, // Category INSERT
               budgetInsert]; // Budget INSERT
         arrangeMockTransactionFlow(client.query, flow);
      };

      /**
       * Arranges transaction with error at specific stage
       *
       * @param {"begin" | "category_insert" | "budget_insert"} failStage - The transaction stage where error should occur
       */
      const arrangeCreateCategoryTransactionError = (failStage: "begin" | "category_insert" | "budget_insert"): void => {
         switch (failStage) {
            case "begin":
               arrangeMockTransactionFlow(mockClient.query, [new Error("Transaction begin failed")]);
               break;
            case "category_insert":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  new Error("Category INSERT failed")
               ]);
               break;
            case "budget_insert":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [{ budget_category_id: mainIncomeCategoryId }] }, // Category INSERT
                  new Error("Budget INSERT failed")
               ]);
               break;
            default:
               throw new Error(`Unknown fail stage: ${failStage}`);
         }
      };

      /**
       * Asserts category creation query structure
       *
       * @param {Omit<BudgetCategoryGoal, "budget_category_id">} category - The category data to validate in the query
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
         assertTransactionResult(result, mainIncomeCategoryId, mockClient, 2);
      });

      it("should create category with external client for nested transaction", async() => {
         const category = createValidBudgetEntry();
         arrangeCreateCategoryTransactionSuccess(mockClient, true);

         const result: string = await budgetsRepository.createCategory(userId, category, mockClient as unknown as PoolClient);

         assertTransactionResult(result, mainIncomeCategoryId, mockClient, 2, true);
      });

      it("should throw error on BEGIN failure", async() => {
         const category = createValidBudgetEntry();
         arrangeCreateCategoryTransactionError("begin");

         await assertRepositoryThrows(
            () => budgetsRepository.createCategory(userId, category),
            "Transaction begin failed"
         );
         assertTransactionRollback(mockClient, 0);
      });

      it("should rollback on category INSERT failure", async() => {
         const category = createValidBudgetEntry();
         arrangeCreateCategoryTransactionError("category_insert");

         await assertRepositoryThrows(
            () => budgetsRepository.createCategory(userId, category),
            "Category INSERT failed"
         );
         assertTransactionRollback(mockClient, 1);
      });

      it("should rollback on budget INSERT failure", async() => {
         const category = createValidBudgetEntry();
         arrangeCreateCategoryTransactionError("budget_insert");

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
       *
       * @param {Partial<BudgetCategory>} updates - The partial budget category updates to validate in the query
       */
      const assertUpdateCategoryStructure = (updates: Partial<BudgetCategory>): void => {
         const validFields = ["name", "type", "category_order"].filter(field => field in updates);
         const paramCount = validFields.length;
         const setClauses = validFields.map((field, index) => `${field} = $${index + 1}`);
         const expectedParams: unknown[] = [
            ...validFields.map((field: string) => updates[field as keyof BudgetCategory]),
            userId,
            mainIncomeCategoryId
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
         const updates: Partial<BudgetCategory> = { budget_category_id: mainIncomeCategoryId, name: mockUpdateData.name };
         arrangeMockQuery([{ budget_category_id: mainIncomeCategoryId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, mainIncomeCategoryId, updates);

         assertUpdateCategoryStructure(updates);
         assertQueryResult(result, true);
      });

      it("should update category type successfully", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: mainIncomeCategoryId, type: mockUpdateData.type };
         arrangeMockQuery([{ budget_category_id: mainIncomeCategoryId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, mainIncomeCategoryId, updates);

         assertUpdateCategoryStructure(updates);
         assertQueryResult(result, true);
      });

      it("should update category order successfully", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: mainIncomeCategoryId, category_order: mockUpdateData.category_order };
         arrangeMockQuery([{ budget_category_id: mainIncomeCategoryId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, mainIncomeCategoryId, updates);

         assertUpdateCategoryStructure(updates);
         assertQueryResult(result, true);
      });

      it("should update multiple fields simultaneously", async() => {
         const updates: Partial<BudgetCategory> = {
            budget_category_id: mainIncomeCategoryId,
            name: mockUpdateData.name,
            type: mockUpdateData.type,
            category_order: mockUpdateData.category_order
         };
         arrangeMockQuery([{ budget_category_id: mainIncomeCategoryId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, mainIncomeCategoryId, updates);

         assertUpdateCategoryStructure(updates);
         assertQueryResult(result, true);
      });

      it("should return false when category not found", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: mainIncomeCategoryId, name: "Updated" };
         arrangeMockQuery([], mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, mainIncomeCategoryId, updates);

         assertQueryResult(result, false);
      });

      it("should return true immediately when no valid fields to update", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: mainIncomeCategoryId };
         const result: boolean = await budgetsRepository.updateCategory(userId, mainIncomeCategoryId, updates);

         assertQueryNotCalled(mockPool);
         assertQueryResult(result, true);
      });

      it("should return false for main category update restriction error", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: mainIncomeCategoryId, name: "Invalid" };
         arrangeMockQueryError("Main budget category cannot be updated", mockPool);

         const result: boolean = await budgetsRepository.updateCategory(userId, mainIncomeCategoryId, updates);

         assertQueryResult(result, false);
      });

      it("should throw error on database connection failure", async() => {
         const updates: Partial<BudgetCategory> = { budget_category_id: mainIncomeCategoryId, name: "Updated" };
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => budgetsRepository.updateCategory(userId, mainIncomeCategoryId, updates),
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
         ], [userId, mainIncomeCategoryId], 0, mockPool);
      };

      it("should delete category successfully", async() => {
         arrangeMockQuery([{ budget_category_id: mainIncomeCategoryId }], mockPool);

         const result: boolean = await budgetsRepository.deleteCategory(userId, mainIncomeCategoryId);

         assertDeleteCategoryStructure();
         assertQueryResult(result, true);
      });

      it("should return false when category not found", async() => {
         arrangeMockQuery([], mockPool);

         const result: boolean = await budgetsRepository.deleteCategory(userId, mainIncomeCategoryId);

         assertDeleteCategoryStructure();
         assertQueryResult(result, false);
      });

      it("should throw error on database connection failure", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => budgetsRepository.deleteCategory(userId, mainIncomeCategoryId),
            "Database connection failed"
         );
         assertDeleteCategoryStructure();
      });
   });

   describe("updateCategoryOrderings", () => {
      /**
       * Asserts bulk update query structure, parameters, and call order
       *
       * @param {Partial<BudgetCategory>[]} updates - Array of partial budget category updates to validate in the query
       */
      const assertUpdateCategoryOrderingsStructure = (updates: Partial<BudgetCategory>[]): void => {
         const expectedParams: unknown[] = [];
         updates.forEach(update => {
            expectedParams.push(update.budget_category_id);
            expectedParams.push(update.category_order);
         });
         expectedParams.push(userId);

         assertQueryCalledWithKeyPhrases([
            "UPDATE budget_categories",
            "FROM (VALUES",
            "SET category_order",
            "WHERE budget_categories.budget_category_id"
         ], expectedParams, 0, mockPool);
      };

      it("should update ordering for single category", async() => {
         const updates: Partial<BudgetCategory>[] = [
            { budget_category_id: mainIncomeCategoryId, category_order: 0 }
         ];
         arrangeMockQuery([{ user_id: userId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategoryOrderings(userId, updates);

         assertUpdateCategoryOrderingsStructure(updates);
         assertQueryResult(result, true);
      });

      it("should update ordering for multiple categories", async() => {
         const updates: Partial<BudgetCategory>[] = [
            { budget_category_id: mainIncomeCategoryId, category_order: 0 },
            { budget_category_id: subIncomeCategoryId, category_order: 1 },
            { budget_category_id: mainExpensesCategoryId, category_order: 2 }
         ];
         arrangeMockQuery([{ user_id: userId }], mockPool);

         const result: boolean = await budgetsRepository.updateCategoryOrderings(userId, updates);

         assertUpdateCategoryOrderingsStructure(updates);
         assertQueryResult(result, true);
      });

      it("should return false when categories not found", async() => {
         const updates: Partial<BudgetCategory>[] = [
            { budget_category_id: mainIncomeCategoryId, category_order: 0 }
         ];
         arrangeMockQuery([], mockPool);

         const result: boolean = await budgetsRepository.updateCategoryOrderings(userId, updates);

         assertUpdateCategoryOrderingsStructure(updates);
         assertQueryResult(result, false);
      });

      it("should throw error on database connection failure", async() => {
         const updates: Partial<BudgetCategory>[] = [
            { budget_category_id: mainIncomeCategoryId, category_order: 0 }
         ];
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => budgetsRepository.updateCategoryOrderings(userId, updates),
            "Database connection failed"
         );
         assertUpdateCategoryOrderingsStructure(updates);
      });
   });

   describe("createBudget", () => {
      /**
       * Arranges transaction flow for successful budget creation
       *
       * @param {MockClient} [client=mockClient] - The mock client to use for transaction flow
       * @param {boolean} [isNested=false] - Whether this is a nested transaction (skips BEGIN)
       */
      const arrangeCreateBudgetTransactionSuccess = (client: MockClient = mockClient, isNested: boolean = false): void => {
         const ownershipVerification = { rows: [{ budget_category_id: mainIncomeCategoryId }] }; // Ownership verification
         const budgetInsert = { rows: [{ budget_category_id: mainIncomeCategoryId }] }; // Budget INSERT
         const flow = isNested
            ? [ownershipVerification, budgetInsert]
            : [{}, // BEGIN
               ownershipVerification, // Ownership verification
               budgetInsert]; // Budget INSERT
         arrangeMockTransactionFlow(client.query, flow);
      };

      /**
       * Arranges transaction with error or empty rows at specific stage
       *
       * @param {"begin" | "ownership_check_error" | "ownership_check_empty" | "budget_insert_error"} failStage - The transaction stage where error/empty rows occur
       */
      const arrangeCreateBudgetTransactionError = (failStage: "begin" | "ownership_check_error" | "ownership_check_empty" | "budget_insert_error"): void => {
         switch (failStage) {
            case "begin":
               arrangeMockTransactionFlow(mockClient.query, [new Error("Transaction begin failed")]);
               break;
            case "ownership_check_error":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  new Error("Ownership check failed")
               ]);
               break;
            case "ownership_check_empty":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [] } // Ownership verification returns empty (not found)
               ]);
               break;
            case "budget_insert_error":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [{ budget_category_id: mainIncomeCategoryId }] }, // Ownership verification
                  new Error("Budget INSERT failed")
               ]);
               break;
            default:
               throw new Error(`Unknown fail stage: ${failStage}`);
         }
      };

      /**
       * Asserts budget creation query structure
       *
       * @param {Budget} budget - The budget data to validate in the query
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
         assertTransactionResult(result, true, mockClient, 2);
      });

      it("should return false when category does not belong to user", async() => {
         const budget = createValidBudget();
         arrangeCreateBudgetTransactionError("ownership_check_empty");

         const result: boolean = await budgetsRepository.createBudget(userId, budget);

         assertQueryResult(result, false);
      });

      it("should throw error on BEGIN failure", async() => {
         const budget = createValidBudget();
         arrangeCreateBudgetTransactionError("begin");

         await assertRepositoryThrows(
            () => budgetsRepository.createBudget(userId, budget),
            "Transaction begin failed"
         );
         assertTransactionRollback(mockClient, 0);
      });

      it("should throw error on ownership verification failure", async() => {
         const budget = createValidBudget();
         arrangeCreateBudgetTransactionError("ownership_check_error");

         await assertRepositoryThrows(
            () => budgetsRepository.createBudget(userId, budget),
            "Ownership check failed"
         );
         assertTransactionRollback(mockClient, 1);
      });

      it("should rollback on budget INSERT failure", async() => {
         const budget = createValidBudget();
         arrangeCreateBudgetTransactionError("budget_insert_error");

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
       *
       * @param {MockClient} [client=mockClient] - The mock client to use for transaction flow
       * @param {boolean} [isNested=false] - Whether this is a nested transaction (skips BEGIN)
       */
      const arrangeUpdateBudgetTransactionSuccess = (client: MockClient = mockClient, isNested: boolean = false): void => {
         const ownershipVerification = { rows: [{ budget_category_id: subIncomeCategoryId }] }; // Ownership verification
         const budgetUpdate = { rows: [{ budget_category_id: subIncomeCategoryId }] }; // Budget UPDATE
         const flow = isNested
            ? [ownershipVerification, budgetUpdate]
            : [{}, // BEGIN
               ownershipVerification, // Ownership verification
               budgetUpdate]; // Budget UPDATE
         arrangeMockTransactionFlow(client.query, flow);
      };

      /**
       * Arranges transaction with error or empty rows at specific stage
       *
       * @param {"begin" | "ownership_check_error" | "ownership_check_empty" | "budget_update_error" | "budget_update_empty"} failStage - The transaction stage where error/empty rows occur
       */
      const arrangeUpdateBudgetTransactionError = (failStage: "begin" | "ownership_check_error" | "ownership_check_empty" | "budget_update_error" | "budget_update_empty"): void => {
         switch (failStage) {
            case "begin":
               arrangeMockTransactionFlow(mockClient.query, [new Error("Transaction begin failed")]);
               break;
            case "ownership_check_error":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  new Error("Ownership check failed")
               ]);
               break;
            case "ownership_check_empty":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [] } // Ownership verification returns empty (not found)
               ]);
               break;
            case "budget_update_error":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [{ budget_category_id: subIncomeCategoryId }] }, // Ownership verification
                  new Error("Budget UPDATE failed")
               ]);
               break;
            case "budget_update_empty":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [{ budget_category_id: subIncomeCategoryId }] }, // Ownership verification succeeds
                  { rows: [] } // Budget UPDATE returns empty (not found)
               ]);
               break;
            default:
               throw new Error(`Unknown fail stage: ${failStage}`);
         }
      };

      /**
       * Asserts budget update query structure
       *
       * @param {Budget} budget - The budget data to validate in the query
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

         const result: boolean = await budgetsRepository.updateBudget(userId, subIncomeCategoryId, budget);

         assertUpdateBudgetStructure(budget);
         assertTransactionResult(result, true, mockClient, 2);
      });

      it("should return false when category does not belong to user", async() => {
         const budget = createValidBudget();
         arrangeUpdateBudgetTransactionError("ownership_check_empty");

         const result: boolean = await budgetsRepository.updateBudget(userId, subIncomeCategoryId, budget);

         assertQueryResult(result, false);
      });

      it("should return false when budget not found for update", async() => {
         const budget = createValidBudget();
         arrangeUpdateBudgetTransactionError("budget_update_empty");

         const result: boolean = await budgetsRepository.updateBudget(userId, subIncomeCategoryId, budget);

         assertQueryResult(result, false);
      });

      it("should throw error on BEGIN failure", async() => {
         const budget = createValidBudget();
         arrangeUpdateBudgetTransactionError("begin");

         await assertRepositoryThrows(
            () => budgetsRepository.updateBudget(userId, subIncomeCategoryId, budget),
            "Transaction begin failed"
         );
         assertTransactionRollback(mockClient, 0);
      });

      it("should throw error on ownership verification failure", async() => {
         const budget = createValidBudget();
         arrangeUpdateBudgetTransactionError("ownership_check_error");

         await assertRepositoryThrows(
            () => budgetsRepository.updateBudget(userId, subIncomeCategoryId, budget),
            "Ownership check failed"
         );
         assertTransactionRollback(mockClient, 1);
      });

      it("should rollback on budget UPDATE failure", async() => {
         const budget = createValidBudget();
         arrangeUpdateBudgetTransactionError("budget_update_error");

         await assertRepositoryThrows(
            () => budgetsRepository.updateBudget(userId, subIncomeCategoryId, budget),
            "Budget UPDATE failed"
         );
         assertTransactionRollback(mockClient, 2);
      });
   });
});