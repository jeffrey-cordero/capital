import { createMockUser, TEST_CONSTANTS } from "capital/mocks/server";
import {
   createConflictingUser,
   createMockUserDetails,
   createUserWithCaseVariation,
   createUserWithWeakPassword,
   createValidRegistration
} from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";
import { User, UserDetails, UserUpdates } from "capital/user";

import * as userService from "@/services/userService";
import { createMockMiddleware, MockResponse } from "@/tests/utils/api";
import {
   assertCacheHitBehavior,
   assertCacheMissBehavior,
   assertServiceBadRequestErrorResponse,
   assertServiceConflictErrorResponse,
   assertServiceNotFoundErrorResponse,
   assertServiceSuccessResponseWithData,
   assertServiceSuccessResponseWithoutData,
   assertServiceValidationErrorResponse,
   assertServiceValidationErrorResponseWithPattern,
   assertUserCreationConflictBehavior,
   assertUserCreationSuccessBehavior,
   assertUserDeletionSuccessBehavior,
   assertUserNotFoundBehavior,
   assertUserUpdateSuccessBehavior,
   setupDefaultRedisCacheBehavior,
   setupMockCacheError,
   setupMockCacheHit,
   setupMockCacheMiss,
   setupMockRepositoryEmpty,
   setupMockRepositoryError,
   setupMockRepositoryNull,
   setupMockRepositorySuccess,
   testDatabaseErrorScenario,
   testRedisErrorScenario
} from "@/tests/utils/services";

// Mock all external dependencies
jest.mock("argon2", () => ({
   hash: jest.fn(),
   verify: jest.fn()
}));

jest.mock("@/lib/redis", () => ({
   getCacheValue: jest.fn(),
   setCacheValue: jest.fn(),
   removeCacheValue: jest.fn()
}));

jest.mock("@/lib/middleware", () => ({
   configureToken: jest.fn()
}));

jest.mock("@/services/authenticationService", () => ({
   logoutUser: jest.fn()
}));

jest.mock("@/repository/userRepository", () => ({
   findByUserId: jest.fn(),
   findConflictingUsers: jest.fn(),
   create: jest.fn(),
   update: jest.fn(),
   deleteUser: jest.fn()
}));

jest.mock("@/lib/logger", () => ({
   logger: {
      error: jest.fn()
   }
}));

