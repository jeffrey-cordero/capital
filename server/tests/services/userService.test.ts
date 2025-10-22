import { TEST_CONSTANTS } from "capital/mocks/server";
import {
   createConflictingUser,
   createMockUserDetails,
   createMockUserUpdates,
   createMockUserWithDetails,
   createUserUpdatesWithPasswordChange,
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
   assertArgon2Calls,
   assertCacheHitBehavior,
   assertCacheInvalidation,
   assertCacheInvalidationNotCalled,
   assertCacheMissBehavior,
   assertDeleteOperationsNotCalled,
   assertMethodNotCalled,
   assertRepositoryCall,
   assertServiceErrorResponse,
   assertServiceSuccessResponse,
   assertUpdateOperationsNotCalled,
   assertUserCreationConflictBehavior,
   assertUserCreationSuccessBehavior,
   assertUserDeletionSuccessBehavior,
   assertUserNotFoundBehavior,
   assertUserUpdateSuccessBehavior,
   assertValidationErrorResponse,
   callServiceMethodWithMockRes,
   expectServiceToThrow,
   setupArgon2Mocks,
   setupDefaultRedisCacheBehavior,
   setupMockCacheHit,
   setupMockCacheMiss,
   setupMockRepositoryEmpty,
   setupMockRepositoryError,
   setupMockRepositoryNull,
   setupMockRepositorySuccess
} from "@/tests/utils/services";

jest.mock("argon2");
jest.mock("@/lib/redis");
jest.mock("@/lib/middleware");
jest.mock("@/repository/userRepository");
jest.mock("@/services/authenticationService");

