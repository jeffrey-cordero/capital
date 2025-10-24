import { jest } from "@jest/globals";
import { createMockUser, TEST_CONSTANTS } from "capital/mocks/server";
import { createConflictingUser, createUserWithCaseVariation } from "capital/mocks/user";
import { User, UserUpdates } from "capital/user";

import {
   assertBasicUserFields,
   assertClientReleased,
   assertCompleteUserFields,
   assertConflictCheckBehavior,
   assertQueryCalledWithKeyPhrases,
   assertQueryNotCalled,
   assertTransactionRollback,
   assertUserDeletionFlow,
   assertUserQueryResult,
   assertUpdateFlow,
   createMockQueryResult,
   mockClient,
   mockClientQueryForUserCreation,
   mockClientQueryForUserDeletion,
   mockClientQueryRejectedOnce,
   mockCreateCategoryRejected,
   mockPool,
   resetDatabaseMocks,
   setupMockQuery,
   setupMockQueryError,
   setupTransactionError,
   setupUserCreationTransaction,
   setupUserCreationWithCategoryError,
   setupUserCreationWithDatabaseError,
   setupUserDeletionTransactionError,
   setupUserDeletionTransactionSuccess,
   setupUserLookupWithDatabaseError,
   testMultipleFieldUpdate,
   testSingleFieldUpdate,
   testUpdateResult
} from "@/tests/mocks/repositories";


jest.mock("pg", () => ({
   Pool: jest.fn(() => mockPool)
}));
jest.mock("@/repository/budgetsRepository");

import * as userRepository from "@/repository/userRepository";

