import { jest } from "@jest/globals";
import { Account } from "capital/accounts";
import { createMockAccounts, createValidAccount, TEST_ACCOUNT_ID, TEST_ACCOUNT_IDS } from "capital/mocks/accounts";
import { TEST_USER_ID } from "capital/mocks/user";

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

import * as accountsRepository from "@/repository/accountsRepository";
import { ACCOUNT_UPDATES } from "@/repository/accountsRepository";

describe("Account Repository", () => {
   const userId: string = TEST_USER_ID;
   const accountId: string = TEST_ACCOUNT_ID;

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
       * @param {string} userId - Expected user_id parameter
       */
      const assertFindByUserIdStructure = (userId: string): void => {
         assertQueryCalledWithKeyPhrases([
            "SELECT account_id, name, type, image, balance, last_updated, account_order",
            "FROM accounts",
            "WHERE user_id = $1",
            "ORDER BY account_order ASC"
         ], [userId], 0, mockPool);
      };

      it("should return accounts when user_id exists", async() => {
         const mockAccounts: Account[] = createMockAccounts(2);
         arrangeMockQuery(mockAccounts, mockPool);

         const result: Account[] = await accountsRepository.findByUserId(userId);

         assertFindByUserIdStructure(userId);
         assertQueryResult(result, mockAccounts);
      });

      it("should return empty array when user has no accounts", async() => {
         arrangeMockQuery([], mockPool);

         const result: Account[] = await accountsRepository.findByUserId(userId);

         assertFindByUserIdStructure(userId);
         assertQueryResult(result, []);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => accountsRepository.findByUserId(userId),
            "Database connection failed"
         );
         assertFindByUserIdStructure(userId);
      });
   });

   describe("create", () => {
      /**
       * Asserts the account creation query was called with the proper structure and exact parameters
       *
       * @param {string} userId - Expected user_id parameter
       * @param {Account} account - Expected account data
       */
      const assertCreateStructure = (userId: string, account: Account): void => {
         assertQueryCalledWithKeyPhrases([
            "INSERT INTO accounts (user_id, name, type, image, account_order, balance, last_updated)",
            "VALUES ($1, $2, $3, $4, $5, $6, $7)",
            "RETURNING account_id"
         ], [
            userId,
            account.name,
            account.type,
            account.image,
            account.account_order,
            account.balance,
            account.last_updated
         ], 0, mockPool);
      };

      it("should create account and return account_id", async() => {
         const account: Account = createValidAccount({ account_id: accountId });
         arrangeMockQuery([{ account_id: accountId }], mockPool);

         const result: string = await accountsRepository.create(userId, account);

         assertCreateStructure(userId, account);
         assertQueryResult(result, accountId);
      });

      it("should throw error when database connection fails", async() => {
         const account: Account = createValidAccount({ account_id: accountId });
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => accountsRepository.create(userId, account),
            "Database connection failed"
         );
      });
   });

   describe("updateDetails", () => {
      /**
       * Arranges and asserts an account update query with the proper structure and exact parameters
       *
       * @param {Partial<Account>} updates - Fields being updated
       */
      const arrangeAndAssertAccountUpdate = async(updates: Partial<Account>): Promise<void> => {
         await arrangeAndAssertUpdateQueries(
            "accounts",
            updates,
            "user_id",
            userId,
            accountsRepository.updateDetails,
            mockPool,
            "account_id",
            accountId,
            ACCOUNT_UPDATES
         );
      };

      it("should update the name field only", async() => {
         await arrangeAndAssertAccountUpdate({ name: "New Name" });
      });

      it("should update multiple fields", async() => {
         await arrangeAndAssertAccountUpdate({
            name: "Updated Name",
            balance: 2000.00,
            type: "Savings"
         });
      });

      it("should update all updatable fields", async() => {
         await arrangeAndAssertAccountUpdate({
            name: "Full Update Account",
            type: "Investment",
            image: "investment",
            account_order: 5,
            balance: 5000.00,
            last_updated: new Date().toISOString()
         });
      });

      it("should return true immediately when no fields are provided", async() => {
         const result: boolean = await accountsRepository.updateDetails(userId, accountId, {});

         assertQueryNotCalled(mockPool);
         assertQueryResult(result, true);
      });

      it("should return false when account does not exist", async() => {
         await arrangeAndAssertAccountUpdate({ name: "New Name" });
         arrangeMockQuery([], mockPool);

         const result: boolean = await accountsRepository.updateDetails(userId, accountId, { name: "New Name" });

         assertQueryResult(result, false);
      });

      it("should throw error when database connection fails", async() => {
         await arrangeAndAssertAccountUpdate({ name: "New Name" });
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => accountsRepository.updateDetails(userId, accountId, { name: "New Name" }),
            "Database connection failed"
         );
      });

      it("should filter out invalid fields and only update valid ones", async() => {
         const updates = {
            name: "Valid Name",
            invalidField: "should be ignored",
            anotherInvalidField: 123
         };
         arrangeMockQuery([{ account_id: accountId }], mockPool);

         const result: boolean = await accountsRepository.updateDetails(userId, accountId, updates);

         assertQueryResult(result, true);

         // Assert only valid fields are included in the query
         const expectedParams = ["Valid Name", userId, accountId];
         assertQueryCalledWithKeyPhrases([
            "UPDATE accounts",
            "SET",
            "name = $1",
            "WHERE user_id = $2",
            "AND account_id = $3",
            "RETURNING"
         ], expectedParams, 0, mockPool);
      });
   });

   describe("updateOrdering", () => {
      /**
       * Asserts the account ordering update query was called with the proper structure and exact parameters
       *
       * @param {string} userId - Expected user_id parameter
       * @param {Partial<Account>[]} updates - Account order updates
       */
      const assertUpdateOrderingStructure = (userId: string, updates: Partial<Account>[]): void => {
         const params = updates.flatMap(update => [
            String(update.account_id),
            Number(update.account_order)
         ]);
         const values = updates.map((_, index) => `($${(index * 2) + 1}, $${(index * 2) + 2})`).join(", ");

         assertQueryCalledWithKeyPhrases([
            "UPDATE accounts",
            "SET account_order = v.account_order::int",
            `FROM (VALUES ${values})`,
            "AS v(account_id, account_order)",
            "WHERE accounts.account_id = v.account_id::uuid",
            `AND accounts.user_id = $${params.length + 1}`,
            "RETURNING accounts.user_id"
         ], [...params, userId], 0, mockPool);
      };

      it("should update ordering for a single account", async() => {
         const updates: Partial<Account>[] = [
            { account_id: TEST_ACCOUNT_IDS[0], account_order: 1 }
         ];
         arrangeMockQuery([{ user_id: userId }], mockPool);

         const result: boolean = await accountsRepository.updateOrdering(userId, updates);

         assertUpdateOrderingStructure(userId, updates);
         assertQueryResult(result, true);
      });

      it("should update ordering for multiple accounts", async() => {
         const updates: Partial<Account>[] = [
            { account_id: TEST_ACCOUNT_IDS[0], account_order: 0 },
            { account_id: TEST_ACCOUNT_IDS[1], account_order: 1 },
            { account_id: TEST_ACCOUNT_IDS[2], account_order: 2 }
         ];
         arrangeMockQuery([{ user_id: userId }], mockPool);

         const result: boolean = await accountsRepository.updateOrdering(userId, updates);

         assertUpdateOrderingStructure(userId, updates);
         assertQueryResult(result, true);
      });

      it("should return true when update succeeds", async() => {
         const updates: Partial<Account>[] = [
            { account_id: TEST_ACCOUNT_IDS[0], account_order: 1 }
         ];
         arrangeMockQuery([{ user_id: userId }], mockPool);

         const result: boolean = await accountsRepository.updateOrdering(userId, updates);

         assertQueryResult(result, true);
      });

      it("should return false when update fails", async() => {
         const updates: Partial<Account>[] = [
            { account_id: TEST_ACCOUNT_IDS[0], account_order: 1 }
         ];
         arrangeMockQuery([], mockPool);

         const result: boolean = await accountsRepository.updateOrdering(userId, updates);

         assertQueryResult(result, false);
      });

      it("should throw error when database connection fails", async() => {
         const updates: Partial<Account>[] = [
            { account_id: TEST_ACCOUNT_IDS[0], account_order: 1 }
         ];
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => accountsRepository.updateOrdering(userId, updates),
            "Database connection failed"
         );
      });
   });

   describe("deleteAccount", () => {
      /**
       * Asserts the account deletion query was called with the proper structure and exact parameters
       *
       * @param {string} userId - Expected user_id parameter
       * @param {string} accountId - Expected account_id parameter
       */
      const assertDeleteAccountStructure = (userId: string, accountId: string): void => {
         assertQueryCalledWithKeyPhrases([
            "DELETE FROM accounts",
            "WHERE user_id = $1",
            "AND account_id = $2",
            "RETURNING account_id"
         ], [userId, accountId], 0, mockPool);
      };

      it("should delete account successfully", async() => {
         arrangeMockQuery([{ account_id: accountId }], mockPool);

         const result: boolean = await accountsRepository.deleteAccount(userId, accountId);

         assertDeleteAccountStructure(userId, accountId);
         assertQueryResult(result, true);
      });

      it("should return false when account does not exist", async() => {
         arrangeMockQuery([], mockPool);

         const result: boolean = await accountsRepository.deleteAccount(userId, accountId);

         assertQueryResult(result, false);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => accountsRepository.deleteAccount(userId, accountId),
            "Database connection failed"
         );
         assertDeleteAccountStructure(userId, accountId);
      });
   });
});