describe("User Service", () => {
   const userId: string = TEST_CONSTANTS.TEST_USER_ID;
   const userDetailsCacheKey: string = `user:${userId}`;

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
      it("should return cached user details on cache hit", async() => {
         const cachedUserDetails: UserDetails = createMockUserDetails();
         const cachedData: string = JSON.stringify(cachedUserDetails);
         setupMockCacheHit(redis, cachedData);

         const result: ServerResponse = await userService.fetchUserDetails(userId);

         assertCacheHitBehavior(redis, userRepository, "findByUserId", userDetailsCacheKey);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, cachedUserDetails);
      });

      it("should fetch from database and cache on cache miss", async() => {
         const { mockUser, expectedUserDetails }: { mockUser: User; expectedUserDetails: UserDetails } = createMockUserWithDetails();

         setupMockCacheMiss(redis);
         setupMockRepositorySuccess(userRepository, "findByUserId", mockUser);

         const result: ServerResponse = await userService.fetchUserDetails(userId);

         assertCacheMissBehavior(
            redis,
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
         setupMockCacheMiss(redis);
         setupMockRepositoryNull(userRepository, "findByUserId");

         const result: ServerResponse = await userService.fetchUserDetails(userId);

         assertUserNotFoundBehavior(userRepository, "findByUserId", redis, userId);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

   });

   describe("createUser", () => {
      it("should create user successfully with valid data", async() => {
         const userId: string = "new-user-id-123";
         const hashedPassword: string = "hashed_password_123";
         const validUser: RegisterPayload = createValidRegistration();

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupArgon2Mocks(argon2, hashedPassword);
         setupMockRepositorySuccess(userRepository, "create", userId);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", validUser);

         assertUserCreationSuccessBehavior(
            mockRes,
            userRepository,
            argon2,
            middleware,
            validUser.password,
            {
               ...validUser,
               // Password should be hashed at the service layer through the argon2 module
               password: hashedPassword,
               // Date conversion should always be converted to an ISO string at the service layer
               birthday: new Date(validUser.birthday).toISOString()
            },
            userId
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

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            null,
            {
               username: "Username must be at least 2 characters",
               email: "Invalid email address",
               name: "Name must be at least 2 characters",
               birthday: "Invalid date",
               password: "Password must be at least 8 characters",
               verifyPassword: "Password must contain at least one uppercase letter"
            }
         );
      });

      const requiredFields = ["username", "email", "name", "birthday", "password", "verifyPassword"];

      requiredFields.forEach((field) => {
         it(`should return validation errors for missing ${field}`, async() => {
            const invalidUser: RegisterPayload = {
               ...createValidRegistration(),
               [field]: undefined
            };

            const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

            // Special case for password verification field, which has the same error as password for simplicity
            const identifier: string = field === "verifyPassword" ? "Password" : field.charAt(0).toUpperCase() + field.slice(1);
            const expectedError: string = `${identifier} is required`;

            assertValidationErrorResponse(
               result,
               argon2,
               userRepository,
               middleware,
               null,
               { [field]: expectedError }
            );
         });
      });

      // Fields that have [2, 30] character length validation
      const validationTypes: string[] = ["short", "long"];
      const lengthValidationFields: (keyof RegisterPayload)[] = ["username", "name"];

      lengthValidationFields.forEach((field) => {
         const fieldName: string = field.charAt(0).toUpperCase() + field.slice(1);

         validationTypes.forEach((type) => {
            it(`should return validation errors for ${field} too ${type}`, async() => {
               const invalidUser: RegisterPayload = createValidRegistration();
               const value: string = type === "short" ? "a" : "a".repeat(31);
               const errorSuffix: string = type === "short" ? "must be at least 2 characters" : "must be at most 30 characters";
               invalidUser[field] = value;

               const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

               assertValidationErrorResponse(
                  result,
                  argon2,
                  userRepository,
                  middleware,
                  null,
                  { [field]: `${fieldName} ${errorSuffix}` }
               );
            });
         });
      });

      it("should return validation errors for username with invalid characters", async() => {
         const invalidUser: RegisterPayload = createValidRegistration();
         invalidUser.username = "test@user!";

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            null,
            { username: "Username may only contain letters, numbers, underscores, and hyphens" }
         );
      });

      it("should return validation errors for email too long", async() => {
         const invalidUser: RegisterPayload = createValidRegistration();
         invalidUser.email = "a".repeat(250) + "@example.com";

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            null,
            { email: "Email must be at most 255 characters" }
         );
      });

      it("should return validation errors for birthday too early", async() => {
         const invalidUser: RegisterPayload = createValidRegistration();
         invalidUser.birthday = "1799-12-31";

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            null,
            { birthday: "Birthday must be on or after 1800-01-01" }
         );
      });

      it("should return validation errors for birthday in the future", async() => {
         // Application constraints are based on the Pacific/Kiritimati timezone to avoid global timezone issues
         const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" }));
         const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

         const invalidUser: RegisterPayload = createValidRegistration();
         invalidUser.birthday = tomorrow.toISOString();

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            null,
            { birthday: "Birthday cannot be in the future" }
         );
      });

      it("should return validation errors for empty birthday", async() => {
         const invalidUser: RegisterPayload = createValidRegistration();
         invalidUser.birthday = "";

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            null,
            { birthday: "Birthday is required" }
         );
      });

      it("should return validation errors for password too long", async() => {
         const longPassword: string = "a".repeat(256);
         const invalidUser: RegisterPayload = createValidRegistration();
         invalidUser.password = longPassword;
         invalidUser.verifyPassword = longPassword;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            null,
            {
               password: "Password must be at most 255 characters",
               verifyPassword: "Password must be at most 255 characters"
            }
         );
      });

      it("should return validation errors for mismatched passwords", async() => {
         const invalidUser: RegisterPayload = createValidRegistration();
         invalidUser.verifyPassword = "Password2!";

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            null,
            { verifyPassword: "Passwords don't match" }
         );
      });

      const invalidPasswordCases = [
         { type: "tooShort" as const, expectedError: "Password must be at least 8 characters" },
         { type: "noUppercase" as const, expectedError: "Password must contain at least one uppercase letter" },
         { type: "noLowercase" as const, expectedError: "Password must contain at least one lowercase letter" },
         { type: "noNumber" as const, expectedError: "Password must contain at least one number" }
      ];

      invalidPasswordCases.forEach(({ type, expectedError }) => {
         it(`should return validation error for invalid password: ${type}`, async() => {
            const invalidPasswordUser: RegisterPayload = createUserWithWeakPassword(type);

            const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidPasswordUser);

            assertValidationErrorResponse(
               result,
               argon2,
               userRepository,
               middleware,
               null,
               {
                  password: expectedError,
                  verifyPassword: expectedError
               }
            );
         });
      });

      it("should return conflict error for existing username", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createConflictingUser(mockUser.username, "different@example.com");

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", mockUser);

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

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", mockUser);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { email: "Email already exists" });
      });

      it("should return conflict error for both username and email", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createConflictingUser(mockUser.username, mockUser.email);

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", mockUser);

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

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", mockUser);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should detect case-insensitive email conflicts", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createUserWithCaseVariation(
            "differentUsername",
            mockUser.email,
            "uppercase"
         );

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", mockUser);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { email: "Email already exists" });
      });

      it("should handle repository errors during conflict check using helper", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         setupMockRepositoryError(userRepository, "findConflictingUsers", "Database connection failed");

         await expectServiceToThrow(
            () => callServiceMethodWithMockRes(mockRes, userService, "createUser", mockUser),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "findConflictingUsers", [
            mockUser.username,
            mockUser.email
         ]);
         assertArgon2Calls(argon2);
         assertMethodNotCalled(userRepository, "create");
      });

   });

   describe("updateAccountDetails", () => {
      it("should update basic user details successfully", async() => {
         const updates: Partial<UserUpdates> = {
            username: "newusername",
            email: "newemail@example.com",
            name: "New Name",
            birthday: new Date("1990-01-01").toISOString()
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
         assertCacheInvalidation(redis, userDetailsCacheKey);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return validation errors for invalid update data", async() => {
         const invalidUpdates: Partial<UserUpdates> = {
            username: "a",
            email: "invalid-email",
            birthday: "invalid-date"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            {
               username: "Username must be at least 2 characters",
               email: "Invalid email address",
               birthday: "Invalid date"
            },
            true
         );
      });

      const updateValidationTypes: string[] = ["short", "long"];
      const updateLengthValidationFields: (keyof UserUpdates)[] = ["username", "name"];

      updateLengthValidationFields.forEach((field) => {
         const fieldName: string = field.charAt(0).toUpperCase() + field.slice(1);

         updateValidationTypes.forEach((type) => {
            it(`should return validation errors for ${field} too ${type}`, async() => {
               const invalidUpdates: Partial<UserUpdates> = createMockUserUpdates();
               const value: string = type === "short" ? "a" : "a".repeat(31);
               const errorSuffix: string = type === "short" ? "must be at least 2 characters" : "must be at most 30 characters";

               invalidUpdates[field] = value;

               const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

               assertValidationErrorResponse(
                  result,
                  argon2,
                  userRepository,
                  middleware,
                  redis,
                  { [field]: `${fieldName} ${errorSuffix}` },
                  true
               );
            });
         });
      });

      it("should return validation errors for username with invalid characters", async() => {
         const invalidUpdates: Partial<UserUpdates> = createMockUserUpdates();
         invalidUpdates.username = "test@user!";

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            { username: "Username may only contain letters, numbers, underscores, and hyphens" },
            true
         );
      });

      it("should return validation errors for email too long", async() => {
         const invalidUpdates: Partial<UserUpdates> = createMockUserUpdates();
         invalidUpdates.email = "a".repeat(250) + "@example.com";

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            { email: "Email must be at most 255 characters" },
            true
         );
      });

      it("should return validation errors for birthday too early", async() => {
         const invalidUpdates: Partial<UserUpdates> = createMockUserUpdates();
         invalidUpdates.birthday = "1799-12-31";

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            { birthday: "Birthday must be on or after 1800-01-01" },
            true
         );
      });

      it("should return validation errors for birthday in the future", async() => {
         const futureDate = new Date();
         futureDate.setFullYear(futureDate.getFullYear() + 1);
         const futureDateString = futureDate.toISOString().split("T")[0];

         const invalidUpdates: Partial<UserUpdates> = createMockUserUpdates();
         invalidUpdates.birthday = futureDateString;

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            { birthday: "Birthday cannot be in the future" },
            true
         );
      });

      it("should return validation errors for password too long", async() => {
         const longPassword = "a".repeat(256);
         const invalidUpdates: Partial<UserUpdates> = createUserUpdatesWithPasswordChange();
         invalidUpdates.newPassword = longPassword;
         invalidUpdates.verifyPassword = longPassword;

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            {
               newPassword: "Password must be at most 255 characters",
               verifyPassword: "Password must be at most 255 characters"
            },
            true
         );
      });

      it("should return validation errors for mismatched new passwords", async() => {
         const invalidUpdates: Partial<UserUpdates> = createUserUpdatesWithPasswordChange();
         invalidUpdates.verifyPassword = "DifferentPassword1!";

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            { verifyPassword: "Passwords don't match" },
            true
         );
      });

      it("should return validation errors for new password same as old password", async() => {
         const invalidUpdates: Partial<UserUpdates> = createUserUpdatesWithPasswordChange();
         invalidUpdates.newPassword = "Password1!";
         invalidUpdates.verifyPassword = "Password1!";

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            { newPassword: "New password must not match the old password" },
            true
         );
      });

      it("should return validation errors for missing new password", async() => {
         const invalidUpdates: Partial<UserUpdates> = createUserUpdatesWithPasswordChange();
         delete invalidUpdates.newPassword;

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            {
               newPassword: "New password is required to set a new password",
               verifyPassword: "Passwords don't match"
            },
            true
         );
      });

      it("should return validation errors for missing password verification", async() => {
         const invalidUpdates: Partial<UserUpdates> = createUserUpdatesWithPasswordChange();
         delete invalidUpdates.verifyPassword;

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            { verifyPassword: "Password verification is required to set a new password" },
            true
         );
      });

      it("should return conflict error when updating to existing username", async() => {
         const updates: Partial<UserUpdates> = { username: "existinguser" };
         const conflictingUser: User = createConflictingUser(updates.username!, "different@example.com");

         setupMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         // Empty string for the email, which was not provided in the updates
         assertRepositoryCall(userRepository, "findConflictingUsers", [updates.username, "", userId]);
         assertUpdateOperationsNotCalled(userRepository, redis);
         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should return conflict error when updating to existing email", async() => {
         const updates: Partial<UserUpdates> = { email: "existing@example.com" };
         const conflictingUser: User = createConflictingUser("differentUsername", updates.email!);

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
         assertUpdateOperationsNotCalled(userRepository, redis);
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
         setupArgon2Mocks(argon2, "hashed_password_123", false);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertRepositoryCall(userRepository, "findByUserId", [userId]);
         assertArgon2Calls(argon2, updates.password, currentUser.password);
         assertUpdateOperationsNotCalled(userRepository, redis);
         assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, { password: "Invalid credentials" });
      });

      it("should return bad request for missing current password during password change", async() => {
         const updates: Partial<UserUpdates> = {
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertValidationErrorResponse(
            result,
            argon2,
            userRepository,
            middleware,
            redis,
            { password: "Current password is required to set a new password" },
            true
         );
      });

      it("should return not found when user does not exist during update", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositorySuccess(userRepository, "update", false);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertRepositoryCall(userRepository, "update", [userId, expect.objectContaining(updates)]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should handle repository errors during update using helper", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };

         setupMockRepositoryEmpty(userRepository, "findConflictingUsers");
         setupMockRepositoryError(userRepository, "update", "Database connection failed");

         await expectServiceToThrow(
            () => userService.updateAccountDetails(userId, updates),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "update", [userId, expect.objectContaining(updates)]);
         assertCacheInvalidationNotCalled(redis);
      });
   });

   describe("deleteAccount", () => {
      it("should delete user account successfully", async() => {
         setupMockRepositorySuccess(userRepository, "deleteUser", true);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "deleteAccount");

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

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "deleteAccount");

         assertRepositoryCall(userRepository, "deleteUser", [mockRes.locals.userId]);
         assertDeleteOperationsNotCalled(authenticationService, redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should handle repository errors during deletion using helper", async() => {
         setupMockRepositoryError(userRepository, "deleteUser", "Database connection failed");

         await expectServiceToThrow(
            () => callServiceMethodWithMockRes(mockRes, userService, "deleteAccount"),
            "Database connection failed"
         );
         assertRepositoryCall(userRepository, "deleteUser", [mockRes.locals.userId]);
         assertDeleteOperationsNotCalled(authenticationService, redis);
      });
   });
});