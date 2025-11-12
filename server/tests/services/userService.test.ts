import {
   createConflictingUser,
   createMockUserUpdates,
   createMockUserWithDetails,
   createUserUpdatesWithPasswordChange,
   createUserWithCaseVariation,
   createValidRegistration,
   INVALID_PASSWORD_CASES,
   TEST_USER_ID
} from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import { RegisterPayload, User, UserDetails, UserUpdates } from "capital/user";

import * as userService from "@/services/userService";
import { USER_DETAILS_CACHE_DURATION } from "@/services/userService";
import { createMockMiddleware, MockResponse } from "@/tests/utils/api";
import {
   arrangeArgon2Mocks,
   arrangeDefaultRedisCacheBehavior,
   arrangeMockCacheHit,
   arrangeMockCacheMiss,
   arrangeMockRepositoryError,
   arrangeMockRepositorySuccess,
   assertArgon2Calls,
   assertCacheHitBehavior,
   assertCacheInvalidation,
   assertCacheInvalidationNotCalled,
   assertCacheMissBehavior,
   assertMethodsNotCalled,
   assertRepositoryCall,
   assertServiceErrorResponse,
   assertServiceSuccessResponse,
   assertServiceThrows,
   callServiceMethodWithMockRes
} from "@/tests/utils/services";

jest.mock("argon2");
jest.mock("@/lib/redis");
jest.mock("@/lib/middleware");
jest.mock("@/repository/userRepository");
jest.mock("@/services/authenticationService");

