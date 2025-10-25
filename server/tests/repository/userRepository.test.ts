import { jest } from "@jest/globals";
import { createMockUser, TEST_CONSTANTS } from "capital/mocks/server";
import { createConflictingUser } from "capital/mocks/user";
import { User, UserUpdates } from "capital/user";

import {
   arrangeMockQuery,
   arrangeMockQueryError,
   arrangeUpdateQueryFormation,
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
 * Global mock pool for the mock database connection at the application level
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
    * Assert conflict check formation with exact SQL and parameters
    *
    * @param {string} [userId] - Expected user_id parameter (optional)
    */
   const assertConflictCheckFormation = (userId?: string): void => {
      assertQueryCalledWithKeyPhrases([
         "SELECT user_id, username, email",
         "FROM users",
         "WHERE (username_normalized = $1 OR email_normalized = $2)",
         "AND (user_id != $3 OR user_id IS NULL OR $3 IS NULL)"
      ], [username.toLowerCase().trim(), email.toLowerCase().trim(), userId], 0, mockPool);
   };

   /**
    * Assert username lookup formation with exact SQL and parameters
    */
   const assertUsernameLookupFormation = (): void => {
      assertQueryCalledWithKeyPhrases([
         "SELECT user_id, username, password",
         "FROM users"
      ], [username], 0, mockPool);
   };

   /**
    * Assert user ID lookup formation with exact SQL and parameters
    *
    * @param {string} userId - Expected user_id parameter
    */
   const assertUserIdLookupFormation = (userId: string): void => {
      assertQueryCalledWithKeyPhrases([
         "SELECT * FROM users",
         "WHERE user_id = $1"
      ], [userId], 0, mockPool);
   };

   /**
    * Assert user deletion flow with trigger operations
    *
    * @param {string} userId - Expected user ID
    */
   const assertUserDeletionFlow = (userId: string): void => {
      // Verify the transaction isolation level (1st call)
      assertQueryCalledWithKeyPhrases([
         "BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE"
      ], [], 0, mockPool);

      // Verify the trigger disable (2nd call)
      assertQueryCalledWithKeyPhrases([
         "ALTER TABLE budget_categories DISABLE TRIGGER prevent_main_budget_category_modifications_trigger"
      ], [], 1, mockPool);

      // Verify the deletion query (3rd call)
      assertQueryCalledWithKeyPhrases([
         "DELETE FROM users",
         "WHERE user_id = $1"
      ], [userId], 2, mockPool);

      // Verify the trigger enable (4th call)
      assertQueryCalledWithKeyPhrases([
         "ALTER TABLE budget_categories ENABLE TRIGGER prevent_main_budget_category_modifications_trigger"
      ], [], 3, mockPool);

      // Verify the transaction commit (5th call)
      assertQueryCalledWithKeyPhrases([
         "COMMIT"
      ], [], 4, mockPool);
   };

   /**
    * Arrange mock client for successful user deletion transaction
    *
    * @param {number} rowCount - Number of rows affected by deletion
    */
   const arrangeUserDeletionTransactionSuccess = (rowCount: number = 1): void => {
      mockClient.query
         .mockResolvedValueOnce({}) // BEGIN
         .mockResolvedValueOnce({}) // Disable trigger
         .mockResolvedValueOnce({ rowCount }) // Deletion
         .mockResolvedValueOnce({}) // Enable trigger
         .mockResolvedValueOnce({}); // COMMIT
   };

   /**
    * Arrange mock client for user deletion transaction with error at specific stage
    *
    * @param {string} errorMessage - Error message to throw
    * @param {string} failStage - Stage where error should occur ("deletion", "trigger_disable", "trigger_enable")
    */
   const arrangeUserDeletionTransactionError = (errorMessage: string, failStage: string): void => {
      switch (failStage) {
         case "trigger_disable":
            mockClient.query.mockResolvedValueOnce({}) // BEGIN
               .mockRejectedValueOnce(new Error(errorMessage)); // Disable trigger
            break;
         case "deletion":
            mockClient.query.mockResolvedValueOnce({}) // BEGIN
               .mockResolvedValueOnce({}) // Disable trigger
               .mockRejectedValueOnce(new Error(errorMessage)); // Deletion
            break;
         case "trigger_enable":
            mockClient.query.mockResolvedValueOnce({}) // BEGIN
               .mockResolvedValueOnce({}) // Disable trigger
               .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Deletion
               .mockRejectedValueOnce(new Error(errorMessage)); // Enable trigger
            break;
         default:
            throw new Error(`Unknown fail stage: ${failStage}`);
      }
   };

   /**
    * Assert user creation flow with transaction operations
    *
    * @param {User} userData - Expected user data
    */
   const assertUserCreationFlow = (userData: User): void => {
      // Verify BEGIN transaction (1st call)
      assertQueryCalledWithKeyPhrases([
         "BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED"
      ], [], 0, mockPool);

      // Verify INSERT query (2nd call)
      assertQueryCalledWithKeyPhrases([
         "INSERT INTO users",
         "VALUES"
      ], [
         userData.username,
         userData.name,
         userData.password,
         userData.email,
         userData.birthday
      ], 1, mockPool);

      // Verify COMMIT (3rd call)
      assertQueryCalledWithKeyPhrases([
         "COMMIT"
      ], [], 2, mockPool);
   };

   /**
    * Arrange mock client for successful user creation transaction
    */
   const arrangeUserCreationTransactionSuccess = (): void => {
      mockClient.query
         .mockResolvedValueOnce({}) // BEGIN
         .mockResolvedValueOnce({ rows: [{ user_id: userId }] }) // INSERT
         .mockResolvedValueOnce({}); // COMMIT
   };

   /**
    * Arrange mock client for user creation transaction with error at specific stage
    *
    * @param {string} errorMessage - Error message to throw
    * @param {string} failStage - Stage where error should occur ("BEGIN", "user_insert")
    */
   const arrangeUserCreationTransactionError = (errorMessage: string, failStage: string): void => {
      switch (failStage) {
         case "BEGIN":
            mockClient.query.mockRejectedValueOnce(new Error(errorMessage)); // BEGIN fails
            break;
         case "user_insert":
            mockClient.query.mockResolvedValueOnce({}) // BEGIN
               .mockRejectedValueOnce(new Error(errorMessage)); // INSERT fails
            break;
         default:
            throw new Error(`Unknown fail stage: ${failStage}`);
      }
   };

   /**
    * Reject the next createCategory call
    *
    * @param {string} errorMessage - Error message to reject with
    */
   const rejectNextCategoryCreation = (errorMessage: string): void => {
      jest.mocked(budgetsRepository.createCategory).mockRejectedValueOnce(new Error(errorMessage));
   };

   beforeEach(async() => {
      mockPool = createMockPool();
      mockClient = createMockClient();
      resetDatabaseMocks(globalMockPool, mockPool, mockClient);
      budgetsRepository = await import("@/repository/budgetsRepository");
   });

   describe("findConflictingUsers", () => {
      it("should return conflicting user when username or email already exists", async() => {
         const conflictingUser: User = createConflictingUser(username, email);
         arrangeMockQuery([conflictingUser], mockPool);

         const result: User[] = await userRepository.findConflictingUsers(username, email);

         assertConflictCheckFormation();
         assertQueryResult(result, [conflictingUser]);
      });

      it("should return empty array when no conflicting user is found", async() => {
         arrangeMockQuery([], mockPool);

         const result: User[] = await userRepository.findConflictingUsers(username, email, userId);

         assertConflictCheckFormation(userId);
         assertQueryResult(result, []);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await expectRepositoryToThrow(
            () => userRepository.findConflictingUsers(username, email),
            "Database connection failed"
         );
         assertConflictCheckFormation();
      });
   });

   describe("findByUsername", () => {
      it("should return user data when username exists", async() => {
         const mockUser = { user_id: userId, username, password };
         arrangeMockQuery([mockUser], mockPool);

         const result: User | null = await userRepository.findByUsername(username);

         // Verify query formation and result handling
         assertUsernameLookupFormation();
         assertObjectProperties(result!, ["user_id", "username", "password"], ["email", "name", "birthday"]);
         assertQueryResult(result, mockUser);
      });

      it("should return null when username does not exist", async() => {
         arrangeMockQuery([], mockPool);

         const result: User | null = await userRepository.findByUsername(username);

         assertUsernameLookupFormation();
         assertQueryResult(result, null);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await expectRepositoryToThrow(
            () => userRepository.findByUsername(username),
            "Database connection failed"
         );
         assertUsernameLookupFormation();
      });
   });

   describe("findByUserId", () => {
      it("should return complete user data when user_id exists", async() => {
         const mockUser: User = createMockUser({ user_id: userId });
         arrangeMockQuery([mockUser], mockPool);

         const result: User | null = await userRepository.findByUserId(userId);

         // Verify query formation and complete user object return
         assertUserIdLookupFormation(userId);
         assertObjectProperties(result!, ["user_id", "username", "password", "email", "name", "birthday"]);
         assertQueryResult(result, mockUser);
      });

      it("should return null when user_id does not exist", async() => {
         arrangeMockQuery([], mockPool);

         const result: User | null = await userRepository.findByUserId(userId);

         assertUserIdLookupFormation(userId);
         assertQueryResult(result, null);
      });

      it("should throw error when database connection fails", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await expectRepositoryToThrow(
            () => userRepository.findByUserId(userId),
            "Database connection failed"
         );
         assertUserIdLookupFormation(userId);
      });

      it("should return null when user_id has invalid UUID format", async() => {
         const invalidUserId = "invalid-uuid";
         arrangeMockQueryError("invalid input syntax for type uuid", mockPool);

         await expectRepositoryToThrow(
            () => userRepository.findByUserId(invalidUserId),
            "invalid input syntax for type uuid"
         );
         assertUserIdLookupFormation(invalidUserId);
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

      it("should create user successfully with complete transaction flow", async() => {
         arrangeUserCreationTransactionSuccess();

         const result: string = await userRepository.create(userData);

         // Verify return value
         assertQueryResult(result, userId);

         // Verify transaction flow: BEGIN, user INSERT, COMMIT
         expect(mockClient.query).toHaveBeenCalledTimes(3);

         // Verify BEGIN transaction
         assertUserCreationFlow(userData);

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

      it("should rollback transaction when user creation fails", async() => {
         arrangeUserCreationTransactionError("User creation failed", "user_insert");

         await expectRepositoryToThrow(
            () => userRepository.create(userData),
            "User creation failed"
         );

         assertTransactionRollback(mockClient);
      });

      it("should rollback transaction when category creation fails", async() => {
         arrangeUserCreationTransactionSuccess();
         rejectNextCategoryCreation("Category creation failed");

         await expectRepositoryToThrow(
            () => userRepository.create(userData),
            "Category creation failed"
         );

         assertTransactionRollback(mockClient);
      });

      it("should throw error when database connection fails during user creation", async() => {
         arrangeUserCreationTransactionError("Database connection failed", "BEGIN");

         await expectRepositoryToThrow(
            () => userRepository.create(userData),
            "Database connection failed"
         );
         expect(budgetsRepository.createCategory).not.toHaveBeenCalled();
      });

      it("should throw error when database connection fails during category creation", async() => {
         arrangeUserCreationTransactionSuccess();
         rejectNextCategoryCreation("Database connection failed");

         await expectRepositoryToThrow(
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
            await arrangeUpdateQueryFormation("users", { [field]: mockUpdateData[field] }, "user_id", userId, userRepository.update, mockPool);
         });
      });

      it("should update multiple fields (username + email)", async() => {
         const updates = {
            username: mockUpdateData.username,
            email: mockUpdateData.email
         };
         await arrangeUpdateQueryFormation("users", updates, "user_id", userId, userRepository.update, mockPool);
      });

      it("should update all fields together", async() => {
         await arrangeUpdateQueryFormation("users", mockUpdateData, "user_id", userId, userRepository.update, mockPool);
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

      it("should return true immediately when no fields provided", async() => {
         const updates: Partial<UserUpdates> = {};

         const result: boolean = await userRepository.update(userId, updates);

         assertQueryNotCalled(mockPool);
         assertQueryResult(result, true);
      });

      it("should construct UPDATE query with correct parameter indices", async() => {
         const updates = {
            username: mockUpdateData.username,
            email: mockUpdateData.email
         };

         await arrangeUpdateQueryFormation("users", updates, "user_id", userId, userRepository.update, mockPool);
      });

      it("should increment parameter indices correctly for multiple fields", async() => {
         const updates = {
            username: mockUpdateData.username,
            name: mockUpdateData.name,
            email: mockUpdateData.email
         };

         await arrangeUpdateQueryFormation("users", updates, "user_id", userId, userRepository.update, mockPool);
      });

      it("should throw error when database connection fails", async() => {
         const updates: Partial<UserUpdates> = { username: mockUpdateData.username };
         arrangeMockQueryError("Database connection failed", mockPool);

         await expectRepositoryToThrow(
            () => userRepository.update(userId, updates),
            "Database connection failed"
         );
      });

      it("should filter out invalid fields and only update valid ones", async() => {
         const updates = {
            username: mockUpdateData.username,
            invalidField: "should be ignored"
         };

         // Test that invalid fields are filtered out by the repository
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
      it("should delete user successfully with complete transaction flow", async() => {
         arrangeUserDeletionTransactionSuccess();

         const result: boolean = await userRepository.deleteUser(userId);

         // Verify transaction flow, trigger operations, and result
         assertUserDeletionFlow(userId);
         assertTransactionResult(result, true, mockClient);
      });

      it("should return false when user does not exist", async() => {
         arrangeUserDeletionTransactionSuccess(0);

         const result: boolean = await userRepository.deleteUser(userId);

         assertQueryResult(result, false);
      });

      it("should rollback transaction when deletion fails", async() => {
         arrangeUserDeletionTransactionError("Deletion failed", "trigger_disable");

         await expectRepositoryToThrow(
            () => userRepository.deleteUser(userId),
            "Deletion failed"
         );

         assertTransactionRollback(mockClient);
      });

      it("should throw error when database connection fails during deletion", async() => {
         arrangeUserDeletionTransactionError("Database connection failed", "deletion");

         await expectRepositoryToThrow(
            () => userRepository.deleteUser(userId),
            "Database connection failed"
         );

         assertTransactionRollback(mockClient);
         // Verify the index of the ROLLBACK call itself (3rd call)
         assertQueryCalledWithKeyPhrases([
            "ROLLBACK"
         ], [], 3, mockPool);
      });
   });
});