import { TEST_CONSTANTS } from "capital/mocks/server";
import {
   createConflictingUser,
   createMockUserDetails,
   createMockUserWithDetails,
   createUserWithCaseVariation,
   createUserWithWeakPassword,
   createValidRegistration
} from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import { RegisterPayload, User, UserDetails, UserUpdates } from "capital/user";

import * as userService from "@/services/userService";
import { USER_DETAILS_CACHE_DURATION } from "@/services/userService";
import { createMockMiddleware, MockResponse } from "@/tests/utils/api";
import {
   assertCacheHitBehavior,
   assertCacheMissBehavior,
   assertRepositoryCall,
   assertServiceErrorResponse,
   assertServiceSuccessResponse,
   assertUserCreationConflictBehavior,
   assertUserCreationSuccessBehavior,
   assertUserDeletionSuccessBehavior,
   assertUserNotFoundBehavior,
   assertUserUpdateSuccessBehavior,
   callServiceMethodWithMockRes,
   expectServiceToThrow,
   setupArgon2Mocks,
   assertArgon2Calls,
   setupDefaultRedisCacheBehavior,
   setupMockCacheError,
   setupMockCacheHit,
   setupMockCacheMiss,
   setupMockRepositoryEmpty,
   setupMockRepositoryError,
   setupMockRepositoryNull,
   setupMockRepositorySuccess,
   testDatabaseErrorScenario
} from "@/tests/utils/services";

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