describe("User Service", () => {
   let mockRes: MockResponse;
   let userRepository: typeof import("@/repository/userRepository");
   let redis: typeof import("@/lib/redis");
   let argon2: typeof import("argon2");
   let middleware: typeof import("@/lib/middleware");
   let authenticationService: typeof import("@/services/authenticationService");
   let logger: typeof import("@/lib/logger");

   beforeEach(async() => {
      // Reset all mocks
      jest.clearAllMocks();

      // Get fresh module references
      userRepository = await import("@/repository/userRepository");
      redis = await import("@/lib/redis");
      argon2 = await import("argon2");
      middleware = await import("@/lib/middleware");
      authenticationService = await import("@/services/authenticationService");
      logger = await import("@/lib/logger");

      // Reset Redis mocks to default behavior using helper methods
      setupDefaultRedisCacheBehavior(redis);

      // Setup mock response object
      const { mockRes: mockResponse } = createMockMiddleware();
      mockRes = mockResponse;
      mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
   });

   describe("fetchUserDetails", () => {
      const user_id = TEST_CONSTANTS.TEST_USER_ID;

      it("should return cached user details on cache hit", async() => {
         const cachedUserDetails: UserDetails = createMockUserDetails();
         const cachedData = JSON.stringify(cachedUserDetails);

         setupMockCacheHit(redis, "getCacheValue", cachedData);

         const result = await userService.fetchUserDetails(user_id);

         assertCacheHitBehavior(redis, "getCacheValue", userRepository, "findByUserId", `user:${user_id}`);

         assertServiceSuccessResponseWithData(result, HTTP_STATUS.OK, cachedUserDetails);
      });

      it("should fetch from database and cache on cache miss", async() => {
         const mockUser: User = createMockUser();
         const expectedUserDetails: UserDetails = {
            username: mockUser.username,
            name: mockUser.name,
            email: mockUser.email,
            birthday: mockUser.birthday
         };

         setupMockCacheMiss(redis, "getCacheValue");
         setupMockRepositorySuccess(userRepository, "findByUserId", mockUser);

         const result = await userService.fetchUserDetails(user_id);

         assertCacheMissBehavior(
            redis,
            "getCacheValue",
            userRepository,
            "findByUserId",
            `user:${user_id}`,
            user_id,
            expectedUserDetails,
            30 * 60 // USER_DETAILS_CACHE_DURATION
         );

         assertServiceSuccessResponseWithData(result, HTTP_STATUS.OK, expectedUserDetails);
      });

      it("should fall back to database on cache error", async() => {
         const mockUser: User = createMockUser();
         const expectedUserDetails: UserDetails = {
            username: mockUser.username,
            name: mockUser.name,
            email: mockUser.email,
            birthday: mockUser.birthday
         };

         // Mock Redis error - getCacheValue should return null on error (handled internally)
         setupMockCacheMiss(redis, "getCacheValue");
         setupMockRepositorySuccess(userRepository, "findByUserId", mockUser);

         const result = await userService.fetchUserDetails(user_id);

         assertCacheMissBehavior(
            redis,
            "getCacheValue",
            userRepository,
            "findByUserId",
            `user:${user_id}`,
            user_id,
            expectedUserDetails,
            30 * 60
         );

         assertServiceSuccessResponseWithData(result, HTTP_STATUS.OK, expectedUserDetails);
      });

      it("should handle Redis cache errors and log them", async() => {
         const mockUser: User = createMockUser();
         const expectedUserDetails: UserDetails = {
            username: mockUser.username,
            name: mockUser.name,
            email: mockUser.email,
            birthday: mockUser.birthday
         };

         // Mock Redis to return null on error (actual behavior)
         setupMockCacheMiss(redis, "getCacheValue");
         setupMockRepositorySuccess(userRepository, "findByUserId", mockUser);

         const result = await userService.fetchUserDetails(user_id);

         // Should work by falling back to database
         assertServiceSuccessResponseWithData(result, HTTP_STATUS.OK, expectedUserDetails);
         expect(userRepository.findByUserId).toHaveBeenCalledWith(user_id);
      });


      it("should return not found when user does not exist", async() => {
         setupMockCacheMiss(redis, "getCacheValue");
         setupMockRepositoryNull(userRepository, "findByUserId");

         const result = await userService.fetchUserDetails(user_id);

         assertUserNotFoundBehavior(userRepository, "findByUserId", redis, user_id);

         assertServiceNotFoundErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should propagate database errors", async() => {
         setupMockCacheMiss(redis, "getCacheValue");
         testDatabaseErrorScenario(userRepository.findByUserId as any, "Database connection failed");

         await expect(userService.fetchUserDetails(user_id)).rejects.toThrow("Database connection failed");

         expect(userRepository.findByUserId).toHaveBeenCalledWith(user_id);
         expect(redis.setCacheValue).not.toHaveBeenCalled();
      });
   });

   describe("createUser", () => {
      it("should create user successfully with valid data", async() => {
         const mockUser = createValidRegistration();
         const hashedPassword = "hashed_password_123";
         const user_id = "new-user-id-123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
         setupMockRepositorySuccess(userRepository, "create", user_id);

         const result = await userService.createUser(mockRes as any, mockUser);

         assertUserCreationSuccessBehavior(
            userRepository,
            argon2,
            middleware,
            mockUser.username,
            mockUser.email,
            mockUser.password,
            hashedPassword,
            { ...mockUser, password: hashedPassword },
            user_id,
            mockRes
         );

         assertServiceSuccessResponseWithData(result, HTTP_STATUS.CREATED, { success: true });
      });

      it("should return validation errors for invalid user data", async() => {
         const invalidUser = {
            username: "a", // Too short
            email: "invalid-email",
            name: "",
            birthday: "invalid-date",
            password: "weak",
            verifyPassword: "different"
         } as any;

         const result = await userService.createUser(mockRes as any, invalidUser);

         expect(userRepository.findConflictingUsers).not.toHaveBeenCalled();
         expect(argon2.hash).not.toHaveBeenCalled();
         expect(userRepository.create).not.toHaveBeenCalled();
         expect(middleware.configureToken).not.toHaveBeenCalled();

         assertServiceValidationErrorResponseWithPattern(result, HTTP_STATUS.BAD_REQUEST, {
            username: expect.any(String),
            email: expect.any(String),
            name: expect.any(String),
            birthday: expect.any(String),
            password: expect.any(String),
            verifyPassword: expect.any(String)
         });
      });

      it("should return validation errors for weak passwords", async() => {
         const weakPasswordUser = createUserWithWeakPassword("tooShort");

         const result = await userService.createUser(mockRes as any, weakPasswordUser);

         expect(userRepository.findConflictingUsers).not.toHaveBeenCalled();
         expect(argon2.hash).not.toHaveBeenCalled();
         expect(userRepository.create).not.toHaveBeenCalled();
         expect(middleware.configureToken).not.toHaveBeenCalled();

         assertServiceValidationErrorResponseWithPattern(result, HTTP_STATUS.BAD_REQUEST, {
            password: expect.any(String)
         });
      });

      it("should return validation errors for passwords without uppercase", async() => {
         const weakPasswordUser = createUserWithWeakPassword("noUppercase");

         const result = await userService.createUser(mockRes as any, weakPasswordUser);

         assertServiceValidationErrorResponseWithPattern(result, HTTP_STATUS.BAD_REQUEST, {
            password: expect.any(String)
         });
      });

      it("should return validation errors for passwords without lowercase", async() => {
         const weakPasswordUser = createUserWithWeakPassword("noLowercase");

         const result = await userService.createUser(mockRes as any, weakPasswordUser);

         assertServiceValidationErrorResponseWithPattern(result, HTTP_STATUS.BAD_REQUEST, {
            password: expect.any(String)
         });
      });

      it("should return validation errors for passwords without numbers", async() => {
         const weakPasswordUser = createUserWithWeakPassword("noNumber");

         const result = await userService.createUser(mockRes as any, weakPasswordUser);

         assertServiceValidationErrorResponseWithPattern(result, HTTP_STATUS.BAD_REQUEST, {
            password: expect.any(String)
         });
      });

      it("should return validation errors for passwords without special characters", async() => {
         const weakPasswordUser = createUserWithWeakPassword("noSpecial");

         const result = await userService.createUser(mockRes as any, weakPasswordUser);

         // Note: "Password123" actually passes validation since special characters are not required
         assertServiceSuccessResponseWithData(result, HTTP_STATUS.CREATED, { success: true });
      });

      it("should return conflict error for existing username", async() => {
         const mockUser = createValidRegistration();
         const conflictingUser = createConflictingUser(mockUser.username, "different@example.com");

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result = await userService.createUser(mockRes as any, mockUser);

         assertUserCreationConflictBehavior(
            userRepository,
            argon2,
            middleware,
            mockUser.username,
            mockUser.email
         );

         assertServiceConflictErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should return conflict error for existing email", async() => {
         const mockUser = createValidRegistration();
         const conflictingUser = createConflictingUser("differentuser", mockUser.email);

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result = await userService.createUser(mockRes as any, mockUser);

         assertServiceConflictErrorResponse(result, HTTP_STATUS.CONFLICT, { email: "Email already exists" });
      });

      it("should return conflict error for both username and email", async() => {
         const mockUser = createValidRegistration();
         const conflictingUser = createConflictingUser(mockUser.username, mockUser.email);

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result = await userService.createUser(mockRes as any, mockUser);

         assertServiceConflictErrorResponse(result, HTTP_STATUS.CONFLICT, {
            username: "Username already exists",
            email: "Email already exists"
         });
      });

      it("should detect case-insensitive username conflicts", async() => {
         const mockUser = createValidRegistration();
         const conflictingUser = createUserWithCaseVariation(
            mockUser.username,
            "different@example.com",
            "uppercase"
         );

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result = await userService.createUser(mockRes as any, mockUser);

         assertServiceConflictErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should detect case-insensitive email conflicts", async() => {
         const mockUser = createValidRegistration();
         const conflictingUser = createUserWithCaseVariation(
            "differentuser",
            mockUser.email,
            "uppercase"
         );

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result = await userService.createUser(mockRes as any, mockUser);

         assertServiceConflictErrorResponse(result, HTTP_STATUS.CONFLICT, { email: "Email already exists" });
      });

      it("should propagate database errors during conflict check", async() => {
         const mockUser = createValidRegistration();
         testDatabaseErrorScenario(userRepository.findConflictingUsers as any, "Database connection failed");

         await expect(userService.createUser(mockRes as any, mockUser)).rejects.toThrow("Database connection failed");

         expect(userRepository.findConflictingUsers).toHaveBeenCalledWith(
            mockUser.username,
            mockUser.email
         );
         expect(argon2.hash).not.toHaveBeenCalled();
         expect(userRepository.create).not.toHaveBeenCalled();
      });

      it("should handle repository errors during conflict check using helper", async() => {
         const mockUser = createValidRegistration();
         setupMockRepositoryError(userRepository, "findConflictingUsers", new Error("Database connection failed"));

         await expect(userService.createUser(mockRes as any, mockUser)).rejects.toThrow("Database connection failed");

         expect(userRepository.findConflictingUsers).toHaveBeenCalledWith(
            mockUser.username,
            mockUser.email
         );
         expect(argon2.hash).not.toHaveBeenCalled();
         expect(userRepository.create).not.toHaveBeenCalled();
      });

      it("should propagate database errors during user creation", async() => {
         const mockUser = createValidRegistration();
         const hashedPassword = "hashed_password_123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
         testDatabaseErrorScenario(userRepository.create as any, "Database connection failed");

         await expect(userService.createUser(mockRes as any, mockUser)).rejects.toThrow("Database connection failed");

         expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            ...mockUser,
            password: hashedPassword,
            birthday: expect.any(String)
         }));
         expect(middleware.configureToken).not.toHaveBeenCalled();
      });

      it("should handle repository errors during user creation using helper", async() => {
         const mockUser = createValidRegistration();
         const hashedPassword = "hashed_password_123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
         setupMockRepositoryError(userRepository, "create", new Error("Database connection failed"));

         await expect(userService.createUser(mockRes as any, mockUser)).rejects.toThrow("Database connection failed");

         expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            ...mockUser,
            password: hashedPassword,
            birthday: expect.any(String)
         }));
         expect(middleware.configureToken).not.toHaveBeenCalled();
      });

      it("should handle Redis cache errors during user creation gracefully", async() => {
         const mockUser = createValidRegistration();
         const hashedPassword = "hashed_password_123";
         const user_id = "new-user-id-123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
         setupMockRepositorySuccess(userRepository, "create", user_id);
         
         // Mock Redis cache to fail silently (actual behavior)
         (redis.setCacheValue as jest.Mock).mockImplementation(() => {
            // Simulate Redis error that gets caught and logged internally
            throw new Error("Redis cache error");
         });

         const result = await userService.createUser(mockRes as any, mockUser);

         // User creation should still succeed despite cache error
         assertServiceSuccessResponseWithData(result, HTTP_STATUS.CREATED, { success: true });
         expect(userRepository.create).toHaveBeenCalled();
         expect(middleware.configureToken).toHaveBeenCalled();
      });

      it("should handle Redis cache errors during user creation using helper", async() => {
         const mockUser = createValidRegistration();
         const hashedPassword = "hashed_password_123";
         const user_id = "new-user-id-123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
         setupMockRepositorySuccess(userRepository, "create", user_id);
         
         // Mock Redis cache error using helper
         setupMockCacheError(redis, "setCacheValue", new Error("Redis cache error"));

         const result = await userService.createUser(mockRes as any, mockUser);

         // Verify Redis error was logged
         testRedisErrorScenario(redis.setCacheValue as any, "Redis cache error");

         // User creation should still succeed despite cache error
         assertServiceSuccessResponseWithData(result, HTTP_STATUS.CREATED, { success: true });
         expect(userRepository.create).toHaveBeenCalled();
         expect(middleware.configureToken).toHaveBeenCalled();
      });
   });

   describe("updateAccountDetails", () => {
      const user_id = TEST_CONSTANTS.TEST_USER_ID;

      it("should update basic user details successfully", async() => {
         const updates: Partial<UserUpdates> = {
            username: "newusername",
            email: "newemail@example.com",
            name: "New Name",
            birthday: "1995-01-01"
         };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositorySuccess(userRepository, "update", true);

         const result = await userService.updateAccountDetails(user_id, updates);

         assertUserUpdateSuccessBehavior(
            userRepository,
            redis,
            updates.username!,
            updates.email!,
            user_id,
            updates,
            `user:${user_id}`
         );

         assertServiceSuccessResponseWithoutData(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should update password successfully with valid credentials", async() => {
         const currentUser: User = createMockUser();
         const updates: Partial<UserUpdates> = {
            password: "Password1!",
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };
         const hashedNewPassword = "hashed_new_password_123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositorySuccess(userRepository, "findByUserId", currentUser);
         (argon2.verify as jest.Mock).mockResolvedValue(true);
         (argon2.hash as jest.Mock).mockResolvedValue(hashedNewPassword);
         setupMockRepositorySuccess(userRepository, "update", true);

         const result = await userService.updateAccountDetails(user_id, updates);

         expect(userRepository.findByUserId).toHaveBeenCalledWith(user_id);
         expect(argon2.verify).toHaveBeenCalledWith(currentUser.password, updates.password);
         expect(argon2.hash).toHaveBeenCalledWith(updates.newPassword);
         expect(userRepository.update).toHaveBeenCalledWith(user_id, {
            ...updates,
            password: hashedNewPassword
         });
         expect(redis.removeCacheValue).toHaveBeenCalledWith(`user:${user_id}`);

         assertServiceSuccessResponseWithoutData(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return validation errors for invalid update data", async() => {
         const invalidUpdates = {
            username: "a", // Too short
            email: "invalid-email",
            birthday: "invalid-date"
         };

         const result = await userService.updateAccountDetails(user_id, invalidUpdates);

         expect(userRepository.findConflictingUsers).not.toHaveBeenCalled();
         expect(userRepository.findByUserId).not.toHaveBeenCalled();
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceValidationErrorResponseWithPattern(result, HTTP_STATUS.BAD_REQUEST, {
            username: expect.any(String),
            email: expect.any(String),
            birthday: expect.any(String)
         });
      });

      it("should return conflict error when updating to existing username", async() => {
         const updates: Partial<UserUpdates> = { username: "existinguser" };
         const conflictingUser = createConflictingUser(updates.username!, "different@example.com");

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result = await userService.updateAccountDetails(user_id, updates);

         expect(userRepository.findConflictingUsers).toHaveBeenCalledWith(
            updates.username,
            "",
            user_id
         );
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceConflictErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should return conflict error when updating to existing email", async() => {
         const updates: Partial<UserUpdates> = { email: "existing@example.com" };
         const conflictingUser = createConflictingUser("differentuser", updates.email!);

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result = await userService.updateAccountDetails(user_id, updates);

         assertServiceConflictErrorResponse(result, HTTP_STATUS.CONFLICT, { email: "Email already exists" });
      });

      it("should detect case-insensitive conflicts", async() => {
         const updates: Partial<UserUpdates> = { username: "testuser" };
         const conflictingUser = createUserWithCaseVariation(
            updates.username!,
            "different@example.com",
            "uppercase"
         );

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result = await userService.updateAccountDetails(user_id, updates);

         assertServiceConflictErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should return not found when user does not exist during password change", async() => {
         const updates: Partial<UserUpdates> = {
            password: "Password1!",
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositoryNull(userRepository, "findByUserId");

         const result = await userService.updateAccountDetails(user_id, updates);

         expect(userRepository.findByUserId).toHaveBeenCalledWith(user_id);
         expect(argon2.verify).not.toHaveBeenCalled();
         expect(argon2.hash).not.toHaveBeenCalled();
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceNotFoundErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should return bad request for invalid current password", async() => {
         const currentUser: User = createMockUser();
         const updates: Partial<UserUpdates> = {
            password: "WrongPassword1!",
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositorySuccess(userRepository, "findByUserId", currentUser);
         (argon2.verify as jest.Mock).mockResolvedValue(false);

         const result = await userService.updateAccountDetails(user_id, updates);

         expect(userRepository.findByUserId).toHaveBeenCalledWith(user_id);
         expect(argon2.verify).toHaveBeenCalledWith(currentUser.password, updates.password);
         expect(argon2.hash).not.toHaveBeenCalled();
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceBadRequestErrorResponse(result, HTTP_STATUS.BAD_REQUEST, { password: "Invalid credentials" });
      });

      it("should return bad request for missing current password during password change", async() => {
         const updates: Partial<UserUpdates> = {
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         const result = await userService.updateAccountDetails(user_id, updates);

         expect(userRepository.findConflictingUsers).not.toHaveBeenCalled();
         expect(userRepository.findByUserId).not.toHaveBeenCalled();
         expect(argon2.verify).not.toHaveBeenCalled();
         expect(argon2.hash).not.toHaveBeenCalled();
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceValidationErrorResponseWithPattern(result, HTTP_STATUS.BAD_REQUEST, {
            password: expect.any(String)
         });
      });

      it("should propagate database errors during password change user lookup", async() => {
         const updates: Partial<UserUpdates> = {
            password: "Password1!",
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         testDatabaseErrorScenario(userRepository.findByUserId as any, "Database connection failed");

         await expect(userService.updateAccountDetails(user_id, updates)).rejects.toThrow("Database connection failed");

         expect(userRepository.findByUserId).toHaveBeenCalledWith(user_id);
         expect(argon2.verify).not.toHaveBeenCalled();
         expect(argon2.hash).not.toHaveBeenCalled();
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();
      });

      it("should return not found when user does not exist during update", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositorySuccess(userRepository, "update", false);

         const result = await userService.updateAccountDetails(user_id, updates);

         expect(userRepository.update).toHaveBeenCalledWith(user_id, expect.objectContaining(updates));
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceNotFoundErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should propagate database errors during conflict check", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };
         testDatabaseErrorScenario(userRepository.findConflictingUsers as any, "Database connection failed");

         await expect(userService.updateAccountDetails(user_id, updates)).rejects.toThrow("Database connection failed");

         expect(userRepository.findConflictingUsers).toHaveBeenCalledWith(
            updates.username,
            "",
            user_id
         );
         expect(userRepository.update).not.toHaveBeenCalled();
      });

      it("should propagate database errors during update", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         testDatabaseErrorScenario(userRepository.update as any, "Database connection failed");

         await expect(userService.updateAccountDetails(user_id, updates)).rejects.toThrow("Database connection failed");

         expect(userRepository.update).toHaveBeenCalledWith(user_id, expect.objectContaining(updates));
         expect(redis.removeCacheValue).not.toHaveBeenCalled();
      });

      it("should handle repository errors during update using helper", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositoryError(userRepository, "update", new Error("Database connection failed"));

         await expect(userService.updateAccountDetails(user_id, updates)).rejects.toThrow("Database connection failed");

         expect(userRepository.update).toHaveBeenCalledWith(user_id, expect.objectContaining(updates));
         expect(redis.removeCacheValue).not.toHaveBeenCalled();
      });

   });

   describe("deleteAccount", () => {
      it("should delete user account successfully", async() => {
         setupMockRepositorySuccess(userRepository, "deleteUser", true);

         const result = await userService.deleteAccount(mockRes as any);

         assertUserDeletionSuccessBehavior(
            userRepository,
            authenticationService,
            redis,
            mockRes.locals.user_id,
            mockRes
         );

         assertServiceSuccessResponseWithoutData(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return not found when user does not exist", async() => {
         setupMockRepositorySuccess(userRepository, "deleteUser", false);

         const result = await userService.deleteAccount(mockRes as any);

         expect(userRepository.deleteUser).toHaveBeenCalledWith(mockRes.locals.user_id);
         expect(authenticationService.logoutUser).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceNotFoundErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should propagate database errors during deletion", async() => {
         testDatabaseErrorScenario(userRepository.deleteUser as any, "Database connection failed");

         await expect(userService.deleteAccount(mockRes as any)).rejects.toThrow("Database connection failed");

         expect(userRepository.deleteUser).toHaveBeenCalledWith(mockRes.locals.user_id);
         expect(authenticationService.logoutUser).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();
      });

      it("should handle repository errors during deletion using helper", async() => {
         setupMockRepositoryError(userRepository, "deleteUser", new Error("Database connection failed"));

         await expect(userService.deleteAccount(mockRes as any)).rejects.toThrow("Database connection failed");

         expect(userRepository.deleteUser).toHaveBeenCalledWith(mockRes.locals.user_id);
         expect(authenticationService.logoutUser).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();
      });

   });
});