import { jest } from "@jest/globals";
import { createValidTransaction, TEST_TRANSACTION_ID, TEST_TRANSACTION_IDS } from "capital/mocks/transactions";
import { TEST_USER_ID } from "capital/mocks/user";
import { Transaction } from "capital/transactions";

import {
   arrangeAndAssertUpdateQueries,
   arrangeMockQuery,
   arrangeMockQueryError,
   assertQueryCalledWithKeyPhrases,
   assertQueryNotCalled,
   assertQueryResult,
   assertRepositoryThrows,
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

import * as transactionsRepository from "@/repository/transactionsRepository";
import { TRANSACTION_UPDATES } from "@/repository/transactionsRepository";

describe("Transactions Repository", () => {
   const userId: string = TEST_USER_ID;
   const transactionId: string = TEST_TRANSACTION_ID;
   const transactionIds: string[] = TEST_TRANSACTION_IDS;

   let mockPool: MockPool;
   let mockClient: MockClient;

   beforeEach(async() => {
      mockPool = createMockPool();
      mockClient = createMockClient();
      resetDatabaseMocks(globalMockPool, mockPool, mockClient);
   });

   describe("findByUserId", () => {
      /**
		 * Asserts the user ID lookup query was called with the proper structure and exact parameters
		 *
		 * @param {string} userId - Expected `user_id` parameter
		 */
      const assertFindByUserIdStructure = (userId: string): void => {
         assertQueryCalledWithKeyPhrases([
            "SELECT transaction_id, amount, description, date, type, budget_category_id, account_id",
            "FROM transactions",
            "WHERE user_id = $1",
            "ORDER BY date DESC"
         ], [userId], 0, mockPool);
      };

      it("should return transactions with amount conversion from string to number", async() => {
         const mockTransactions = [
            {
               transaction_id: TEST_TRANSACTION_ID,
               // The actual database returns a string for the decimal amount
               amount: "100.00",
               description: "Test Transaction",
               date: new Date().toISOString(),
               type: "Income",
               budget_category_id: null,
               account_id: null
            },
            {
               transaction_id: TEST_TRANSACTION_IDS[0],
               amount: "250.50",
               description: "Another Transaction",
               date: new Date().toISOString(),
               type: "Expenses",
               budget_category_id: "550e8400-e29b-41d4-a716-446655440025",
               account_id: "550e8400-e29b-41d4-a716-446655440026"
            }
         ];
         arrangeMockQuery(mockTransactions, mockPool);

         const result: Transaction[] = await transactionsRepository.findByUserId(userId);

         assertFindByUserIdStructure(userId);

         // Assert the amounts are converted to numbers
         expect(result[0].amount).toBe(100.00);
         expect(result[1].amount).toBe(250.50);
      });

      it("should return empty array when user has no transactions", async() => {
         arrangeMockQuery([], mockPool);

         const result: Transaction[] = await transactionsRepository.findByUserId(userId);

         assertFindByUserIdStructure(userId);
         assertQueryResult(result, []);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => transactionsRepository.findByUserId(userId),
            "Database connection failed"
         );
         assertFindByUserIdStructure(userId);
      });
   });

   describe("create", () => {
      /**
		 * Asserts the transaction creation query was called with the proper structure and exact parameters
		 *
		 * @param {string} userId - Expected `user_id` parameter
		 * @param {Transaction} transaction - Expected transaction data
		 */
      const assertCreateStructure = (userId: string, transaction: Transaction): void => {
         assertQueryCalledWithKeyPhrases([
            "INSERT INTO transactions (user_id, amount, description, date, type, budget_category_id, account_id)",
            "VALUES ($1, $2, $3, $4, $5, $6, $7)",
            "RETURNING transaction_id"
         ], [
            userId,
            transaction.amount,
            transaction.description,
            transaction.date,
            transaction.type,
            transaction.budget_category_id || null,
            transaction.account_id || null
         ], 0, mockPool);
      };

      it("should create transaction and return transaction_id", async() => {
         const transaction: Transaction = createValidTransaction({ transaction_id: transactionId });
         arrangeMockQuery([{ transaction_id: transactionId }], mockPool);

         const result: string = await transactionsRepository.create(userId, transaction);

         assertCreateStructure(userId, transaction);
         assertQueryResult(result, transactionId);
      });

      it("should handle null budget_category_id and account_id properly", async() => {
         const transaction: Transaction = createValidTransaction({
            transaction_id: transactionId,
            budget_category_id: null,
            account_id: null
         });
         arrangeMockQuery([{ transaction_id: transactionId }], mockPool);

         const result: string = await transactionsRepository.create(userId, transaction);

         assertCreateStructure(userId, transaction);
         assertQueryResult(result, transactionId);
      });

      it("should throw error when database connection fails", async() => {
         const transaction: Transaction = createValidTransaction({ transaction_id: transactionId });
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => transactionsRepository.create(userId, transaction),
            "Database connection failed"
         );
         assertCreateStructure(userId, transaction);
      });
   });

   describe("update", () => {
      /**
		 * Arranges and asserts a transaction update query with the proper structure and exact parameters
		 *
		 * @param {Partial<Transaction>} updates - Fields being updated
		 */
      const arrangeAndAssertTransactionUpdate = async(updates: Partial<Transaction>): Promise<void> => {
         await arrangeAndAssertUpdateQueries(
            "transactions",
            updates,
            "user_id",
            userId,
            transactionsRepository.update,
            mockPool,
            "transaction_id",
            transactionId,
            TRANSACTION_UPDATES
         );
      };

      /**
		 * Asserts the transaction update query was called with the proper structure and exact parameters
		 *
		 * @param {Partial<Transaction>} updates - Valid fields being updated (after filtering)
		 * @param {string} userId - Expected user_id parameter
		 * @param {string} transactionId - Expected transaction_id parameter
		 */
      const assertUpdateStructure = (updates: Partial<Transaction>, userId: string, transactionId: string): void => {
         const validFields: string[] = TRANSACTION_UPDATES.filter(field => field in updates);
         const paramCount: number = validFields.length;
         const setClauses: string[] = validFields.map((field, index) => `${field} = $${index + 1}`);
         const expectedParams: unknown[] = [...validFields.map((field: string) => {
            const value = updates[field as keyof Transaction];

            // Handle empty string or null conversion for optional foreign keys
            if ((field === "budget_category_id" || field === "account_id") && value === "") {
               return null;
            }

            return value;
         }),
         userId,
         transactionId
         ];

         assertQueryCalledWithKeyPhrases([
            "UPDATE transactions",
            "SET",
            ...setClauses,
            `WHERE user_id = $${paramCount + 1}`,
            `AND transaction_id = $${paramCount + 2}`,
            "RETURNING transaction_id"
         ], expectedParams, 0, mockPool);
      };

      const mockUpdateValues = {
         amount: 250.00,
         description: "Updated Description",
         date: new Date().toISOString(),
         type: "Expenses" as const,
         budget_category_id: "550e8400-e29b-41d4-a716-446655440025",
         account_id: "550e8400-e29b-41d4-a716-446655440026"
      };

      TRANSACTION_UPDATES.forEach((field) => {
         it(`should update the ${field} field only`, async() => {
            await arrangeAndAssertTransactionUpdate({ [field]: mockUpdateValues[field] });
         });
      });

      it("should update all updatable fields", async() => {
         await arrangeAndAssertTransactionUpdate(mockUpdateValues);
      });

      it("should not perform any updates and return true when no fields are provided", async() => {
         const result: boolean = await transactionsRepository.update(userId, transactionId, {});

         assertQueryNotCalled(mockPool);
         assertQueryResult(result, true);
      });

      it("should return false when transaction does not exist", async() => {
         arrangeMockQuery([], mockPool);

         const result: boolean = await transactionsRepository.update(userId, transactionId, { amount: 200.00 });

         assertQueryResult(result, false);
      });

      it("should throw error when database connection fails", async() => {
         const updates = { amount: 200.00 };
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => transactionsRepository.update(userId, transactionId, updates),
            "Database connection failed"
         );
         assertUpdateStructure(updates, userId, transactionId);
      });

      it("should filter out invalid fields and only update valid ones", async() => {
         const updates = {
            amount: 200.00,
            invalidField: "should be ignored",
            anotherInvalidField: 123
         };
         arrangeMockQuery([{ transaction_id: transactionId }], mockPool);

         const result: boolean = await transactionsRepository.update(userId, transactionId, updates);

         assertQueryResult(result, true);

         // Assert only valid transaction update fields are included in the query
         const validUpdates = { amount: 200.00 };
         assertUpdateStructure(validUpdates, userId, transactionId);
      });

      const edgeCases = [
         { value: "", description: "empty string converts to null", expectedInQuery: null },
         { value: null, description: "null remains unchanged", expectedInQuery: null },
         { value: "550e8400-e29b-41d4-a716-446655440027", description: "valid UUID", expectedInQuery: "550e8400-e29b-41d4-a716-446655440027" }
      ];

      ["budget_category_id", "account_id"].forEach((field) => {
         edgeCases.forEach(({ value, description, expectedInQuery }) => {
            it(`should handle ${field} with ${description}`, async() => {
               const updates = { [field]: value };
               arrangeMockQuery([{ transaction_id: transactionId }], mockPool);

               const result: boolean = await transactionsRepository.update(userId, transactionId, updates);

               assertQueryResult(result, true);

               // Assert the expected value is included in the query
               const expectedUpdates = { [field]: expectedInQuery };
               assertUpdateStructure(expectedUpdates, userId, transactionId);
            });
         });
      });
   });

   describe("deleteTransactions", () => {
      /**
		 * Asserts the transaction deletion query was called with the proper structure and exact parameters
		 *
		 * @param {string} userId - Expected `user_id` parameter
		 * @param {string[]} transactionIds - Expected transaction IDs array parameter
		 */
      const assertDeleteTransactionsStructure = (userId: string, transactionIds: string[]): void => {
         assertQueryCalledWithKeyPhrases([
            "DELETE FROM transactions",
            "WHERE user_id = $1",
            "AND transaction_id = ANY($2)",
            "RETURNING transaction_id"
         ], [userId, transactionIds], 0, mockPool);
      };

      it("should delete single transaction successfully", async() => {
         const singleId: string[] = [transactionId];
         arrangeMockQuery([{ transaction_id: transactionId }], mockPool);

         const result: boolean = await transactionsRepository.deleteTransactions(userId, singleId);

         assertDeleteTransactionsStructure(userId, singleId);
         assertQueryResult(result, true);
      });

      it("should delete multiple transactions successfully", async() => {
         arrangeMockQuery(
            transactionIds.map(id => ({ transaction_id: id })),
            mockPool
         );

         const result: boolean = await transactionsRepository.deleteTransactions(userId, transactionIds);

         assertDeleteTransactionsStructure(userId, transactionIds);
         assertQueryResult(result, true);
      });

      it("should return false when no transactions found", async() => {
         arrangeMockQuery([], mockPool);

         const result: boolean = await transactionsRepository.deleteTransactions(userId, transactionIds);

         assertDeleteTransactionsStructure(userId, transactionIds);
         assertQueryResult(result, false);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => transactionsRepository.deleteTransactions(userId, transactionIds),
            "Database connection failed"
         );
         assertDeleteTransactionsStructure(userId, transactionIds);
      });
   });
});