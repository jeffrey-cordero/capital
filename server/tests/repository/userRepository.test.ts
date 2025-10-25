import { jest } from "@jest/globals";
import { createMockUser, TEST_CONSTANTS } from "capital/mocks/server";
import { createConflictingUser } from "capital/mocks/user";
import { User, UserUpdates } from "capital/user";

import {
   assertObjectProperties,
   assertQueryCalledWithKeyPhrases,
   assertQueryNotCalled,
   assertQueryResult,
   assertTransactionResult,
   assertTransactionRollback,
   mockClient,
   mockCreateCategoryRejected,
   mockPool,
   resetDatabaseMocks,
   setupCreationTransaction,
   setupMockQuery,
   setupTransactionError,
   testRepositoryDatabaseError,
   testUpdateQueryFormation
} from "@/tests/mocks/repositories";

jest.mock("pg", () => ({
   Pool: jest.fn(() => mockPool)
}));
jest.mock("@/repository/budgetsRepository");

import * as userRepository from "@/repository/userRepository";
import { USER_UPDATES } from "@/repository/userRepository";

describe("User Repository", () => {
   const { username, email, password, userId } = {
      username: "testuser",
      email: "test@example.com",
      password: "hashed_password_123",
      userId: TEST_CONSTANTS.TEST_USER_ID
   };
   let budgetsRepository: typeof import("@/repository/budgetsRepository");

   /**
    * Assert conflict check behavior with exact SQL and parameters
    *
    * @param {string} [userId] - Expected user_id parameter (optional)
    */
   function assertConflictCheckBehavior(userId?: string): void {
      assertQueryCalledWithKeyPhrases([
         "SELECT user_id, username, email",
         "FROM users",
         "WHERE (username_normalized = $1 OR email_normalized = $2)",
         "AND (user_id IS DISTINCT FROM $3)"
      ], [username.toLowerCase().trim(), email.toLowerCase().trim(), userId]);
   }

   /**
    * Assert username lookup behavior with exact SQL and parameters
    */
   function assertUsernameLookupBehavior(): void {
      assertQueryCalledWithKeyPhrases([
         "SELECT user_id, username, password",
         "FROM users"
      ], [username]);
   }

   /**
    * Assert user ID lookup behavior with exact SQL and parameters
    *
    * @param {string} userId - Expected user_id parameter
    */
   function assertUserIdLookupBehavior(userId: string): void {
      assertQueryCalledWithKeyPhrases([
         "SELECT * FROM users",
         "WHERE user_id = $1"
      ], [userId]);
   }

   /**
    * Assert user deletion flow with trigger operations
    *
    * @param {string} userId - Expected user ID
    */
   function assertUserDeletionFlow(userId: string): void {
      const mockQuery = mockClient.query;

      // Verify SERIALIZABLE isolation level (1st call)
      assertQueryCalledWithKeyPhrases([
         "BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE"
      ], [], 0, mockQuery);

      // Verify trigger disable (2nd call)
      assertQueryCalledWithKeyPhrases([
         "ALTER TABLE budget_categories DISABLE TRIGGER prevent_main_budget_category_modifications_trigger"
      ], [], 1, mockQuery);

      // Verify deletion query (3rd call)
      assertQueryCalledWithKeyPhrases([
         "DELETE FROM users",
         "WHERE user_id = $1"
      ], [userId], 2, mockQuery);

      // Verify trigger enable (4th call)
      assertQueryCalledWithKeyPhrases([
         "ALTER TABLE budget_categories ENABLE TRIGGER prevent_main_budget_category_modifications_trigger"
      ], [], 3, mockQuery);

      // Verify COMMIT (5th call)
      assertQueryCalledWithKeyPhrases([
         "COMMIT"
      ], [], 4, mockQuery);
   }

   /**
    * Setup mock client for successful user deletion transaction
    *
    * @param {number} rowCount - Number of rows affected by deletion
    */
   function setupUserDeletionTransactionSuccess(rowCount: number = 1): void {
      mockClient.query
         .mockResolvedValueOnce({}) // BEGIN
         .mockResolvedValueOnce({}) // Disable trigger
         .mockResolvedValueOnce({ rowCount }) // Deletion
         .mockResolvedValueOnce({}) // Enable trigger
         .mockResolvedValueOnce({}); // COMMIT
   }

   /**
    * Setup mock client for user deletion transaction with error at specific stage
    *
    * @param {string} errorMessage - Error message to throw
    * @param {string} failStage - Stage where error should occur ("deletion", "trigger_disable", "trigger_enable")
    */
   function setupUserDeletionTransactionError(errorMessage: string, failStage: string): void {
      const mockQuery = (mockClient.query);

      switch (failStage) {
         case "trigger_disable":
            mockQuery.mockResolvedValueOnce({}) // BEGIN
               .mockRejectedValueOnce(new Error(errorMessage)); // Disable trigger
            break;
         case "deletion":
            mockQuery.mockResolvedValueOnce({}) // BEGIN
               .mockResolvedValueOnce({}) // Disable trigger
               .mockRejectedValueOnce(new Error(errorMessage)); // Deletion
            break;
         case "trigger_enable":
            mockQuery.mockResolvedValueOnce({}) // BEGIN
               .mockResolvedValueOnce({}) // Disable trigger
               .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Deletion
               .mockRejectedValueOnce(new Error(errorMessage)); // Enable trigger
            break;
         default:
            throw new Error(`Unknown fail stage: ${failStage}`);
      }
   }

   beforeEach(async() => {
      resetDatabaseMocks();
      mockPool.connect.mockResolvedValue(mockClient);
      budgetsRepository = await import("@/repository/budgetsRepository");
   });

   describe("findConflictingUsers", () => {
      it("should execute conflict check query with correct parameters and handle results", async() => {
         const conflictingUser: User = createConflictingUser(username, email);
         setupMockQuery([conflictingUser]);

         const result: User[] = await userRepository.findConflictingUsers(username, email);

         // Verify query formation with normalized parameters
         assertConflictCheckBehavior();
         assertQueryResult(result, [conflictingUser]);
      });

      it("should handle user_id exclusion in WHERE clause", async() => {
         setupMockQuery([]);

         const result: User[] = await userRepository.findConflictingUsers(username, email, userId);

         // Verify DISTINCT FROM clause for user_id exclusion
         assertConflictCheckBehavior(userId);
         assertQueryResult(result, []);
      });

      it("should handle database errors during conflict check", async() => {
         await testRepositoryDatabaseError(
            () => userRepository.findConflictingUsers(username, email),
            "Database connection failed"
         );

         assertConflictCheckBehavior();
      });
   });

   describe("findByUsername", () => {
      it("should execute username lookup query and return user data", async() => {
         const mockUser = { user_id: userId, username, password };
         setupMockQuery([mockUser]);

         const result: User | null = await userRepository.findByUsername(username);

         // Verify query formation and result handling
         assertUsernameLookupBehavior();
         assertObjectProperties(result!, ["user_id", "username", "password"], ["email", "name", "birthday"]);
         assertQueryResult(result, mockUser);
      });

      it("should handle username not found scenario", async() => {
         setupMockQuery([]);

         const result: User | null = await userRepository.findByUsername(username);

         assertUsernameLookupBehavior();
         assertQueryResult(result, null);
      });

      it("should handle database errors during username lookup", async() => {
         await testRepositoryDatabaseError(
            () => userRepository.findByUsername(username),
            "Database connection failed"
         );

         assertUsernameLookupBehavior();
      });
   });

   describe("findByUserId", () => {
      it("should execute user_id lookup query and return complete user data", async() => {
         const mockUser: User = createMockUser({ user_id: userId });
         setupMockQuery([mockUser]);

         const result: User | null = await userRepository.findByUserId(userId);

         // Verify query formation and complete user object return
         assertUserIdLookupBehavior(userId);
         assertObjectProperties(result!, ["user_id", "username", "password", "email", "name", "birthday"]);
         assertQueryResult(result, mockUser);
      });

      it("should handle user not found scenario", async() => {
         setupMockQuery([]);

         const result: User | null = await userRepository.findByUserId(userId);

         assertUserIdLookupBehavior(userId);
         assertQueryResult(result, null);
      });

      it("should handle database errors during user_id lookup", async() => {
         await testRepositoryDatabaseError(
            () => userRepository.findByUserId(userId),
            "Database connection failed"
         );

         assertUserIdLookupBehavior(userId);
      });

      it("should handle invalid UUID format gracefully", async() => {
         const invalidUserId = "invalid-uuid";

         await testRepositoryDatabaseError(
            () => userRepository.findByUserId(invalidUserId),
            "invalid input syntax for type uuid"
         );

         assertUserIdLookupBehavior(invalidUserId);
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

      beforeEach(() => {
         // Mock createCategory to track calls
         jest.mocked(budgetsRepository.createCategory).mockResolvedValue("category-id");
      });

      it("should create user successfully with complete flow verification", async() => {
         setupCreationTransaction("users", "user_id", userId);

         const result: string = await userRepository.create(userData);

         // Verify return value
         assertQueryResult(result, userId);

         // Verify transaction flow: BEGIN, user INSERT, COMMIT
         expect(mockClient.query).toHaveBeenCalledTimes(3);

         // Verify BEGIN transaction
         assertQueryCalledWithKeyPhrases([
            "BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED"
         ], [], 0, mockClient.query);

         // Verify INSERT query
         assertQueryCalledWithKeyPhrases([
            "INSERT INTO users",
            "VALUES"
         ], [
            userData.username,
            userData.name,
            userData.password,
            userData.email,
            userData.birthday
         ], 1, mockClient.query);

         // Verify COMMIT
         assertQueryCalledWithKeyPhrases([
            "COMMIT"
         ], [], 2, mockClient.query);

         // Verify category creation
         expect(budgetsRepository.createCategory).toHaveBeenCalledTimes(2);

         // Verify both Income and Expenses categories with correct parameters
         const today = new Date(new Date().setHours(0, 0, 0, 0));
         const expectedMonth = today.getUTCMonth() + 1;
         const expectedYear = today.getUTCFullYear();

         const expectedCategories = ["Income", "Expenses"];
         expectedCategories.forEach((categoryType, index) => {
            expect(budgetsRepository.createCategory).toHaveBeenNthCalledWith(index + 1, userId, {
               type: categoryType,
               name: null,
               category_order: null,
               goal: 2000,
               month: expectedMonth,
               year: expectedYear,
               goalIndex: 0,
               goals: []
            }, mockClient);
         });
      });

      it("should rollback transaction if user creation fails", async() => {
         setupTransactionError("User creation failed", "BEGIN");

         await testRepositoryDatabaseError(
            () => userRepository.create(userData),
            "User creation failed"
         );

         assertTransactionRollback();
      });

      it("should rollback transaction if category creation fails", async() => {
         setupCreationTransaction("users", "user_id", userId);
         mockCreateCategoryRejected("Category creation failed");

         await testRepositoryDatabaseError(
            () => userRepository.create(userData),
            "Category creation failed"
         );

         assertTransactionRollback();
      });

      it("should handle database errors during user creation", async() => {
         setupTransactionError("Database connection failed", "user_insert");

         await testRepositoryDatabaseError(
            () => userRepository.create(userData),
            "Database connection failed"
         );

         expect(budgetsRepository.createCategory).not.toHaveBeenCalled();
      });

      it("should handle database errors during category creation", async() => {
         setupCreationTransaction("users", "user_id", userId);
         mockCreateCategoryRejected("Database connection failed");

         await testRepositoryDatabaseError(
            () => userRepository.create(userData),
            "Database connection failed"
         );

         expect(budgetsRepository.createCategory).toHaveBeenCalledTimes(1);
      });
   });

   describe("update", () => {
      const mockUpdateData = {
         username: "newusername",
         name: "New Name",
         password: "newpassword",
         email: "newemail@example.com",
         birthday: new Date().toISOString().split("T")[0] // Today's date
      };

      USER_UPDATES.forEach((field) => {
         it(`should update single field (${field} only)`, async() => {
            await testUpdateQueryFormation("users", { [field]: mockUpdateData[field] }, "user_id", userId, userRepository.update);
         });
      });

      it("should update multiple fields (username + email)", async() => {
         const updates = {
            username: mockUpdateData.username,
            email: mockUpdateData.email
         };
         await testUpdateQueryFormation("users", updates, "user_id", userId, userRepository.update);
      });

      it("should update all fields together", async() => {
         await testUpdateQueryFormation("users", mockUpdateData, "user_id", userId, userRepository.update);
      });

      it("should return true when user exists and is updated", async() => {
         const updates = { username: mockUpdateData.username };
         setupMockQuery([{ user_id: userId }]);

         const result = await userRepository.update(userId, updates);

         assertQueryResult(result, true);
      });

      it("should return false when user does not exist", async() => {
         const updates = { username: mockUpdateData.username };
         setupMockQuery([]);

         const result = await userRepository.update(userId, updates);

         assertQueryResult(result, false);
      });

      it("should return true immediately when no fields provided (no-op)", async() => {
         const updates: Partial<UserUpdates> = {};

         const result: boolean = await userRepository.update(userId, updates);

         assertQueryNotCalled();
         assertQueryResult(result, true);
      });

      it("should construct UPDATE query with correct parameterization", async() => {
         const updates = {
            username: mockUpdateData.username,
            email: mockUpdateData.email
         };

         await testUpdateQueryFormation("users", updates, "user_id", userId, userRepository.update);
      });

      it("should properly increment parameter indices", async() => {
         const updates = {
            username: mockUpdateData.username,
            name: mockUpdateData.name,
            email: mockUpdateData.email
         };

         await testUpdateQueryFormation("users", updates, "user_id", userId, userRepository.update);
      });

      it("should handle database errors during update", async() => {
         const updates: Partial<UserUpdates> = { username: mockUpdateData.username };

         await testRepositoryDatabaseError(
            () => userRepository.update(userId, updates),
            "Database connection failed"
         );
      });

      it("should validate field names against USER_UPDATES constant", async() => {
         const updates = {
            username: mockUpdateData.username,
            invalidField: "should be ignored"
         };

         // Test that invalid fields are filtered out by the repository
         setupMockQuery([{ user_id: userId }]);
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
         ], expectedParams);
      });
   });

   describe("deleteUser", () => {
      it("should execute complete deletion transaction with trigger operations", async() => {
         setupUserDeletionTransactionSuccess();

         const result: boolean = await userRepository.deleteUser(userId);

         // Verify transaction flow, trigger operations, and result
         assertUserDeletionFlow(userId);
         assertTransactionResult(result, true);
      });

      it("should handle user not found scenario", async() => {
         setupUserDeletionTransactionSuccess(0);

         const result: boolean = await userRepository.deleteUser(userId);

         assertQueryResult(result, false);
      });

      it("should handle transaction failures and rollback", async() => {
         setupTransactionError("Deletion failed", "BEGIN");

         await testRepositoryDatabaseError(
            () => userRepository.deleteUser(userId),
            "Deletion failed"
         );

         assertTransactionRollback();
      });

      it("should handle database errors during deletion process", async() => {
         setupUserDeletionTransactionError("Database connection failed", "deletion");

         await testRepositoryDatabaseError(
            () => userRepository.deleteUser(userId),
            "Database connection failed"
         );

         assertTransactionRollback();
         // Verify the index of the ROLLBACK call itself (3rd call)
         assertQueryCalledWithKeyPhrases([
            "ROLLBACK"
         ], [], 3, mockClient.query);
      });
   });
});