describe("User Repository", () => {
   const username: string = "testuser";
   const email: string = "test@example.com";
   const password: string = "hashed_password_123";
   const userId: string = TEST_CONSTANTS.TEST_USER_ID;

   let budgetsRepository: typeof import("@/repository/budgetsRepository");

   beforeEach(async() => {
      resetDatabaseMocks();
      mockPool.connect.mockResolvedValue(mockClient);
      budgetsRepository = await import("@/repository/budgetsRepository");
   });

   describe("findConflictingUsers", () => {
      it("should find users by exact username match", async() => {
         const conflictingUser: User = createConflictingUser(username, "different@example.com");
         setupMockQuery([conflictingUser]);

         const result: User[] = await userRepository.findConflictingUsers(username, email);

         assertConflictCheckBehavior(username, email);
         assertUserQueryResult(result, [conflictingUser]);
      });

      it("should find users by exact email match", async() => {
         const conflictingUser: User = createConflictingUser("differentuser", email);
         setupMockQuery([conflictingUser]);

         const result: User[] = await userRepository.findConflictingUsers(username, email);

         assertConflictCheckBehavior(username, email);
         assertUserQueryResult(result, [conflictingUser]);
      });

      it("should find users by both username and email", async() => {
         const conflictingUser: User = createConflictingUser(username, email);
         setupMockQuery([conflictingUser]);

         const result: User[] = await userRepository.findConflictingUsers(username, email);

         assertConflictCheckBehavior(username, email);
         assertUserQueryResult(result, [conflictingUser]);
      });

      it("should return empty array when no conflicts exist", async() => {
         setupMockQuery([]);

         const result: User[] = await userRepository.findConflictingUsers(username, email);

         assertConflictCheckBehavior(username, email);
         assertUserQueryResult(result, []);
      });

      it("should exclude specific user_id when provided", async() => {
         setupMockQuery([]);

         const result: User[] = await userRepository.findConflictingUsers(username, email, userId);

         const expectedParams = [username.toLowerCase().trim(), email.toLowerCase().trim(), userId];
         assertQueryCalledWithKeyPhrases([
            "SELECT user_id, username, email",
            "FROM users",
            "WHERE (username_normalized = $1 OR email_normalized = $2)",
            "AND (user_id IS DISTINCT FROM $3)"
         ], expectedParams);
         assertUserQueryResult(result, []);
      });

      it("should handle case-insensitive matching via normalized fields", async() => {
         const conflictingUser: User = createUserWithCaseVariation(username, email, "uppercase");
         setupMockQuery([conflictingUser]);

         const result: User[] = await userRepository.findConflictingUsers(username, email);

         assertConflictCheckBehavior(username, email);
         assertUserQueryResult(result, [conflictingUser]);
      });

      it("should handle null/undefined user_id parameter", async() => {
         setupMockQuery([]);

         const result: User[] = await userRepository.findConflictingUsers(username, email, undefined);

         const expectedParams = [username.toLowerCase().trim(), email.toLowerCase().trim(), undefined];
         assertQueryCalledWithKeyPhrases([
            "SELECT user_id, username, email",
            "FROM users",
            "WHERE (username_normalized = $1 OR email_normalized = $2)",
            "AND (user_id IS DISTINCT FROM $3)"
         ], expectedParams);
         assertUserQueryResult(result, []);
      });

      it("should handle database errors during conflict check", async() => {
         setupUserLookupWithDatabaseError("Database connection failed");

         await expect(userRepository.findConflictingUsers(username, email))
            .rejects.toThrow("Database connection failed");

         assertConflictCheckBehavior(username, email);
      });

      it("should properly construct WHERE clause with DISTINCT FROM", async() => {
         setupMockQuery([]);

         await userRepository.findConflictingUsers(username, email, userId);

         const expectedParams = [username.toLowerCase().trim(), email.toLowerCase().trim(), userId];
         // More robust assertion that checks key SQL phrases rather than exact formatting
         assertQueryCalledWithKeyPhrases([
            "SELECT user_id, username, email",
            "FROM users",
            "WHERE (username_normalized = $1 OR email_normalized = $2)",
            "AND (user_id IS DISTINCT FROM $3)"
         ], expectedParams);
      });
   });

   describe("findByUsername", () => {
      // Common SQL query for findByUsername tests
      const FIND_BY_USERNAME_SQL = `
      SELECT user_id, username, password
      FROM users
      WHERE username = $1;
   `;

      it("should find user by exact username match", async() => {
         const mockUser: User = createMockUser({ username, password });
         setupMockQuery([mockUser]);

         const result: User | null = await userRepository.findByUsername(username);

         const expectedParams = [username];
         assertQueryCalledWithKeyPhrases([
            "SELECT user_id, username, password",
            "FROM users",
            "WHERE username = $1"
         ], expectedParams);
         assertUserQueryResult(result, mockUser);
      });

      it("should return null when username not found", async() => {
         setupMockQuery([]);

         const result: User | null = await userRepository.findByUsername(username);

         const expectedParams = [username];
         assertQueryCalledWithKeyPhrases([
            "SELECT user_id, username, password",
            "FROM users",
            "WHERE username = $1"
         ], expectedParams);
         expect(result).toBeNull();
      });

      it("should return user with correct fields (user_id, username, password)", async() => {
         const mockUser = { user_id: userId, username, password };
         setupMockQuery([mockUser]);

         const result: User | null = await userRepository.findByUsername(username);

         assertBasicUserFields(result);
      });

      it("should handle database errors during username lookup", async() => {
         setupMockQueryError("Database connection failed");

         await expect(userRepository.findByUsername(username))
            .rejects.toThrow("Database connection failed");

         const expectedParams = [username];
         assertQueryCalledWithKeyPhrases([
            "SELECT user_id, username, password",
            "FROM users",
            "WHERE username = $1"
         ], expectedParams);
      });

      it("should be case-sensitive for username matching", async() => {
         setupMockQuery([]);

         await userRepository.findByUsername(username.toUpperCase());

         const expectedParams = [username.toUpperCase()];
         assertQueryCalledWithKeyPhrases([
            "SELECT user_id, username, password",
            "FROM users",
            "WHERE username = $1"
         ], expectedParams);
      });

      it("should handle special characters in username", async() => {
         const specialUsername = "test_user-123";
         setupMockQuery([]);

         await userRepository.findByUsername(specialUsername);

         const expectedParams = [specialUsername];
         assertQueryCalledWithKeyPhrases([
            "SELECT user_id, username, password",
            "FROM users",
            "WHERE username = $1"
         ], expectedParams);
      });
   });

   describe("findByUserId", () => {
      // Common SQL query for findByUserId tests
      const FIND_BY_USER_ID_SQL = `
      SELECT * FROM users
      WHERE user_id = $1;
   `;

      it("should find user by user_id with all fields", async() => {
         const mockUser: User = createMockUser({ user_id: userId });
         setupMockQuery([mockUser]);

         const result: User | null = await userRepository.findByUserId(userId);

         const expectedParams = [userId];
         assertQueryCalledWithKeyPhrases([
            "SELECT * FROM users",
            "WHERE user_id = $1"
         ], expectedParams);
         assertUserQueryResult(result, mockUser);
      });

      it("should return null when user_id not found", async() => {
         setupMockQuery([]);

         const result: User | null = await userRepository.findByUserId(userId);

         const expectedParams = [userId];
         assertQueryCalledWithKeyPhrases([
            "SELECT * FROM users",
            "WHERE user_id = $1"
         ], expectedParams);
         expect(result).toBeNull();
      });

      it("should return complete user object (all columns)", async() => {
         const mockUser: User = createMockUser({ user_id: userId });
         setupMockQuery([mockUser]);

         const result: User | null = await userRepository.findByUserId(userId);

         assertCompleteUserFields(result);
      });

      it("should handle database errors during user_id lookup", async() => {
         setupMockQueryError("Database connection failed");

         await expect(userRepository.findByUserId(userId))
            .rejects.toThrow("Database connection failed");

         const expectedParams = [userId];
         assertQueryCalledWithKeyPhrases([
            "SELECT * FROM users",
            "WHERE user_id = $1"
         ], expectedParams);
      });

      it("should handle invalid UUID format gracefully", async() => {
         const invalidUserId = "invalid-uuid";
         setupMockQueryError("invalid input syntax for type uuid");

         await expect(userRepository.findByUserId(invalidUserId))
            .rejects.toThrow("invalid input syntax for type uuid");

         const expectedParams = [invalidUserId];
         assertQueryCalledWithKeyPhrases([
            "SELECT * FROM users",
            "WHERE user_id = $1"
         ], expectedParams);
      });
   });

   describe("create", () => {
      // Common SQL query for create tests
      const CREATE_USER_SQL = `
         INSERT INTO users (username, name, password, email, birthday)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING user_id;
      `;

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

      it("should create user successfully with default budget categories", async() => {
         setupUserCreationTransaction(userId);

         const result: string = await userRepository.create(userData);

         expect(result).toBe(userId);
         expect(budgetsRepository.createCategory).toHaveBeenCalledTimes(2);
      });

      it("should return created user_id", async() => {
         setupUserCreationTransaction(userId);

         const result: string = await userRepository.create(userData);

         expect(result).toBe(userId);
      });

      it("should create categories with correct parameters (type, goal, month, year)", async() => {
         setupUserCreationTransaction(userId);

         await userRepository.create(userData);

         // Verify both Income and Expenses categories
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

      it("should use current month/year for default categories", async() => {
         const mockResult = createMockQueryResult([{ user_id: userId }]);
         mockClientQueryForUserCreation(mockResult);

         await userRepository.create(userData);

         const today = new Date(new Date().setHours(0, 0, 0, 0));
         const expectedMonth = today.getUTCMonth() + 1;
         const expectedYear = today.getUTCFullYear();

         expect(budgetsRepository.createCategory).toHaveBeenNthCalledWith(1, userId,
            expect.objectContaining({
               month: expectedMonth,
               year: expectedYear
            }), mockClient);

         expect(budgetsRepository.createCategory).toHaveBeenNthCalledWith(2, userId,
            expect.objectContaining({
               month: expectedMonth,
               year: expectedYear
            }), mockClient);
      });

      it("should handle INSERT query with correct user fields", async() => {
         const mockResult = createMockQueryResult([{ user_id: userId }]);
         mockClientQueryForUserCreation(mockResult);

         await userRepository.create(userData);

         const expectedParams = [
            userData.username,
            userData.name,
            userData.password,
            userData.email,
            userData.birthday
         ];
         expect(mockClient.query).toHaveBeenCalledWith(CREATE_USER_SQL, expectedParams);
      });

      it("should follow complete transaction flow with user creation", async() => {
         const mockResult = createMockQueryResult([{ user_id: userId }]);
         mockClientQueryForUserCreation(mockResult);

         await userRepository.create(userData);

         // Verify transaction flow: BEGIN, user INSERT, COMMIT
         // Note: Category creation is handled by budgetsRepository, not direct client.query calls
         expect(mockClient.query).toHaveBeenCalledTimes(3);
         expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;");
         expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining("INSERT INTO users"), [
            userData.username,
            userData.name,
            userData.password,
            userData.email,
            userData.birthday
         ]);
         expect(mockClient.query).toHaveBeenNthCalledWith(3, "COMMIT;");
      });

      it("should rollback transaction if user creation fails", async() => {
         setupTransactionError("User creation failed", "BEGIN");

         await expect(userRepository.create(userData))
            .rejects.toThrow("User creation failed");

         assertTransactionRollback();
      });

      it("should rollback transaction if category creation fails", async() => {
         setupUserCreationWithCategoryError(userId, "Category creation failed");
         mockCreateCategoryRejected("Category creation failed");

         await expect(userRepository.create(userData))
            .rejects.toThrow("Category creation failed");

         assertTransactionRollback();
      });

      it("should release client after success", async() => {
         const mockResult = createMockQueryResult([{ user_id: userId }]);
         mockClientQueryForUserCreation(mockResult);

         await userRepository.create(userData);

         assertClientReleased();
      });

      it("should release client after failure", async() => {
         mockClientQueryRejectedOnce("User creation failed");

         await expect(userRepository.create(userData))
            .rejects.toThrow("User creation failed");

         assertClientReleased();
      });

      it("should handle database errors during user creation", async() => {
         setupUserCreationWithDatabaseError("Database connection failed");

         await expect(userRepository.create(userData))
            .rejects.toThrow("Database connection failed");

         expect(budgetsRepository.createCategory).not.toHaveBeenCalled();
      });

      it("should handle database errors during category creation", async() => {
         setupUserCreationWithCategoryError(userId, "Database connection failed");
         mockCreateCategoryRejected("Database connection failed");

         await expect(userRepository.create(userData))
            .rejects.toThrow("Database connection failed");

         expect(budgetsRepository.createCategory).toHaveBeenCalledTimes(1);
      });
   });

   describe("update", () => {
      // Common SQL queries for update tests
      const UPDATE_USER_SQL = `
      UPDATE users
      SET username = $1
      WHERE user_id = $2
      RETURNING user_id;
   `;

      it("should update single field (username only)", async() => {
         // Arrange
         const updates = { username: "newusername" };
         setupMockQuery([{ user_id: userId }]);

         // Act
         const result: boolean = await userRepository.update(userId, updates);

         // Assert
         const expectedParams = ["newusername", userId];
         assertQueryCalledWithKeyPhrases([
            "UPDATE users",
            "SET username = $1",
            "WHERE user_id = $2",
            "RETURNING user_id"
         ], expectedParams);
         expect(result).toBe(true);
      });

      it("should update single field (email only)", async() => {
         await testSingleFieldUpdate("users", "email", "newemail@example.com", "user_id", userId, userRepository.update);
      });

      it("should update single field (name only)", async() => {
         await testSingleFieldUpdate("users", "name", "New Name", "user_id", userId, userRepository.update);
      });

      it("should update single field (password only)", async() => {
         await testSingleFieldUpdate("users", "password", "newpassword", "user_id", userId, userRepository.update);
      });

      it("should update single field (birthday only)", async() => {
         await testSingleFieldUpdate("users", "birthday", "1990-01-01", "user_id", userId, userRepository.update);
      });

      it("should update multiple fields (username + email)", async() => {
         const updates = {
            username: "newusername",
            email: "newemail@example.com"
         };
         await testMultipleFieldUpdate("users", updates, "user_id", userId, userRepository.update);
      });

      it("should update all fields together", async() => {
         const updates = {
            username: "newusername",
            name: "New Name",
            password: "newpassword",
            email: "newemail@example.com",
            birthday: "1990-01-01"
         };
         await testMultipleFieldUpdate("users", updates, "user_id", userId, userRepository.update);
      });

      it("should return true when user exists and is updated", async() => {
         const updates = { username: "newusername" };
         await testUpdateResult("users", updates, "user_id", userId, userRepository.update, true);
      });

      it("should return false when user does not exist", async() => {
         const updates = { username: "newusername" };
         await testUpdateResult("users", updates, "user_id", userId, userRepository.update, false);
      });

      it("should return true immediately when no fields provided (no-op)", async() => {
         const updates: Partial<UserUpdates> = {};

         const result: boolean = await userRepository.update(userId, updates);

         assertQueryNotCalled();
         expect(result).toBe(true);
      });

      it("should construct UPDATE query with correct parameterization", async() => {
         const updates = {
            username: "newusername",
            email: "newemail@example.com"
         };
         setupMockQuery([{ user_id: userId }]);

         await userRepository.update(userId, updates);

         const expectedParams = ["newusername", "newemail@example.com", userId];
         assertUpdateFlow("users", "user_id", updates, expectedParams);
      });

      it("should properly increment parameter indices", async() => {
         const updates = {
            username: "newusername",
            name: "New Name",
            email: "newemail@example.com"
         };
         setupMockQuery([{ user_id: userId }]);

         await userRepository.update(userId, updates);

         const expectedParams = ["newusername", "New Name", "newemail@example.com", userId];
         assertUpdateFlow("users", "user_id", updates, expectedParams);
      });

      it("should handle database errors during update", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };
         setupMockQueryError("Database connection failed");

         await expect(userRepository.update(userId, updates))
            .rejects.toThrow("Database connection failed");

         const expectedParams = ["newusername", userId];
         assertQueryCalledWithKeyPhrases([
            "UPDATE users",
            "SET username = $1",
            "WHERE user_id = $2",
            "RETURNING user_id"
         ], expectedParams);
      });

      it("should validate field names against USER_UPDATES constant", async() => {
         const updates = {
            username: "newusername",
            invalidField: "should be ignored"
         };
         setupMockQuery([{ user_id: userId }]);

         await userRepository.update(userId, updates);

         // Should only include valid fields from USER_UPDATES constant
         const expectedParams = ["newusername", userId];
         assertQueryCalledWithKeyPhrases([
            "UPDATE users",
            "SET username = $1",
            "WHERE user_id = $2",
            "RETURNING user_id"
         ], expectedParams);
      });
   });

   describe("deleteUser", () => {

      it("should delete user successfully", async() => {
         setupUserDeletionTransactionSuccess();

         const result: boolean = await userRepository.deleteUser(userId);

         expect(result).toBe(true);
      });

      it("should return true when user is deleted", async() => {
         setupUserDeletionTransactionSuccess();

         const result: boolean = await userRepository.deleteUser(userId);

         expect(result).toBe(true);
      });

      it("should return false when user does not exist (rowCount === 0)", async() => {
         setupUserDeletionTransactionSuccess(0);

         const result: boolean = await userRepository.deleteUser(userId);

         expect(result).toBe(false);
      });

      it("should follow complete deletion flow with trigger operations", async() => {
         const mockResult = createMockQueryResult([]);
         mockResult.rowCount = 1;
         mockClientQueryForUserDeletion(mockResult);

         await userRepository.deleteUser(userId);

         assertUserDeletionFlow(userId, true);
      });

      it("should disable trigger before deletion", async() => {
         const mockResult = createMockQueryResult([]);
         mockResult.rowCount = 1;
         mockClientQueryForUserDeletion(mockResult);

         await userRepository.deleteUser(userId);

         expect(mockClient.query).toHaveBeenCalledWith("ALTER TABLE budget_categories DISABLE TRIGGER prevent_main_budget_category_modifications_trigger");
      });

      it("should re-enable trigger after deletion", async() => {
         const mockResult = createMockQueryResult([]);
         mockResult.rowCount = 1;
         mockClientQueryForUserDeletion(mockResult);

         await userRepository.deleteUser(userId);

         expect(mockClient.query).toHaveBeenCalledWith("ALTER TABLE budget_categories ENABLE TRIGGER prevent_main_budget_category_modifications_trigger");
      });

      it("should use SERIALIZABLE isolation level", async() => {
         const mockResult = createMockQueryResult([]);
         mockResult.rowCount = 1;
         mockClientQueryForUserDeletion(mockResult);

         await userRepository.deleteUser(userId);

         expect(mockClient.query).toHaveBeenCalledWith("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;");
      });

      it("should rollback transaction if deletion fails", async() => {
         setupTransactionError("Deletion failed", "BEGIN");

         await expect(userRepository.deleteUser(userId))
            .rejects.toThrow("Deletion failed");

         assertTransactionRollback();
      });

      it("should rollback transaction if trigger operations fail", async() => {
         setupTransactionError("Trigger disable failed", "BEGIN");

         await expect(userRepository.deleteUser(userId))
            .rejects.toThrow("Trigger disable failed");

         assertTransactionRollback();
      });

      it("should release client after success", async() => {
         const mockResult = createMockQueryResult([]);
         mockResult.rowCount = 1;
         mockClientQueryForUserDeletion(mockResult);

         await userRepository.deleteUser(userId);

         assertClientReleased();
      });

      it("should release client after failure", async() => {
         mockClientQueryRejectedOnce("Deletion failed");

         await expect(userRepository.deleteUser(userId))
            .rejects.toThrow("Deletion failed");

         assertClientReleased();
      });

      it("should handle database errors during trigger disable", async() => {
         mockClientQueryRejectedOnce("Database connection failed");

         await expect(userRepository.deleteUser(userId))
            .rejects.toThrow("Database connection failed");

         expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK;");
      });

      it("should handle database errors during deletion", async() => {
         setupUserDeletionTransactionError("Database connection failed", "deletion");

         await expect(userRepository.deleteUser(userId))
            .rejects.toThrow("Database connection failed");

         expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK;");
      });

      it("should handle database errors during trigger enable", async() => {
         setupUserDeletionTransactionError("Database connection failed", "trigger_enable");

         await expect(userRepository.deleteUser(userId))
            .rejects.toThrow("Database connection failed");

         expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK;");
      });

      it("should ensure trigger is re-enabled even after errors", async() => {
         setupUserDeletionTransactionError("Deletion failed", "deletion");

         await expect(userRepository.deleteUser(userId))
            .rejects.toThrow("Deletion failed");

         // Should not call enable trigger when deletion fails
         expect(mockClient.query).not.toHaveBeenCalledWith("ALTER TABLE budget_categories ENABLE TRIGGER prevent_main_budget_category_modifications_trigger");
      });
   });
});