describe("User Service", () => {
   const userId: string = TEST_USER_ID;
   const userDetailsCacheKey: string = `user:${userId}`;
   const validRegistration: RegisterPayload = createValidRegistration();

   let mockRes: MockResponse;
   let userRepository: typeof import("@/repository/userRepository");
   let redis: typeof import("@/lib/redis");
   let argon2: typeof import("argon2");
   let middleware: typeof import("@/lib/middleware");
   let authenticationService: typeof import("@/services/authenticationService");

   /**
    * Asserts user validation error response for create/update operations
    *
    * @param {ServerResponse} result - Service response result
    * @param {Record<string, string>} expectedErrors - Expected validation errors
    * @param {boolean} isUpdate - Whether this is for update operations (default: false)
    */
   const assertUserValidationErrorResponse = (result: ServerResponse, expectedErrors: Record<string, string>, isUpdate: boolean = false): void => {
      if (isUpdate) {
         assertMethodsNotCalled([
            { module: argon2, methods: ["verify", "hash"] },
            { module: userRepository, methods: ["findConflictingUsers", "findByUserId", "update"] },
            { module: redis, methods: ["removeCacheValue"] }
         ]);
      } else {
         assertMethodsNotCalled([
            { module: argon2, methods: ["verify", "hash"] },
            { module: userRepository, methods: ["findConflictingUsers", "create"] },
            { module: middleware, methods: ["configureToken"] }
         ]);
      }

      assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, expectedErrors);
   };

   /**
    * Asserts that update operations were not called during conflict scenarios
    */
   const assertUpdateOperationsNotCalled = (): void => {
      assertMethodsNotCalled([
         { module: userRepository, methods: ["update"] },
         { module: redis, methods: ["removeCacheValue"] }
      ]);
   };

   /**
    * Asserts that delete operations were not called during error scenarios
    */
   const assertDeleteOperationsNotCalled = (): void => {
      assertMethodsNotCalled([
         { module: authenticationService, methods: ["logoutUser"] },
         { module: redis, methods: ["removeCacheValue"] }
      ]);
   };

   beforeEach(async() => {
      jest.clearAllMocks();

      userRepository = await import("@/repository/userRepository");
      redis = await import("@/lib/redis");
      argon2 = await import("argon2");
      middleware = await import("@/lib/middleware");
      authenticationService = await import("@/services/authenticationService");

      arrangeDefaultRedisCacheBehavior(redis);
      ({ mockRes } = createMockMiddleware({ locals: { userId: TEST_USER_ID } }));
   });

   describe("fetchUserDetails", () => {
      /**
       * Asserts user not found behavior - repository called, cache not set
       *
       * @param {string} repositoryMethod - Repository method name (e.g., "findByUserId")
       * @param {string} repositoryParam - Expected parameter for repository call
       */
      const assertUserNotFoundBehavior = (repositoryMethod: string, repositoryParam: string): void => {
         assertRepositoryCall(userRepository, repositoryMethod, [repositoryParam]);
         assertMethodsNotCalled([{ module: redis, methods: ["setCacheValue"] }]);
      };

      it("should return cached user details on cache hit", async() => {
         const cachedUserDetails: UserDetails = createMockUserWithDetails().expectedUserDetails;
         const cachedData: string = JSON.stringify(cachedUserDetails);
         arrangeMockCacheHit(redis, cachedData);

         const result: ServerResponse = await userService.fetchUserDetails(userId);

         assertCacheHitBehavior(redis, userRepository, "findByUserId", userDetailsCacheKey);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, cachedUserDetails);
      });

      it("should fetch from database and cache on cache miss", async() => {
         const { mockUser, expectedUserDetails }: { mockUser: User; expectedUserDetails: UserDetails } = createMockUserWithDetails();

         arrangeMockCacheMiss(redis);
         arrangeMockRepositorySuccess(userRepository, "findByUserId", mockUser);

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
         arrangeMockCacheMiss(redis);
         arrangeMockRepositorySuccess(userRepository, "findByUserId", null);

         const result: ServerResponse = await userService.fetchUserDetails(userId);

         assertUserNotFoundBehavior("findByUserId", userId);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

   });

   describe("createUser", () => {
      const validationTypes: string[] = ["short", "long"];
      const lengthValidationFields: (keyof RegisterPayload)[] = ["username", "name"];
      const requiredFields: (keyof RegisterPayload)[] = ["username", "email", "name", "birthday", "password", "verifyPassword"];

      /**
       * Asserts user creation success behavior - conflict check, hash, create, token configuration
       *
       * @param {string} password - Expected password for hashing
       * @param {RegisterPayload} expectedUserData - Expected user data for creation including the hashed password
       * @param {string} userId - Expected user ID for token config
       */
      const assertUserCreationSuccessBehavior = (password: string, expectedUserData: RegisterPayload, userId: string): void => {
         assertRepositoryCall(userRepository, "findConflictingUsers", [expectedUserData.username, expectedUserData.email]);
         assertArgon2Calls(argon2, undefined, undefined, password);
         assertRepositoryCall(userRepository, "create", [expect.objectContaining(expectedUserData)]);
         expect(middleware.configureToken).toHaveBeenCalledWith(mockRes, userId);
      };

      /**
       * Asserts user creation conflict behavior - conflict check, no hash, no create, no token configuration
       *
       * @param {string} username - Expected username for conflict check
       * @param {string} email - Expected email for conflict check
       */
      const assertUserCreationConflictBehavior = (username: string, email: string): void => {
         assertRepositoryCall(userRepository, "findConflictingUsers", [username, email]);
         assertMethodsNotCalled([
            { module: argon2, methods: ["verify", "hash"] },
            { module: userRepository, methods: ["create"] },
            { module: middleware, methods: ["configureToken"] }
         ]);
      };

      it("should create user successfully with valid data", async() => {
         const userId: string = "new-user-id-123";
         const hashedPassword: string = "hashed_password_123";
         const validUser: RegisterPayload = createValidRegistration();

         arrangeArgon2Mocks(argon2, hashedPassword);
         arrangeMockRepositorySuccess(userRepository, "create", userId);
         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", []);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", validUser);

         assertUserCreationSuccessBehavior(
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

         assertUserValidationErrorResponse(
            result,
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

      requiredFields.forEach((field) => {
         it(`should return validation errors for missing ${field}`, async() => {
            const invalidUser: RegisterPayload = {
               ...createValidRegistration(),
               [field]: undefined
            };

            const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

            // Special case for the password verification field, which has the same error as the password field for simplicity
            const identifier: string = field === "verifyPassword" ? "Password" : field.charAt(0).toUpperCase() + field.slice(1);
            const expectedError: string = `${identifier} is required`;

            assertUserValidationErrorResponse(
               result,
               { [field]: expectedError }
            );
         });
      });

      // Fields that have [2, 30] character length validation (name and username)
      lengthValidationFields.forEach((field) => {
         const fieldName: string = field.charAt(0).toUpperCase() + field.slice(1);

         validationTypes.forEach((type) => {
            it(`should return validation errors for ${field} too ${type}`, async() => {
               const value: string = type === "short" ? "a" : "a".repeat(31);
               const errorSuffix: string = type === "short" ? "must be at least 2 characters" : "must be at most 30 characters";
               const invalidUser: RegisterPayload = {
                  ...validRegistration,
                  [field]: value
               };

               const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

               assertUserValidationErrorResponse(
                  result,
                  { [field]: `${fieldName} ${errorSuffix}` }
               );
            });
         });
      });

      it("should return validation errors for username with invalid characters", async() => {
         const invalidUser: RegisterPayload = {
            ...validRegistration,
            username: "test@user!"
         };

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertUserValidationErrorResponse(
            result,
            { username: "Username may only contain letters, numbers, underscores, and hyphens" }
         );
      });

      it("should return validation errors for email too long", async() => {
         const invalidUser: RegisterPayload = {
            ...validRegistration,
            email: "a".repeat(250) + "@example.com"
         };

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertUserValidationErrorResponse(
            result,
            { email: "Email must be at most 255 characters" }
         );
      });

      it("should return validation errors for birthday too early", async() => {
         const invalidUser: RegisterPayload = {
            ...validRegistration,
            birthday: "1799-12-31"
         };

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertUserValidationErrorResponse(
            result,
            { birthday: "Birthday must be on or after 1800-01-01" }
         );
      });

      it("should return validation errors for birthday in the future", async() => {
         // Application constraints are based on the Pacific/Kiritimati timezone to avoid global timezone issues
         const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" }));
         const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

         const invalidUser: RegisterPayload = {
            ...validRegistration,
            birthday: tomorrow.toISOString()
         };

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertUserValidationErrorResponse(
            result,
            { birthday: "Birthday cannot be in the future" }
         );
      });

      it("should return validation errors for password too long", async() => {
         const longPassword: string = "a".repeat(256);
         const invalidUser: RegisterPayload = {
            ...validRegistration,
            password: longPassword,
            verifyPassword: longPassword
         };

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertUserValidationErrorResponse(
            result,
            {
               password: "Password must be at most 255 characters",
               verifyPassword: "Password must be at most 255 characters"
            }
         );
      });

      it("should return validation errors for mismatched passwords", async() => {
         const invalidUser: RegisterPayload = {
            ...validRegistration,
            verifyPassword: "Password2!"
         };

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidUser);

         assertUserValidationErrorResponse(
            result,
            { verifyPassword: "Passwords don't match" }
         );
      });

      INVALID_PASSWORD_CASES.forEach(({ name, password, expected }) => {
         it(`should return validation error for invalid password: ${name}`, async() => {
            const invalidPasswordUser: RegisterPayload = {
               ...createValidRegistration(),
               password,
               verifyPassword: password
            };

            const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", invalidPasswordUser);

            assertUserValidationErrorResponse(
               result,
               {
                  password: expected,
                  verifyPassword: expected
               }
            );
         });
      });

      it("should return conflict error for existing username", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createConflictingUser(mockUser.username, "different@example.com");

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", mockUser);

         assertUserCreationConflictBehavior(
            mockUser.username,
            mockUser.email
         );
         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should return conflict error for existing email", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createConflictingUser("differentuser", mockUser.email);

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", mockUser);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { email: "Email already exists" });
      });

      it("should return conflict error for both username and email", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         const conflictingUser: User = createConflictingUser(mockUser.username, mockUser.email);

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

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

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

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

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "createUser", mockUser);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { email: "Email already exists" });
      });

      it("should handle repository errors during conflict check using helper", async() => {
         const mockUser: RegisterPayload = createValidRegistration();
         arrangeMockRepositoryError(userRepository, "findConflictingUsers", "Database connection failed");

         await assertServiceThrows(
            () => callServiceMethodWithMockRes(mockRes, userService, "createUser", mockUser),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "findConflictingUsers", [
            mockUser.username,
            mockUser.email
         ]);
         assertMethodsNotCalled([
            { module: argon2, methods: ["verify", "hash"] },
            { module: userRepository, methods: ["create"] }
         ]);
      });
   });

   describe("updateAccountDetails", () => {
      const updateValidationTypes: string[] = ["short", "long"];
      const updateLengthValidationFields: (keyof UserUpdates)[] = ["username", "name"];
      const validUpdates: Partial<UserUpdates> = createMockUserUpdates();
      const validPasswordChangeUpdates: Partial<UserUpdates> = createUserUpdatesWithPasswordChange();

      /**
       * Asserts user update success behavior - conflict check, update, cache clear
       *
       * @param {string} username - Expected username for conflict check
       * @param {string} email - Expected email for conflict check
       * @param {string} userId - Expected user ID
       * @param {Partial<UserUpdates>} expectedUpdates - Expected updates data
       * @param {string} cacheKey - Expected cache key to clear
       */
      const assertUserUpdateSuccessBehavior = (username: string, email: string, userId: string, expectedUpdates: Partial<UserUpdates>, cacheKey: string): void => {
         assertRepositoryCall(userRepository, "findConflictingUsers", [username, email, userId]);
         assertRepositoryCall(userRepository, "update", [userId, expectedUpdates]);
         assertCacheInvalidation(redis, cacheKey);
      };

      /**
       * Asserts password update success behavior - user lookup, password verification, hash, update, cache clear
       *
       * @param {string} userId - Expected user ID
       * @param {string} currentPasswordHash - Current hashed password from database
       * @param {string} currentPassword - Current password provided by user
       * @param {string} newPassword - New password to be set
       * @param {Partial<UserUpdates>} updates - Update payload
       * @param {string} hashedNewPassword - Expected hashed new password
       * @param {string} cacheKey - Expected cache key to clear
       */
      const assertPasswordUpdateSuccessBehavior = (
         userId: string,
         currentPasswordHash: string,
         currentPassword: string,
         newPassword: string,
         updates: Partial<UserUpdates>,
         hashedNewPassword: string,
         cacheKey: string
      ): void => {
         assertRepositoryCall(userRepository, "findByUserId", [userId]);
         assertArgon2Calls(argon2, currentPasswordHash, currentPassword, newPassword);
         assertRepositoryCall(userRepository, "update", [userId, { ...updates, password: hashedNewPassword }]);
         assertCacheInvalidation(redis, cacheKey);
      };

      it("should update basic user details successfully", async() => {
         const updates: Partial<UserUpdates> = {
            username: "newusername",
            email: "newemail@example.com",
            name: "New Name",
            birthday: new Date("1990-01-01").toISOString()
         };

         arrangeMockRepositorySuccess(userRepository, "update", true);
         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", []);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertUserUpdateSuccessBehavior(
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

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", []);
         arrangeMockRepositorySuccess(userRepository, "findByUserId", currentUser);
         arrangeArgon2Mocks(argon2, hashedNewPassword, true);
         arrangeMockRepositorySuccess(userRepository, "update", true);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertPasswordUpdateSuccessBehavior(
            userId,
            currentUser.password,
            updates.password!,
            updates.newPassword!,
            updates,
            hashedNewPassword,
            userDetailsCacheKey
         );
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return validation errors for invalid update data", async() => {
         const invalidUpdates: Partial<UserUpdates> = {
            username: "a",
            email: "invalid-email",
            birthday: "invalid-date"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertUserValidationErrorResponse(
            result,
            {
               username: "Username must be at least 2 characters",
               email: "Invalid email address",
               birthday: "Invalid date"
            },
            true
         );
      });

      updateLengthValidationFields.forEach((field) => {
         const fieldName: string = field.charAt(0).toUpperCase() + field.slice(1);

         updateValidationTypes.forEach((type) => {
            it(`should return validation errors for ${field} too ${type}`, async() => {
               const value: string = type === "short" ? "a" : "a".repeat(31);
               const errorSuffix: string = type === "short" ? "must be at least 2 characters" : "must be at most 30 characters";
               const invalidUpdates: Partial<UserUpdates> = {
                  ...validUpdates,
                  [field]: value
               };

               const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

               assertUserValidationErrorResponse(
                  result,
                  { [field]: `${fieldName} ${errorSuffix}` },
                  true
               );
            });
         });
      });

      it("should return validation errors for username with invalid characters", async() => {
         const invalidUpdates: Partial<UserUpdates> = {
            ...validUpdates,
            username: "test@user!"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertUserValidationErrorResponse(
            result,
            { username: "Username may only contain letters, numbers, underscores, and hyphens" },
            true
         );
      });

      it("should return validation errors for email too long", async() => {
         const invalidUpdates: Partial<UserUpdates> = {
            ...validUpdates,
            email: "a".repeat(250) + "@example.com"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertUserValidationErrorResponse(
            result,
            { email: "Email must be at most 255 characters" },
            true
         );
      });

      it("should return validation errors for birthday too early", async() => {
         const invalidUpdates: Partial<UserUpdates> = {
            ...validUpdates,
            birthday: "1799-12-31"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertUserValidationErrorResponse(
            result,
            { birthday: "Birthday must be on or after 1800-01-01" },
            true
         );
      });

      it("should return validation errors for birthday in the future", async() => {
         const futureDate = new Date();
         futureDate.setFullYear(futureDate.getFullYear() + 1);
         const futureDateString = futureDate.toISOString().split("T")[0];

         const invalidUpdates: Partial<UserUpdates> = {
            ...validUpdates,
            birthday: futureDateString
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertUserValidationErrorResponse(
            result,
            { birthday: "Birthday cannot be in the future" },
            true
         );
      });

      it("should return validation errors for password too long", async() => {
         const longPassword = "a".repeat(256);
         const invalidUpdates: Partial<UserUpdates> = {
            ...validPasswordChangeUpdates,
            newPassword: longPassword,
            verifyPassword: longPassword
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertUserValidationErrorResponse(
            result,
            {
               newPassword: "Password must be at most 255 characters",
               verifyPassword: "Password must be at most 255 characters"
            },
            true
         );
      });

      it("should return validation errors for mismatched new passwords", async() => {
         const invalidUpdates: Partial<UserUpdates> = {
            ...validPasswordChangeUpdates,
            verifyPassword: "DifferentPassword1!"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertUserValidationErrorResponse(
            result,
            { verifyPassword: "Passwords don't match" },
            true
         );
      });

      it("should return validation errors for new password same as old password", async() => {
         const invalidUpdates: Partial<UserUpdates> = {
            ...validPasswordChangeUpdates,
            newPassword: "Password1!",
            verifyPassword: "Password1!"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertUserValidationErrorResponse(
            result,
            { newPassword: "New password must not match the old password" },
            true
         );
      });

      it("should return validation errors for missing new password", async() => {
         const invalidUpdates: Partial<UserUpdates> = {
            ...validPasswordChangeUpdates,
            newPassword: undefined
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertUserValidationErrorResponse(
            result,
            {
               newPassword: "New password is required to set a new password",
               verifyPassword: "Passwords don't match"
            },
            true
         );
      });

      it("should return validation errors for missing password verification", async() => {
         const invalidUpdates: Partial<UserUpdates> = {
            ...validPasswordChangeUpdates,
            verifyPassword: undefined
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, invalidUpdates);

         assertUserValidationErrorResponse(
            result,
            { verifyPassword: "Password verification is required to set a new password" },
            true
         );
      });

      it("should return conflict error when updating to existing username", async() => {
         const updates: Partial<UserUpdates> = { username: "existinguser" };
         const conflictingUser: User = createConflictingUser(updates.username!, "different@example.com");

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         // Empty string for the email, which was not provided in the updates
         assertRepositoryCall(userRepository, "findConflictingUsers", [updates.username, "", userId]);
         assertUpdateOperationsNotCalled();
         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should return conflict error when updating to existing email", async() => {
         const updates: Partial<UserUpdates> = { email: "existing@example.com" };
         const conflictingUser: User = createConflictingUser("differentUsername", updates.email!);

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

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

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", [conflictingUser]);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertServiceErrorResponse(result, HTTP_STATUS.CONFLICT, { username: "Username already exists" });
      });

      it("should return not found when user does not exist during password change", async() => {
         const updates: Partial<UserUpdates> = {
            password: "Password1!",
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", []);
         arrangeMockRepositorySuccess(userRepository, "findByUserId", null);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertRepositoryCall(userRepository, "findByUserId", [userId]);
         assertMethodsNotCalled([{ module: argon2, methods: ["verify", "hash"] }]);
         assertUpdateOperationsNotCalled();
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should return bad request for invalid current password", async() => {
         const { mockUser: currentUser }: { mockUser: User } = createMockUserWithDetails();
         const updates: Partial<UserUpdates> = {
            password: "WrongPassword1!",
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", []);
         arrangeMockRepositorySuccess(userRepository, "findByUserId", currentUser);
         arrangeArgon2Mocks(argon2, "hashed_password_123", false);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertRepositoryCall(userRepository, "findByUserId", [userId]);
         assertArgon2Calls(argon2, currentUser.password, updates.password);
         assertUpdateOperationsNotCalled();
         assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, { password: "Invalid credentials" });
      });

      it("should return bad request for missing current password during password change", async() => {
         const updates: Partial<UserUpdates> = {
            newPassword: "NewPassword1!",
            verifyPassword: "NewPassword1!"
         };

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertUserValidationErrorResponse(
            result,
            { password: "Current password is required to set a new password" },
            true
         );
      });

      it("should return not found when user does not exist during update", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", []);
         arrangeMockRepositorySuccess(userRepository, "update", false);

         const result: ServerResponse = await userService.updateAccountDetails(userId, updates);

         assertRepositoryCall(userRepository, "update", [userId, updates]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should handle repository errors during update using helper", async() => {
         const updates: Partial<UserUpdates> = { username: "newusername" };

         arrangeMockRepositorySuccess(userRepository, "findConflictingUsers", []);
         arrangeMockRepositoryError(userRepository, "update", "Database connection failed");

         await assertServiceThrows(
            () => userService.updateAccountDetails(userId, updates),
            "Database connection failed"
         );

         assertRepositoryCall(userRepository, "update", [userId, updates]);
         assertCacheInvalidationNotCalled(redis);
      });
   });

   describe("deleteAccount", () => {
      /**
       * Asserts user deletion success behavior - delete, logout, cache clear
       *
       * @param {string} user_id - Expected user ID
       */
      const assertUserDeletionSuccessBehavior = (user_id: string): void => {
         expect(userRepository.deleteUser).toHaveBeenCalledWith(user_id);
         expect(authenticationService.logoutUser).toHaveBeenCalledWith(mockRes);

         // All applicable cache regions should be cleared for the given user_id
         ["accounts", "budgets", "transactions", "user"].forEach(key => {
            assertCacheInvalidation(redis, `${key}:${user_id}`);
         });
      };

      it("should delete user account successfully", async() => {
         arrangeMockRepositorySuccess(userRepository, "deleteUser", true);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "deleteAccount");

         assertUserDeletionSuccessBehavior(mockRes.locals.userId);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return not found when user does not exist", async() => {
         arrangeMockRepositorySuccess(userRepository, "deleteUser", false);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, userService, "deleteAccount");

         assertRepositoryCall(userRepository, "deleteUser", [mockRes.locals.userId]);
         assertDeleteOperationsNotCalled();
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, { user_id: "User does not exist based on the provided ID" });
      });

      it("should handle repository errors during deletion using helper", async() => {
         arrangeMockRepositoryError(userRepository, "deleteUser", "Database connection failed");

         await assertServiceThrows(
            () => callServiceMethodWithMockRes(mockRes, userService, "deleteAccount"),
            "Database connection failed"
         );
         assertRepositoryCall(userRepository, "deleteUser", [mockRes.locals.userId]);
         assertDeleteOperationsNotCalled();
      });
   });
});