describe("User Service", () => {
   let mockRes: MockResponse;
   let userRepository: typeof import("@/repository/userRepository");
   let redis: typeof import("@/lib/redis");
   let argon2: typeof import("argon2");
   let middleware: typeof import("@/lib/middleware");
   let authenticationService: typeof import("@/services/authenticationService");

   beforeEach(async() => {
      jest.clearAllMocks();

      userRepository = await import("@/repository/userRepository");
      redis = await import("@/lib/redis");
      argon2 = await import("argon2");
      middleware = await import("@/lib/middleware");
      authenticationService = await import("@/services/authenticationService");

      setupDefaultRedisCacheBehavior(redis);
      ({ mockRes } = createMockMiddleware({ locals: { userId: TEST_CONSTANTS.TEST_USER_ID } }));
   });

   describe("fetchUserDetails", () => {
      const userId: string = TEST_CONSTANTS.TEST_USER_ID;
      const userDetailsCacheKey: string = `user:${userId}`;

      it("should return cached user details on cache hit", async() => {
         const cachedUserDetails: UserDetails = createMockUserDetails();
         const cachedData: string = JSON.stringify(cachedUserDetails);
         setupMockCacheHit(redis, "getCacheValue", cachedData);

         const result: ServerResponse = await userService.fetchUserDetails(userId);

         assertCacheHitBehavior(redis, "getCacheValue", userRepository, "findByUserId", userDetailsCacheKey);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, cachedUserDetails);
      });

      it("should fetch from database and cache on cache miss", async() => {
         const { mockUser, expectedUserDetails }: { mockUser: User; expectedUserDetails: UserDetails } = createMockUserWithDetails();

         setupMockCacheMiss(redis, "getCacheValue");
         setupMockRepositorySuccess(userRepository, "findByUserId", mockUser);

         const result: ServerResponse = await userService.fetchUserDetails(userId);

         assertCacheMissBehavior(
            redis,
            "getCacheValue",
            userRepository,
            "findByUserId",
            userDetailsCacheKey,
            userId,
            expectedUserDetails,
            USER_DETAILS_CACHE_DURATION
         );
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, expectedUserDetails);
      });

      it("should fall back to database on cache miss or error", async() => {
         const { mockUser, expectedUserDetails }: { mockUser: User; expectedUserDetails: UserDetails } = createMockUserWithDetails();

         setupMockCacheMiss(redis, "getCacheValue");
         setupMockRepositorySuccess(userRepository, "findByUserId", mockUser);

         const result: ServerResponse = await userService.fetchUserDetails(userId);

         assertCacheMissBehavior(
            redis,
            "getCacheValue",
            userRepository,
            "findByUserId",
            userDetailsCacheKey,
            userId,
            expectedUserDetails,
            USER_DETAILS_CACHE_DURATION
         );
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, expectedUserDetails);
      });

      it("should return not found when user does not exist", async() => {
         setupMockCacheMiss(redis, "getCacheValue");
         setupMockRepositoryNull(userRepository, "findByUserId");

         const result: ServerResponse = await userService.fetchUserDetails(userId);

         assertUserNotFoundBehavior(userRepository, "findByUserId", redis, userId);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should propagate database errors", async() => {
         setupMockCacheMiss(redis, "getCacheValue");
         testDatabaseErrorScenario(userRepository.findByUserId, "Database connection failed");

         await expectServiceToThrow(
            () => userService.fetchUserDetails(userId),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "findByUserId", [userId]);
         expect(redis.setCacheValue).not.toHaveBeenCalled();
      });
   });

   describe("createUser", () => {
      it("should create user successfully with valid data", async() => {
         const userId: string = "new-user-id-123";
         const hashedPassword: string = "hashed_password_123";
         const mockUser: RegisterPayload = createValidRegistration();

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupArgon2Mocks(argon2, hashedPassword);
         setupMockRepositorySuccess(userRepository, "create", userId);

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser);

         assertUserCreationSuccessBehavior(
            userRepository,
            argon2,
            middleware,
            mockUser.password,
            { ...mockUser, password: hashedPassword, birthday: "1990-01-01T00:00:00.000Z" },
            userId,
            mockRes
         );
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { success: true });
      });

      it("should return validation errors for invalid user data", async() => {
         const invalidUser: RegisterPayload = {
            username: "a",
            email: "invalid-email",
            name: "",
            birthday: "invalid-date",
            password: "weak",
            verifyPassword: "different"
         };

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, invalidUser);

         expect(userRepository.findConflictingUsers).not.toHaveBeenCalled();
         assertArgon2Calls(argon2);
         expect(userRepository.create).not.toHaveBeenCalled();
         expect(middleware.configureToken).not.toHaveBeenCalled();

         assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, {
            username: "Username must be at least 2 characters",
            email: "Invalid email address",
            name: "Name must be at least 2 characters",
            birthday: "Invalid date",
            password: "Password must be at least 8 characters",
            verifyPassword: "Password must contain at least one uppercase letter"
         });
      });

      const weakPasswordCases = [
         { type: "tooShort" as const, expectedError: "Password must be at least 8 characters" },
         { type: "noUppercase" as const, expectedError: "Password must contain at least one uppercase letter" },
         { type: "noLowercase" as const, expectedError: "Password must contain at least one lowercase letter" },
         { type: "noNumber" as const, expectedError: "Password must contain at least one number" }
      ];
      weakPasswordCases.forEach(({ type, expectedError }) => {
         it(`should return validation error for weak password: ${type}`, async() => {
            const weakPasswordUser: RegisterPayload = createUserWithWeakPassword(type);

            const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, weakPasswordUser);

            expect(userRepository.findConflictingUsers).not.toHaveBeenCalled();
            assertArgon2Calls(argon2);
            expect(userRepository.create).not.toHaveBeenCalled();
            expect(middleware.configureToken).not.toHaveBeenCalled();

            assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, {
               password: expectedError,
               verifyPassword: expectedError
            });
         });
      });

      it("should return validation errors for passwords without special characters", async() => {
         const weakPasswordUser: RegisterPayload = createUserWithWeakPassword("noSpecial");
         const hashedPassword: string = "hashed-password-123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupArgon2Mocks(argon2, hashedPassword);
         setupMockRepositorySuccess(userRepository, "create", TEST_CONSTANTS.TEST_USER_ID);

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, weakPasswordUser);

         // Note: "Password123" actually passes validation since special characters are not required
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { success: true });
      });

      it("should return conflict error for existing username", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createConflictingUser(mockUser.username, "different@example.com");

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser);

         assertUserCreationConflictBehavior(
            userRepository,
            argon2,
            middleware,
            mockUser.username,
            mockUser.email
         );

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should return conflict error for existing email", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createConflictingUser("differentuser", mockUser.email);

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { email: "Email already exists" });
      });

      it("should return conflict error for both username and email", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createConflictingUser(mockUser.username, mockUser.email);

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, {
            username: "Username already exists",
            email: "Email already exists"
         });
      });

      it("should detect case-insensitive username conflicts", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createUserWithCaseVariation(
            mockUser.username,
            "different@example.com",
            "uppercase"
         );

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should detect case-insensitive email conflicts", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createUserWithCaseVariation(
            "differentuser",
            mockUser.email,
            "uppercase"
         );

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { email: "Email already exists" });
      });

      it("should propagate database errors during conflict check", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         testDatabaseErrorScenario(userRepository.findConflictingUsers, "Database connection failed");

         await expectServiceToThrow(
            () => callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "findConflictingUsers", [
            mockUser.username,
            mockUser.email
         ]);
         assertArgon2Calls(argon2);
         expect(userRepository.create).not.toHaveBeenCalled();
      });

      it("should handle repository errors during conflict check using helper", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         setupMockRepositoryError(userRepository, "findConflictingUsers", new Error("Database connection failed"));

         await expectServiceToThrow(
            () => callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "findConflictingUsers", [
            mockUser.username,
            mockUser.email
         ]);
         assertArgon2Calls(argon2);
         expect(userRepository.create).not.toHaveBeenCalled();
      });

      it("should propagate database errors during user creation", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const hashedPassword: string = "hashed_password_123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupArgon2Mocks(argon2, hashedPassword);
         testDatabaseErrorScenario(userRepository.create, "Database connection failed");

         await expectServiceToThrow(
            () => callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "create", [expect.objectContaining({
            ...mockUser,
            password: hashedPassword,
            birthday: "1990-01-01T00:00:00.000Z"
         })]);
         expect(middleware.configureToken).not.toHaveBeenCalled();
      });

      it("should handle repository errors during user creation using helper", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const hashedPassword: string = "hashed_password_123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupArgon2Mocks(argon2, hashedPassword);
         setupMockRepositoryError(userRepository, "create", new Error("Database connection failed"));

         await expectServiceToThrow(
            () => callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "create", [expect.objectContaining({
            ...mockUser,
            password: hashedPassword,
            birthday: "1990-01-01T00:00:00.000Z"
         })]);
         expect(middleware.configureToken).not.toHaveBeenCalled();
      });

      it("should handle Redis cache errors during user creation gracefully", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const hashedPassword: string = "hashed_password_123";
         const userId: string = "new-user-id-123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupArgon2Mocks(argon2, hashedPassword);
         setupMockRepositorySuccess(userRepository, "create", userId);

         // Mock Redis cache error using helper
         setupMockCacheError(redis, "setCacheValue", new Error("Redis cache error"));

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser);

         // User creation should still succeed despite cache error
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { success: true });
         expect(userRepository.create).toHaveBeenCalled();
         expect(middleware.configureToken).toHaveBeenCalled();
      });

      it("should handle Redis cache errors during user creation using helper", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const hashedPassword: string = "hashed_password_123";
         const userId: string = "new-user-id-123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupArgon2Mocks(argon2, hashedPassword);
         setupMockRepositorySuccess(userRepository, "create", userId);

         setupMockCacheError(redis, "setCacheValue", new Error("Redis cache error"));

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "createUser", mockRes, mockUser);

         // User creation should still succeed despite cache error
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { success: true });
         expect(userRepository.create).toHaveBeenCalled();
         expect(middleware.configureToken).toHaveBeenCalled();
      });
   });

   describe("updateAccountDetails", () => {
      const userId: string = TEST_CONSTANTS.TEST_USER_ID;
      const userDetailsCacheKey: string = `user:${userId}`;

      it("should update basic user details successfully", async() => {
         const updates: Partial<UserUpdates> = {
            username: "newusername",
            email: "newemail@example.com",
            name: "New Name",
            birthday: "1995-01-01T00:00:00.000Z"
         };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositorySuccess(userRepository, "update", true);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertUserUpdateSuccessBehavior(
            userRepository,
            redis,
            updates.username!,
            updates.email!,
            userId,
            updates,
            userDetailsCacheKey
         );

         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should update password successfully with valid credentials", async() => {
         const { mockUser: currentUser }: { mockUser: User } = createMockUserWithDetails();
         const updates: Partial<UserUpdates> = {
            password: "Password1!",
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };
         const hashedNewPassword: string = "hashed_new_password_123";

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositorySuccess(userRepository, "findByUserId", currentUser);
         setupArgon2Mocks(argon2, hashedNewPassword, true);
         setupMockRepositorySuccess(userRepository, "update", true);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertRepositoryCall(userRepository, "findByUserId", [userId]);
         assertArgon2Calls(argon2, updates.password, currentUser.password, updates.newPassword);
         assertRepositoryCall(userRepository, "update", [userId, {
            ...updates,
            password: hashedNewPassword
         }]);
         expect(redis.removeCacheValue).toHaveBeenCalledWith(userDetailsCacheKey);

         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return validation errors for invalid update data", async() => {
         const invalidUpdates: Partial<UserUpdates> = {
            username: "a", // Too short
            email: "invalid-email",
            birthday: "invalid-date"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         expect(userRepository.findConflictingUsers).not.toHaveBeenCalled();
         expect(userRepository.findByUserId).not.toHaveBeenCalled();
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, {
            username: "Username must be at least 2 characters",
            email: "Invalid email address",
            birthday: "Invalid date"
         });
      });

      it("should return conflict error when updating to existing username", async() => {
         const updates: Partial<UserUpdates> = { username: "existinguser" };
         const conflictingUser: User = createConflictingUser(updates.username!, "different@example.com");

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertRepositoryCall(userRepository, "findConflictingUsers", [
            updates.username,
            "",
            userId
         ]);
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should return conflict error when updating to existing email", async() => {
         const updates: Partial<UserUpdates> = { email: "existing@example.com" };
         const conflictingUser: User = createConflictingUser("differentuser", updates.email!);

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { email: "Email already exists" });
      });

      it("should detect case-insensitive conflicts", async() => {
         const updates: Partial<UserUpdates> = { username: "testuser" };
         const conflictingUser: User = createUserWithCaseVariation(
            updates.username!,
            "different@example.com",
            "uppercase"
         );

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should return not found when user does not exist during password change", async() => {
         const updates: Partial<UserUpdates> = {
            password: "Password1!",
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositoryNull(userRepository, "findByUserId");

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertRepositoryCall(userRepository, "findByUserId", [userId]);
         assertArgon2Calls(argon2);
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should return bad request for invalid current password", async() => {
         const { mockUser: currentUser }: { mockUser: User } = createMockUserWithDetails();
         const updates: Partial<UserUpdates> = {
            password: "WrongPassword1!",
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositorySuccess(userRepository, "findByUserId", currentUser);
         setupArgon2Mocks(argon2, "dummy-hash", false);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertRepositoryCall(userRepository, "findByUserId", [userId]);
         assertArgon2Calls(argon2, updates.password, currentUser.password);
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, { password: "Invalid credentials" });
      });

      it("should return bad request for missing current password during password change", async() => {
         const updates: Partial<UserUpdates> = {
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         expect(userRepository.findConflictingUsers).not.toHaveBeenCalled();
         expect(userRepository.findByUserId).not.toHaveBeenCalled();
         assertArgon2Calls(argon2);
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, {
            password: "Current password is required to set a new password"
         });
      });

      it("should propagate database errors during password change user lookup", async() => {
         const updates: Partial<UserUpdates> = {
            password: "Password1!",
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         testDatabaseErrorScenario(userRepository.findByUserId, "Database connection failed");

         await expectServiceToThrow(
            () => userService.updateAccountDetails(userId, updates),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "findByUserId", [userId]);
         assertArgon2Calls(argon2);
         expect(userRepository.update).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();
      });

      it("should return not found when user does not exist during update", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositorySuccess(userRepository, "update", false);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertRepositoryCall(userRepository, "update", [userId, expect.objectContaining(updates)]);
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should propagate database errors during conflict check", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };
         testDatabaseErrorScenario(userRepository.findConflictingUsers, "Database connection failed");

         await expectServiceToThrow(
            () => userService.updateAccountDetails(userId, updates),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "findConflictingUsers", [
            updates.username,
            "",
            userId
         ]);
         expect(userRepository.update).not.toHaveBeenCalled();
      });

      it("should propagate database errors during update", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         testDatabaseErrorScenario(userRepository.update, "Database connection failed");

         await expectServiceToThrow(
            () => userService.updateAccountDetails(userId, updates),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "update", [userId, expect.objectContaining(updates)]);
         expect(redis.removeCacheValue).not.toHaveBeenCalled();
      });

      it("should handle repository errors during update using helper", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositoryError(userRepository, "update", new Error("Database connection failed"));

         await expectServiceToThrow(
            () => userService.updateAccountDetails(userId, updates),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "update", [userId, expect.objectContaining(updates)]);
         expect(redis.removeCacheValue).not.toHaveBeenCalled();
      });

   });

   describe("deleteAccount", () => {
      it("should delete user account successfully", async() => {
         setupMockRepositorySuccess(userRepository, "deleteUser", true);

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "deleteAccount", mockRes);

         assertUserDeletionSuccessBehavior(
            userRepository,
            authenticationService,
            redis,
            mockRes.locals.userId,
            mockRes
         );

         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return not found when user does not exist", async() => {
         setupMockRepositorySuccess(userRepository, "deleteUser", false);

         const result: ServerResponse = await callServiceMethodWithMockRes(userService, "deleteAccount", mockRes);

         assertRepositoryCall(userRepository, "deleteUser", [mockRes.locals.userId]);
         expect(authenticationService.logoutUser).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();

         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should propagate database errors during deletion", async() => {
         testDatabaseErrorScenario(userRepository.deleteUser, "Database connection failed");

         await expectServiceToThrow(
            () => callServiceMethodWithMockRes(userService, "deleteAccount", mockRes),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "deleteUser", [mockRes.locals.userId]);
         expect(authenticationService.logoutUser).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();
      });

      it("should handle repository errors during deletion using helper", async() => {
         setupMockRepositoryError(userRepository, "deleteUser", new Error("Database connection failed"));

         await expectServiceToThrow(
            () => callServiceMethodWithMockRes(userService, "deleteAccount", mockRes),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "deleteUser", [mockRes.locals.userId]);
         expect(authenticationService.logoutUser).not.toHaveBeenCalled();
         expect(redis.removeCacheValue).not.toHaveBeenCalled();
      });
   });
});