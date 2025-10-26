import { jest } from "@jest/globals";
import { createMockUser, TEST_CONSTANTS } from "capital/mocks/server";
import { createConflictingUser } from "capital/mocks/user";
import { User } from "capital/user";

import {
   arrangeAndAssertUpdateQueries,
   arrangeMockQuery,
   arrangeMockQueryError,
   arrangeMockTransactionFlow,
   assertObjectProperties,
   assertQueryCalledWithKeyPhrases,
   assertQueryNotCalled,
   assertQueryResult,
   assertTransactionResult,
   assertTransactionRollback,
   createMockClient,
   createMockPool,
   expectRepositoryToThrow,
   MockClient,
   MockPool,
   resetDatabaseMocks
} from "@/tests/utils/repositories";

/**
 * Global mock pool for the instance database connection
 */
const globalMockPool: MockPool = createMockPool();

jest.mock("@/repository/budgetsRepository");
jest.mock("pg", () => ({ Pool: jest.fn(() => globalMockPool) }));

import * as userRepository from "@/repository/userRepository";
import { USER_UPDATES } from "@/repository/userRepository";

describe("User Repository", () => {
   const { username, email, password, userId } = {
      username: "testuser",
      email: "test@example.com",
      password: "hashed_password_123",
      userId: TEST_CONSTANTS.TEST_USER_ID
   };

   let mockPool: MockPool;
   let mockClient: MockClient;
   let budgetsRepository: typeof import("@/repository/budgetsRepository");

   /**
    * Imports the true budgets repository for testing the transaction flow to properly track all queries
    */
   const importTrueBudgetsRepository = (): void => {
      jest.unmock("@/repository/budgetsRepository");
      const realBudgetsRepository: typeof import("@/repository/budgetsRepository") = jest.requireActual("@/repository/budgetsRepository");
      budgetsRepository.createCategory = realBudgetsRepository.createCategory;
   };

   beforeEach(async() => {
      mockPool = createMockPool();
      mockClient = createMockClient();
      resetDatabaseMocks(globalMockPool, mockPool, mockClient);
      budgetsRepository = await import("@/repository/budgetsRepository");
   });

   describe("findConflictingUsers", () => {
      /**
       * Asserts the conflict check query was called with the proper structure and exact parameters
       *
       * @param {string} [userId] - Potential `user_id` parameter to exclude from the conflict check
       */
      const assertConflictCheckStructure = (userId?: string): void => {
         assertQueryCalledWithKeyPhrases([
            "SELECT user_id, username, email",
            "FROM users",
            "WHERE (username_normalized = $1 OR email_normalized = $2)",
            "AND (user_id != $3 OR user_id IS NULL OR $3 IS NULL)"
         ], [username.toLowerCase().trim(), email.toLowerCase().trim(), userId], 0, mockPool);
      };

      it("should return conflicting user when username or email already exists", async() => {
         const conflictingUser: User = createConflictingUser(username, email);
         arrangeMockQuery([conflictingUser], mockPool);

         const result: User[] = await userRepository.findConflictingUsers(username, email);

         assertConflictCheckStructure();
         assertQueryResult(result, [conflictingUser]);
      });

      it("should return empty array when no conflicting user is found", async() => {
         arrangeMockQuery([], mockPool);

         const result: User[] = await userRepository.findConflictingUsers(username, email, userId);

         assertConflictCheckStructure(userId);
         assertQueryResult(result, []);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await expectRepositoryToThrow(
            () => userRepository.findConflictingUsers(username, email),
            "Database connection failed"
         );
         assertConflictCheckStructure();
      });
   });

   describe("findByUsername", () => {
      /**
       * Asserts the username lookup query was called with the proper structure and exact parameters
       */
      const assertUsernameLookupStructure = (): void => {
         assertQueryCalledWithKeyPhrases([
            "SELECT user_id, username, password",
            "FROM users"
         ], [username], 0, mockPool);
      };

      it("should return user data when username exists", async() => {
         const mockUser = { user_id: userId, username, password };
         arrangeMockQuery([mockUser], mockPool);

         const result: User | null = await userRepository.findByUsername(username);

         assertUsernameLookupStructure();
         // Only the user ID, username, and password should be returned
         assertObjectProperties(result!, ["user_id", "username", "password"], ["email", "name", "birthday"]);
         assertQueryResult(result, mockUser);
      });

      it("should return null when username does not exist", async() => {
         arrangeMockQuery([], mockPool);

         const result: User | null = await userRepository.findByUsername(username);

         assertUsernameLookupStructure();
         assertQueryResult(result, null);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await expectRepositoryToThrow(
            () => userRepository.findByUsername(username),
            "Database connection failed"
         );
         assertUsernameLookupStructure();
      });
   });

   describe("findByUserId", () => {
      /**
       * Asserts the user ID lookup query was called with the proper structure and exact parameters
       *
       * @param {string} userId - Expected user_id parameter
       */
      const assertUserIdLookupStructure = (userId: string): void => {
         assertQueryCalledWithKeyPhrases([
            "SELECT * FROM users",
            "WHERE user_id = $1"
         ], [userId], 0, mockPool);
      };

      it("should return complete user data when user_id exists", async() => {
         const mockUser: User = createMockUser({ user_id: userId });
         arrangeMockQuery([mockUser], mockPool);

         const result: User | null = await userRepository.findByUserId(userId);

         assertUserIdLookupStructure(userId);
         assertObjectProperties(result!, ["user_id", "username", "password", "email", "name", "birthday"]);
         assertQueryResult(result, mockUser);
      });

      it("should return null when user_id does not exist", async() => {
         arrangeMockQuery([], mockPool);

         const result: User | null = await userRepository.findByUserId(userId);

         assertUserIdLookupStructure(userId);
         assertQueryResult(result, null);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await expectRepositoryToThrow(
            () => userRepository.findByUserId(userId),
            "Database connection failed"
         );
         assertUserIdLookupStructure(userId);
      });
   });

   describe("create", () => {
      const userData: User = {
         user_id: userId,
         username,
         name: "Test User",
         password,
         email,
         birthday: "1990-01-01"
      };

      /**
       * Arranges a mock transaction flow for a successful user creation transaction
       */
      const arrangeUserCreationTransactionSuccess = (): void => {
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            { rows: [{ user_id: userId }] }, // User INSERT
            { rows: [{ budget_category_id: "income-category-id" }] }, // Income Category INSERT
            {}, // Income Budget INSERT
            { rows: [{ budget_category_id: "expenses-category-id" }] }, // Expenses Category INSERT
            {}, // Expenses Budget INSERT
            {}  // COMMIT
         ]);
      };

      /**
       * Arranges a mock client for a user creation transaction with an error at a specific stage
       *
       * @param {string} errorMessage - Error message to throw
       * @param {string} failStage - Stage where the error should occur (e.g. "begin", "insertion", "income_budget_creation", "expenses_budget_creation")
       */
      const arrangeUserCreationTransactionError = (errorMessage: string, failStage: "begin" | "insertion" | "income_budget_creation" | "expenses_budget_creation"): void => {
         const error = new Error(errorMessage);

         importTrueBudgetsRepository();

         switch (failStage) {
            case "begin":
               arrangeMockTransactionFlow(mockClient.query, [error]); // BEGIN fails
               break;
            case "insertion":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  error // User INSERT fails
               ]);
               break;
            case "income_budget_creation":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [{ user_id: userId }] }, // User INSERT
                  { rows: [{ budget_category_id: "income-category-id" }] }, // Income Category INSERT
                  error // Income Budget INSERT fails
               ]);
               break;
            case "expenses_budget_creation":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  { rows: [{ user_id: userId }] }, // User INSERT
                  { rows: [{ budget_category_id: "income-category-id" }] }, // Income Category INSERT
                  {}, // Income Budget INSERT
                  { rows: [{ budget_category_id: "expenses-category-id" }] }, // Expenses Category INSERT
                  error // Expenses Budget INSERT fails
               ]);
               break;
            default:
               throw new Error(`Unknown fail stage: ${failStage}`);
         }
      };

      /**
       * Asserts the complete user creation transaction flow including categories and budgets
       *
       * @param {User} userData - Expected user data
       * @param {string} expectedUserId - Expected user ID
       */
      const assertCompleteUserCreationTransaction = (userData: User, expectedUserId: string): void => {
         const today = new Date(new Date().setHours(0, 0, 0, 0));
         const expectedMonth = today.getUTCMonth() + 1;
         const expectedYear = today.getUTCFullYear();

         // Verify the start of the transaction (1st call)
         assertQueryCalledWithKeyPhrases([
            "BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED"
         ], [], 0, mockPool);

         // Verify the user insertion (2nd call)
         assertQueryCalledWithKeyPhrases([
            "INSERT INTO users (username, name, password, email, birthday)",
            "VALUES ($1, $2, $3, $4, $5)",
            "RETURNING user_id"
         ], [
            userData.username,
            userData.name,
            userData.password,
            userData.email,
            userData.birthday
         ], 1, mockPool);

         // Verify the income category insertion (3rd call)
         assertQueryCalledWithKeyPhrases([
            "INSERT INTO budget_categories (user_id, type, name, category_order)",
            "VALUES ($1, $2, $3, $4)",
            "RETURNING budget_category_id"
         ], [expectedUserId, "Income", null, null], 2, mockPool);

         // Verify the income budget insertion (4th call)
         assertQueryCalledWithKeyPhrases([
            "INSERT INTO budgets (budget_category_id, goal, year, month)",
            "VALUES ($1, $2, $3, $4)"
         ], ["income-category-id", 2000, expectedYear, expectedMonth], 3, mockPool);

         // Verify the expenses category insertion (5th call)
         assertQueryCalledWithKeyPhrases([
            "INSERT INTO budget_categories (user_id, type, name, category_order)",
            "VALUES ($1, $2, $3, $4)",
            "RETURNING budget_category_id"
         ], [expectedUserId, "Expenses", null, null], 4, mockPool);

         // Verify the expenses budget insertion (6th call)
         assertQueryCalledWithKeyPhrases([
            "INSERT INTO budgets (budget_category_id, goal, year, month)",
            "VALUES ($1, $2, $3, $4)"
         ], ["expenses-category-id", 2000, expectedYear, expectedMonth], 5, mockPool);

         // Verify the transaction commits successfully (7th call)
         assertQueryCalledWithKeyPhrases([
            "COMMIT"
         ], [], 6, mockPool);
      };

      it("should create user and verify the complete transaction flow", async() => {
         importTrueBudgetsRepository();
         arrangeUserCreationTransactionSuccess();

         const result: string = await userRepository.create(userData);

         assertQueryResult(result, userId);
         assertCompleteUserCreationTransaction(userData, userId);
      });

      it("should throw error when database connection fails during user creation", async() => {
         arrangeUserCreationTransactionError("Database connection failed", "begin");

         await expectRepositoryToThrow(
            () => userRepository.create(userData),
            "Database connection failed"
         );

         // No statements should be called
         assertTransactionRollback(mockClient, 0);
      });

      it("should rollback transaction when user creation fails", async() => {
         arrangeUserCreationTransactionError("User creation failed", "insertion");

         await expectRepositoryToThrow(
            () => userRepository.create(userData),
            "User creation failed"
         );

         // User insertion query should be called
         assertTransactionRollback(mockClient, 1);
      });

      it("should rollback when income budget creation fails", async() => {
         arrangeUserCreationTransactionError("Income budget creation failed", "income_budget_creation");

         await expectRepositoryToThrow(
            () => userRepository.create(userData),
            "Income budget creation failed"
         );

         // Income category and budget insertion queries should be called after the user creation queries
         assertTransactionRollback(mockClient, 3);
      });

      it("should rollback when expenses budget creation fails", async() => {
         arrangeUserCreationTransactionError("Expenses budget creation failed", "expenses_budget_creation");

         await expectRepositoryToThrow(
            () => userRepository.create(userData),
            "Expenses budget creation failed"
         );

         // Expenses category and budget insertion queries should be called after the income budget and category queries
         assertTransactionRollback(mockClient, 5);
      });
   });

   describe("update", () => {
      const mockUpdateData = {
         username: "newusername",
         name: "New Name",
         password: "newpassword",
         email: "newemail@example.com",
         birthday: new Date().toISOString().split("T")[0] // Today's date in YYYY-MM-DD format
      };

      USER_UPDATES.forEach((field) => {
         it(`should update the ${field} field only`, async() => {
            await arrangeAndAssertUpdateQueries("users", { [field]: mockUpdateData[field] }, "user_id", userId, userRepository.update, mockPool);
         });
      });

      it("should update username and email fields", async() => {
         await arrangeAndAssertUpdateQueries("users", {
            username: mockUpdateData.username,
            email: mockUpdateData.email
         }, "user_id", userId, userRepository.update, mockPool);
      });

      it("should update all fields uniformly", async() => {
         await arrangeAndAssertUpdateQueries("users", mockUpdateData, "user_id", userId, userRepository.update, mockPool);
      });

      it("should return true when user exists and is updated successfully", async() => {
         const updates = { username: mockUpdateData.username };
         arrangeMockQuery([{ user_id: userId }], mockPool);

         const result = await userRepository.update(userId, updates);

         assertQueryResult(result, true);
      });

      it("should return false when user does not exist", async() => {
         const updates = { username: mockUpdateData.username };
         arrangeMockQuery([], mockPool);

         const result = await userRepository.update(userId, updates);

         assertQueryResult(result, false);
      });

      it("should return true immediately when no fields are provided", async() => {
         const result: boolean = await userRepository.update(userId, {});

         assertQueryNotCalled(mockPool);
         assertQueryResult(result, true);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await expectRepositoryToThrow(
            () => userRepository.update(userId, { username: mockUpdateData.username }),
            "Database connection failed"
         );
      });

      it("should filter out invalid fields and only update valid ones", async() => {
         const updates = {
            username: mockUpdateData.username,
            invalidField: "should be ignored"
         };
         arrangeMockQuery([{ user_id: userId }], mockPool);

         const result = await userRepository.update(userId, updates);

         assertQueryResult(result, true);

         // Verify only valid fields are included in the query
         const expectedParams = [mockUpdateData.username, userId];
         assertQueryCalledWithKeyPhrases([
            "UPDATE users",
            "SET",
            "username = $1",
            "WHERE user_id = $2",
            "RETURNING"
         ], expectedParams, 0, mockPool);
      });
   });

   describe("deleteUser", () => {
      /**
       * Arranges a mock client for a successful user deletion transaction
       *
       * @param {number} rowCount - Number of rows affected by the deletion (defaults to `1`)
       */
      const arrangeUserDeletionTransactionSuccess = (rowCount: number = 1): void => {
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            {}, // DISABLE TRIGGER
            { rowCount }, // DELETE
            {}, // ENABLE TRIGGER
            {}  // COMMIT
         ]);
      };

      /**
       * Arranges a mock client for a user deletion transaction with an error at a specific stage
       *
       * @param {string} errorMessage - Error message to throw
       * @param {string} failStage - Stage where error should occur (`"deletion"`, `"trigger_disable"`, `"trigger_enable"`)
       */
      const arrangeUserDeletionTransactionError = (errorMessage: string, failStage: "begin" | "trigger_disable" | "deletion" | "trigger_enable"): void => {
         const error = new Error(errorMessage);

         switch (failStage) {
            case "begin":
               arrangeMockTransactionFlow(mockClient.query, [error]); // BEGIN fails
               break;
            case "trigger_disable":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  error // DISABLE TRIGGER error
               ]);
               break;
            case "deletion":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  {}, // DISABLE TRIGGER
                  error // DELETE error
               ]);
               break;
            case "trigger_enable":
               arrangeMockTransactionFlow(mockClient.query, [
                  {}, // BEGIN
                  {}, // DISABLE TRIGGER
                  { rows: [], rowCount: 1 }, // DELETE
                  error // ENABLE TRIGGER error
               ]);
               break;
            default:
               throw new Error(`Unknown fail stage: ${failStage}`);
         }
      };

      /**
       * Asserts the user deletion flow with database trigger operations
       *
       * @param {string} userId - Expected user ID
       */
      const assertUserDeletionFlow = (userId: string): void => {
         // Verify the start of the transaction (1st call)
         assertQueryCalledWithKeyPhrases([
            "BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE"
         ], [], 0, mockPool);

         // Verify the disable of the database trigger (2nd call)
         assertQueryCalledWithKeyPhrases([
            "ALTER TABLE budget_categories DISABLE TRIGGER prevent_main_budget_category_modifications_trigger"
         ], [], 1, mockPool);

         // Verify the user deletion (3rd call)
         assertQueryCalledWithKeyPhrases([
            "DELETE FROM users",
            "WHERE user_id = $1"
         ], [userId], 2, mockPool);

         // Verify the enable of the database trigger (4th call)
         assertQueryCalledWithKeyPhrases([
            "ALTER TABLE budget_categories ENABLE TRIGGER prevent_main_budget_category_modifications_trigger"
         ], [], 3, mockPool);

         // Verify the transaction commits successfully (5th call)
         assertQueryCalledWithKeyPhrases([
            "COMMIT"
         ], [], 4, mockPool);
      };

      it("should delete user successfully and verify the complete transaction flow", async() => {
         arrangeUserDeletionTransactionSuccess();

         const result: boolean = await userRepository.deleteUser(userId);

         assertUserDeletionFlow(userId);
         assertTransactionResult(result, true, mockClient);
      });

      it("should return false when the user does not exist", async() => {
         arrangeUserDeletionTransactionSuccess(0);

         const result: boolean = await userRepository.deleteUser(userId);

         assertQueryResult(result, false);
      });

      it("should rollback the transaction when the begin fails", async() => {
         arrangeUserDeletionTransactionError("Deletion failed", "begin");

         await expectRepositoryToThrow(
            () => userRepository.deleteUser(userId),
            "Deletion failed"
         );
         assertTransactionRollback(mockClient, 0);
      });

      it("should rollback the transaction when the trigger disable fails", async() => {
         arrangeUserDeletionTransactionError("Deletion failed", "trigger_disable");

         await expectRepositoryToThrow(
            () => userRepository.deleteUser(userId),
            "Deletion failed"
         );
         assertTransactionRollback(mockClient, 1);
      });

      it("should throw error when the database connection fails during user deletion", async() => {
         arrangeUserDeletionTransactionError("Database connection failed", "deletion");

         await expectRepositoryToThrow(
            () => userRepository.deleteUser(userId),
            "Database connection failed"
         );

         assertTransactionRollback(mockClient, 2);
      });

      it("should rollback the transaction when the trigger enable fails", async() => {
         arrangeUserDeletionTransactionError("Deletion failed", "trigger_enable");

         await expectRepositoryToThrow(
            () => userRepository.deleteUser(userId),
            "Deletion failed"
         );
         assertTransactionRollback(mockClient, 3);
      });
   });
});