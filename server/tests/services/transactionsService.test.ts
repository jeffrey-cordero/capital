import {
   createMockTransactions,
   createValidTransaction,
   TEST_TRANSACTION_ID,
   TEST_TRANSACTION_IDS,
   VALID_TRANSACTION
} from "capital/mocks/transactions";
import { TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import { Transaction } from "capital/transactions";

import * as transactionsService from "@/services/transactionsService";
import { TRANSACTION_CACHE_DURATION } from "@/services/transactionsService";
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
jest.mock("@/repository/transactionsRepository");

describe("Transactions Service", () => {
   const userId: string = TEST_USER_ID;
   const transactionId: string = TEST_TRANSACTION_ID;
   const transactionIds: string[] = TEST_TRANSACTION_IDS;
   const transactionsCacheKey: string = `transactions:${userId}`;

   let redis: typeof import("@/lib/redis");
   let transactionsRepository: typeof import("@/repository/transactionsRepository");

   /**
	 * Asserts transaction validation error response for create/update operations
	 *
	 * @param {ServerResponse} result - Service response result
	 * @param {Record<string, string>} expectedErrors - Expected validation errors
	 */
   const assertTransactionValidationErrorResponse = (
      result: ServerResponse,
      expectedErrors: Record<string, string>
   ): void => {
      assertMethodsNotCalled([
         { module: transactionsRepository, methods: ["create", "update", "deleteTransactions", "findByUserId"] },
         { module: redis, methods: ["removeCacheValue"] }
      ]);
      assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, expectedErrors);
   };

   /**
	 * Asserts transaction cache hit behavior - cache read, no repository call, no cache write
	 */
   const assertTransactionCacheHitBehavior = (): void => {
      assertCacheHitBehavior(redis, transactionsRepository, "findByUserId", transactionsCacheKey);
   };

   /**
	 * Asserts transaction cache miss behavior - cache read, repository call, cache write
	 *
	 * @param {string} userId - Expected user ID
	 * @param {Transaction[]} expectedTransactions - Expected transactions data
	 */
   const assertTransactionCacheMissBehavior = (userId: string, expectedTransactions: Transaction[]): void => {
      assertCacheMissBehavior(
         redis,
         transactionsRepository,
         "findByUserId",
         transactionsCacheKey,
         userId,
         expectedTransactions,
         TRANSACTION_CACHE_DURATION
      );
   };

   /**
	 * Asserts transaction operation success - repository call and cache invalidation
	 *
	 * @param {string} repositoryMethod - Repository method name
	 * @param {unknown[]} expectedParams - Expected parameters for repository call
	 */
   const assertTransactionOperationSuccess = (repositoryMethod: string, expectedParams: unknown[]): void => {
      assertRepositoryCall(transactionsRepository, repositoryMethod, expectedParams);
      assertCacheInvalidation(redis, transactionsCacheKey);
   };

   beforeEach(async() => {
      jest.clearAllMocks();

      transactionsRepository = await import("@/repository/transactionsRepository");
      redis = await import("@/lib/redis");

      arrangeDefaultRedisCacheBehavior(redis);
   });

   describe("fetchTransactions", () => {
      it("should return cached transactions on cache hit", async() => {
         const cachedTransactions: Transaction[] = createMockTransactions();
         const cachedData: string = JSON.stringify(cachedTransactions);
         arrangeMockCacheHit(redis, cachedData);

         const result: ServerResponse = await transactionsService.fetchTransactions(userId);

         assertTransactionCacheHitBehavior();
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, cachedTransactions);
      });

      it("should fetch from database and cache on cache miss", async() => {
         const mockTransactions: Transaction[] = createMockTransactions();
         arrangeMockCacheMiss(redis);
         arrangeMockRepositorySuccess(transactionsRepository, "findByUserId", mockTransactions);

         const result: ServerResponse = await transactionsService.fetchTransactions(userId);

         assertTransactionCacheMissBehavior(userId, mockTransactions);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, mockTransactions);
      });

      it("should handle repository errors during fetch", async() => {
         arrangeMockCacheMiss(redis);
         arrangeMockRepositoryError(transactionsRepository, "findByUserId", "Database connection failed");

         await assertServiceThrows(
            () => transactionsService.fetchTransactions(userId),
            "Database connection failed"
         );

         assertRepositoryCall(transactionsRepository, "findByUserId", [userId]);
      });
   });

   describe("createTransaction", () => {
      it("should create transaction successfully with valid data", async() => {
         arrangeMockRepositorySuccess(transactionsRepository, "create", transactionId);

         const result: ServerResponse = await transactionsService.createTransaction(userId, VALID_TRANSACTION);

         assertTransactionOperationSuccess("create", [userId, VALID_TRANSACTION]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { transaction_id: transactionId });
      });

      const requiredFields: (keyof Transaction)[] = ["type", "date", "amount"];

      requiredFields.forEach((field) => {
         it(`should return validation error for missing ${field} field`, async() => {
            const invalidTransaction = { ...VALID_TRANSACTION, [field]: undefined };

            const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

            const fieldName: string = field.replace(/_/g, " ");
            const identifier: string = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
            assertTransactionValidationErrorResponse(result, { [field]: `${identifier} is required` });
         });
      });

      it("should return validation error for negative amount", async() => {
         const invalidTransaction = createValidTransaction({ amount: -100 });

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { amount: "Amount must be at least $1" });
      });

      it("should return validation error for amount exceeding maximum", async() => {
         const invalidTransaction = createValidTransaction({ amount: 1_000_000_000_000 });

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { amount: "Amount exceeds the maximum allowed value" });
      });

      it("should return validation error for non-numeric amount", async() => {
         const invalidTransaction = { ...VALID_TRANSACTION, amount: "not-a-number" };

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { amount: "Amount must be a valid currency amount" });
      });

      it("should return validation error for amount with more than 2 decimals", async() => {
         const invalidTransaction = { ...VALID_TRANSACTION, amount: 100.123 };

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { amount: "Amount must be a valid currency amount" });
      });

      it("should return validation error for description exceeding 255 characters", async() => {
         const invalidTransaction = createValidTransaction({ description: "a".repeat(256) });

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { description: "Description must be at most 255 characters" });
      });

      it("should return validation error for invalid transaction type", async() => {
         const invalidTransaction = { ...VALID_TRANSACTION, type: "InvalidType" } as unknown as Transaction;

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { type: "Transaction type must be either Income or Expenses" });
      });

      it("should return validation error for date before 1800-01-01", async() => {
         const invalidTransaction = createValidTransaction({ date: new Date("1799-12-31").toISOString() });

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { date: "Date must be on or after 1800-01-01" });
      });

      it("should return validation error for date in the future", async() => {
         const futureDate = new Date();
         futureDate.setFullYear(futureDate.getFullYear() + 1);
         const invalidTransaction = createValidTransaction({ date: futureDate.toISOString() });

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { date: "Date cannot be in the future" });
      });

      it("should return validation error for invalid date format", async() => {
         const invalidTransaction = { ...VALID_TRANSACTION, date: "invalid-date" };

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { date: "Date must be a valid date" });
      });

      it("should return validation error for invalid transaction_id UUID", async() => {
         const invalidTransaction = createValidTransaction({ transaction_id: "invalid-uuid" });

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { transaction_id: "Transaction ID must be a valid UUID" });
      });

      it("should return validation error for invalid budget_category_id UUID", async() => {
         const invalidTransaction = createValidTransaction({ budget_category_id: "invalid-uuid" });

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { budget_category_id: "Budget category ID must be a valid UUID" });
      });

      it("should return validation error for invalid account_id UUID", async() => {
         const invalidTransaction = createValidTransaction({ account_id: "invalid-uuid" });

         const result: ServerResponse = await transactionsService.createTransaction(userId, invalidTransaction);

         assertTransactionValidationErrorResponse(result, { account_id: "Account ID must be a valid UUID" });
      });

      it("should return validation error for extra fields in strict mode", async() => {
         const transactionWithExtraField = { ...VALID_TRANSACTION, extraField: "should not be here" };

         const result: ServerResponse = await transactionsService.createTransaction(userId, transactionWithExtraField);

         assertTransactionValidationErrorResponse(result, {});
      });

      it("should create transaction successfully with amount exactly at maximum ($999,999,999,999.99)", async() => {
         const validTransaction = createValidTransaction({ amount: 999_999_999_999.99 });

         arrangeMockRepositorySuccess(transactionsRepository, "create", transactionId);

         const result: ServerResponse = await transactionsService.createTransaction(userId, validTransaction);

         assertTransactionOperationSuccess("create", [userId, validTransaction]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { transaction_id: transactionId });
      });

      it("should create transaction successfully with description exactly 255 characters", async() => {
         const validTransaction = createValidTransaction({ description: "a".repeat(255) });

         arrangeMockRepositorySuccess(transactionsRepository, "create", transactionId);

         const result: ServerResponse = await transactionsService.createTransaction(userId, validTransaction);

         assertTransactionOperationSuccess("create", [userId, validTransaction]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { transaction_id: transactionId });
      });

      it("should create transaction successfully with date exactly at 1800-01-01", async() => {
         const validTransaction = createValidTransaction({ date: new Date("1800-01-01").toISOString() });

         arrangeMockRepositorySuccess(transactionsRepository, "create", transactionId);

         const result: ServerResponse = await transactionsService.createTransaction(userId, validTransaction);

         assertTransactionOperationSuccess("create", [userId, validTransaction]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { transaction_id: transactionId });
      });

      it("should create transaction successfully with date as today", async() => {
         const today = new Date();
         today.setHours(0, 0, 0, 0);
         const validTransaction = createValidTransaction({ date: today.toISOString() });

         arrangeMockRepositorySuccess(transactionsRepository, "create", transactionId);

         const result: ServerResponse = await transactionsService.createTransaction(userId, validTransaction);

         assertTransactionOperationSuccess("create", [userId, validTransaction]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { transaction_id: transactionId });
      });

      it("should handle repository errors during creation", async() => {
         arrangeMockRepositoryError(transactionsRepository, "create", "Database connection failed");

         await assertServiceThrows(
            () => transactionsService.createTransaction(userId, VALID_TRANSACTION),
            "Database connection failed"
         );

         assertCacheInvalidationNotCalled(redis);
      });

      it("should create transaction successfully with empty string budget_category_id", async() => {
         const validTransaction = createValidTransaction({ budget_category_id: "" });

         arrangeMockRepositorySuccess(transactionsRepository, "create", transactionId);

         const result: ServerResponse = await transactionsService.createTransaction(userId, validTransaction);

         assertTransactionOperationSuccess("create", [userId, validTransaction]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { transaction_id: transactionId });
      });

      it("should create transaction successfully with empty string account_id", async() => {
         const validTransaction = createValidTransaction({ account_id: "" });

         arrangeMockRepositorySuccess(transactionsRepository, "create", transactionId);

         const result: ServerResponse = await transactionsService.createTransaction(userId, validTransaction);

         assertTransactionOperationSuccess("create", [userId, validTransaction]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { transaction_id: transactionId });
      });

      it("should create transaction successfully with null budget_category_id", async() => {
         const validTransaction = createValidTransaction({ budget_category_id: null });

         arrangeMockRepositorySuccess(transactionsRepository, "create", transactionId);

         const result: ServerResponse = await transactionsService.createTransaction(userId, validTransaction);

         assertTransactionOperationSuccess("create", [userId, validTransaction]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { transaction_id: transactionId });
      });

      it("should create transaction successfully with null account_id", async() => {
         const validTransaction = createValidTransaction({ account_id: null });

         arrangeMockRepositorySuccess(transactionsRepository, "create", transactionId);

         const result: ServerResponse = await transactionsService.createTransaction(userId, validTransaction);

         assertTransactionOperationSuccess("create", [userId, validTransaction]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { transaction_id: transactionId });
      });

      it("should create transaction successfully with empty description", async() => {
         const validTransaction = createValidTransaction({ description: "" });

         arrangeMockRepositorySuccess(transactionsRepository, "create", transactionId);

         const result: ServerResponse = await transactionsService.createTransaction(userId, validTransaction);

         assertTransactionOperationSuccess("create", [userId, validTransaction]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { transaction_id: transactionId });
      });
   });

   describe("updateTransaction", () => {
      it("should update transaction successfully with valid partial data", async() => {
         const updates: Partial<Transaction> = {
            transaction_id: transactionId,
            amount: 200.00,
            description: "Updated Transaction"
         };

         arrangeMockRepositorySuccess(transactionsRepository, "update", true);

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionOperationSuccess("update", [userId, transactionId, updates]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT, undefined);
      });

      it("should return validation error for missing transaction_id", async() => {
         const updates: Partial<Transaction> = { amount: 200.00 };

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionValidationErrorResponse(result, { transaction_id: "Transaction ID is required" });
      });

      it("should return not found error when transaction does not exist or does not belong to user", async() => {
         const updates: Partial<Transaction> = {
            transaction_id: transactionId,
            amount: 200.00
         };

         arrangeMockRepositorySuccess(transactionsRepository, "update", false);

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertRepositoryCall(transactionsRepository, "update", [userId, transactionId, updates]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, {
            transaction_id: "Transaction does not exist or does not belong to the user based on the provided ID"
         });
      });

      it("should return validation error for invalid amount in update", async() => {
         const updates: Partial<Transaction> = {
            transaction_id: transactionId,
            amount: -100
         };

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionValidationErrorResponse(result, { amount: "Amount must be at least $1" });
      });

      it("should return validation error for invalid type in update", async() => {
         const updates = {
            transaction_id: transactionId,
            type: "InvalidType"
         } as unknown as Partial<Transaction>;

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionValidationErrorResponse(result, { type: "Transaction type must be either Income or Expenses" });
      });

      it("should return validation error for invalid date in update", async() => {
         const futureDate = new Date();
         futureDate.setFullYear(futureDate.getFullYear() + 1);
         const updates: Partial<Transaction> = {
            transaction_id: transactionId,
            date: futureDate.toISOString()
         };

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionValidationErrorResponse(result, { date: "Date cannot be in the future" });
      });

      it("should return validation error for description too long in update", async() => {
         const updates: Partial<Transaction> = {
            transaction_id: transactionId,
            description: "a".repeat(256)
         };

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionValidationErrorResponse(result, { description: "Description must be at most 255 characters" });
      });

      it("should return validation error for invalid budget_category_id UUID in update", async() => {
         const updates: Partial<Transaction> = {
            transaction_id: transactionId,
            budget_category_id: "invalid-uuid"
         };

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionValidationErrorResponse(result, { budget_category_id: "Budget category ID must be a valid UUID" });
      });

      it("should return validation error for invalid account_id UUID in update", async() => {
         const updates: Partial<Transaction> = {
            transaction_id: transactionId,
            account_id: "invalid-uuid"
         };

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionValidationErrorResponse(result, { account_id: "Account ID must be a valid UUID" });
      });

      it("should return multiple validation errors in update", async() => {
         const updates = {
            transaction_id: transactionId,
            amount: -100,
            description: "a".repeat(256),
            type: "InvalidType"
         } as unknown as Partial<Transaction>;

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionValidationErrorResponse(result, {
            amount: "Amount must be at least $1",
            description: "Description must be at most 255 characters",
            type: "Transaction type must be either Income or Expenses"
         });
      });

      it("should handle repository errors during update", async() => {
         const updates: Partial<Transaction> = {
            transaction_id: transactionId,
            amount: 200.00
         };

         arrangeMockRepositoryError(transactionsRepository, "update", "Database connection failed");

         await assertServiceThrows(
            () => transactionsService.updateTransaction(userId, updates),
            "Database connection failed"
         );

         assertCacheInvalidationNotCalled(redis);
      });

      it("should clear budget_category_id with empty string", async() => {
         const updates: Partial<Transaction> = {
            transaction_id: transactionId,
            budget_category_id: ""
         };

         arrangeMockRepositorySuccess(transactionsRepository, "update", true);

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionOperationSuccess("update", [userId, transactionId, updates]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT, undefined);
      });

      it("should clear account_id with empty string", async() => {
         const updates: Partial<Transaction> = {
            transaction_id: transactionId,
            account_id: ""
         };

         arrangeMockRepositorySuccess(transactionsRepository, "update", true);

         const result: ServerResponse = await transactionsService.updateTransaction(userId, updates);

         assertTransactionOperationSuccess("update", [userId, transactionId, updates]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT, undefined);
      });
   });

   describe("deleteTransactions", () => {
      it("should delete transactions successfully with valid array", async() => {
         arrangeMockRepositorySuccess(transactionsRepository, "deleteTransactions", true);

         const result: ServerResponse = await transactionsService.deleteTransactions(userId, transactionIds);

         assertTransactionOperationSuccess("deleteTransactions", [userId, transactionIds]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT, undefined);
      });

      it("should return validation error for undefined transactionIds", async() => {
         const result: ServerResponse = await transactionsService.deleteTransactions(userId, undefined as unknown as string[]);

         assertTransactionValidationErrorResponse(result, { transactionIds: "Transaction IDs are required" });
      });

      it("should return validation error for null transactionIds", async() => {
         const result: ServerResponse = await transactionsService.deleteTransactions(userId, null as unknown as string[]);

         assertTransactionValidationErrorResponse(result, { transactionIds: "Transaction IDs are required" });
      });

      it("should return validation error for empty transactionIds array", async() => {
         const result: ServerResponse = await transactionsService.deleteTransactions(userId, []);

         assertTransactionValidationErrorResponse(result, { transactionIds: "Transaction IDs are required" });
      });

      it("should return not found error when transactions do not exist or do not belong to user", async() => {
         arrangeMockRepositorySuccess(transactionsRepository, "deleteTransactions", false);

         const result: ServerResponse = await transactionsService.deleteTransactions(userId, transactionIds);

         assertRepositoryCall(transactionsRepository, "deleteTransactions", [userId, transactionIds]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, {
            transactionIds: "Transaction(s) do not exist or do not belong to the user based on the provided IDs"
         });
      });

      it("should handle repository errors during deletion", async() => {
         arrangeMockRepositoryError(transactionsRepository, "deleteTransactions", "Database connection failed");

         await assertServiceThrows(
            () => transactionsService.deleteTransactions(userId, transactionIds),
            "Database connection failed"
         );

         assertCacheInvalidationNotCalled(redis);
      });

      it("should delete single transaction successfully", async() => {
         const singleId: string[] = [transactionId];

         arrangeMockRepositorySuccess(transactionsRepository, "deleteTransactions", true);

         const result: ServerResponse = await transactionsService.deleteTransactions(userId, singleId);

         assertTransactionOperationSuccess("deleteTransactions", [userId, singleId]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT, undefined);
      });
   });
});