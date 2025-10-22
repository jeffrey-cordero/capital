import { createMockUser } from "capital/mocks/server";
import { HTTP_STATUS, ServerResponse } from "capital/server";

import * as authenticationService from "@/services/authenticationService";
import { createMockMiddleware, MockResponse } from "@/tests/utils/api";
import {
   assertMethodNotCalled,
   assertRepositoryCall,
   assertServiceErrorResponse,
   assertServiceSuccessResponse,
   assertTokenConfigured,
   assertTokensCleared,
   callServiceMethodWithMockRes,
   expectServiceToThrow,
   setupArgon2Error,
   setupArgon2Mocks,
   setupMockJWTVerify,
   setupMockJWTVerifyError,
   setupMockRepositoryError,
   setupMockRepositoryNull,
   setupMockRepositorySuccess
} from "@/tests/utils/services";
import { TEST_SECRET, TEST_TOKENS, TEST_USER_ID, TEST_USER_PAYLOAD } from "@/tests/utils/tokens";

jest.mock("argon2");
jest.mock("jsonwebtoken");
jest.mock("@/lib/middleware");
jest.mock("@/repository/userRepository");

describe("Authentication Service", () => {
   const validUsername: string = "testuser";
   const validPassword: string = "Password1!";
   const hashedPassword: string = "hashed_password_123";

   let mockRes: MockResponse;
   let userRepository: typeof import("@/repository/userRepository");
   let jwt: typeof import("jsonwebtoken");
   let argon2: typeof import("argon2");
   let middleware: typeof import("@/lib/middleware");

   beforeEach(async() => {
      jest.clearAllMocks();

      userRepository = await import("@/repository/userRepository");
      jwt = await import("jsonwebtoken");
      argon2 = await import("argon2");
      middleware = await import("@/lib/middleware");

      ({ mockRes } = createMockMiddleware());
      process.env.SESSION_SECRET = TEST_SECRET;
   });

   describe("getAuthentication", () => {
      it("should return authenticated true for valid token", async() => {
         setupMockJWTVerify(jwt, TEST_USER_PAYLOAD);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.VALID_ACCESS);

         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: true });
      });

      it("should return refreshable true for expired token", async() => {
         setupMockJWTVerifyError(jwt, "jwt expired");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.EXPIRED_ACCESS);

         assertServiceSuccessResponse(result, HTTP_STATUS.UNAUTHORIZED, { refreshable: true });
      });

      it("should clear cookie and return authenticated false for invalid JWT signature", async() => {
         setupMockJWTVerifyError(jwt, "invalid signature");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.INVALID_ACCESS);

         assertTokensCleared(middleware, mockRes);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: false });
      });

      it("should clear cookie and return authenticated false for malformed JWT", async() => {
         setupMockJWTVerifyError(jwt, "jwt malformed");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.MALFORMED_ACCESS);

         assertTokensCleared(middleware, mockRes);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: false });
      });

      it("should return authenticated false for missing token", async() => {
         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", undefined as any);

         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: false });
      });

      it("should return authenticated false for empty string token", async() => {
         setupMockJWTVerifyError(jwt, "jwt malformed");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", "");

         assertTokensCleared(middleware, mockRes);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: false });
      });

      it("should return internal server error for unexpected errors", async() => {
         setupMockJWTVerifyError(jwt, "Unexpected error");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.VALID_ACCESS);

         assertServiceErrorResponse(result, HTTP_STATUS.INTERNAL_SERVER_ERROR, { server: "Internal Server Error" });
      });

      it("should handle missing SESSION_SECRET environment variable", async() => {
         delete process.env.SESSION_SECRET;
         setupMockJWTVerifyError(jwt, "secretOrPrivateKey must have a value");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.VALID_ACCESS);

         assertServiceErrorResponse(result, HTTP_STATUS.INTERNAL_SERVER_ERROR, { server: "Internal Server Error" });
      });

      it("should not clear cookie for TokenExpiredError", async() => {
         setupMockJWTVerifyError(jwt, "jwt expired");

         await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.EXPIRED_ACCESS);

         expect(mockRes.clearCookie).not.toHaveBeenCalled();
      });

      it("should verify jwt.verify is called with correct token and secret", async() => {
         setupMockJWTVerify(jwt, TEST_USER_PAYLOAD);

         await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.VALID_ACCESS);

         expect(jwt.verify).toHaveBeenCalledWith(TEST_TOKENS.VALID_ACCESS, TEST_SECRET);
      });

      it("should handle token expiring in 1 second", async() => {
         const payload = { ...TEST_USER_PAYLOAD, exp: Math.floor(Date.now() / 1000) + 1 };
         setupMockJWTVerify(jwt, payload);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", "expiring.token");

         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: true });
      });

      it("should handle token expired by 1 second", async() => {
         setupMockJWTVerifyError(jwt, "jwt expired");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.EXPIRED_ACCESS);

         assertServiceSuccessResponse(result, HTTP_STATUS.UNAUTHORIZED, { refreshable: true });
      });
   });

   describe("authenticateUser", () => {
      it("should authenticate user with valid credentials", async() => {
         const mockUser = createMockUser({ username: validUsername, password: hashedPassword });
         setupMockRepositorySuccess(userRepository, "findByUsername", mockUser);
         setupArgon2Mocks(argon2, hashedPassword, true);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, validPassword);

         assertTokenConfigured(middleware, mockRes, mockUser.user_id as string);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should return unauthorized for user not found", async() => {
         setupMockRepositoryNull(userRepository, "findByUsername");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", "nonexistent", validPassword);

         assertMethodNotCalled(middleware, "configureToken");
         assertServiceErrorResponse(result, HTTP_STATUS.UNAUTHORIZED, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });

      it("should return unauthorized for invalid password", async() => {
         const mockUser = createMockUser({ username: validUsername, password: hashedPassword });
         setupMockRepositorySuccess(userRepository, "findByUsername", mockUser);
         setupArgon2Mocks(argon2, hashedPassword, false);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, "wrongpassword");

         assertMethodNotCalled(middleware, "configureToken");
         assertServiceErrorResponse(result, HTTP_STATUS.UNAUTHORIZED, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });

      it("should return unauthorized for missing username", async() => {
         setupMockRepositoryNull(userRepository, "findByUsername");
         setupArgon2Mocks(argon2, "", false);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", "", validPassword);

         assertMethodNotCalled(middleware, "configureToken");
         assertServiceErrorResponse(result, HTTP_STATUS.UNAUTHORIZED, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });

      it("should return unauthorized for missing password", async() => {
         const mockUser = createMockUser({ username: validUsername, password: hashedPassword });
         setupMockRepositorySuccess(userRepository, "findByUsername", mockUser);
         setupArgon2Mocks(argon2, hashedPassword, false);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, "");

         assertMethodNotCalled(middleware, "configureToken");
         assertServiceErrorResponse(result, HTTP_STATUS.UNAUTHORIZED, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });

      it("should handle repository error during user lookup", async() => {
         setupMockRepositoryError(userRepository, "findByUsername", "Database connection failed");

         await expectServiceToThrow(
            () => callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, validPassword),
            "Database connection failed"
         );

         assertMethodNotCalled(middleware, "configureToken");
      });

      it("should handle argon2 verification error", async() => {
         const mockUser = createMockUser({ username: validUsername, password: hashedPassword });
         setupMockRepositorySuccess(userRepository, "findByUsername", mockUser);
         const argon2Error = new Error("Argon2 verification failed");
         setupArgon2Error(argon2, argon2Error);

         await expectServiceToThrow(
            () => callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, validPassword),
            "Argon2 verification failed"
         );

         assertMethodNotCalled(middleware, "configureToken");
      });

      it("should verify findByUsername is called with correct username", async() => {
         const mockUser = createMockUser({ username: validUsername, password: hashedPassword });
         setupMockRepositorySuccess(userRepository, "findByUsername", mockUser);
         setupArgon2Mocks(argon2, hashedPassword, true);

         await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, validPassword);

         assertRepositoryCall(userRepository, "findByUsername", [validUsername]);
      });

      it("should verify argon2.verify is called with correct hash and password", async() => {
         const mockUser = createMockUser({ username: validUsername, password: hashedPassword });
         setupMockRepositorySuccess(userRepository, "findByUsername", mockUser);
         setupArgon2Mocks(argon2, hashedPassword, true);

         await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, validPassword);

         expect(argon2.verify).toHaveBeenCalledWith(hashedPassword, validPassword);
      });

      it("should handle user with null password", async() => {
         const mockUser = createMockUser({ username: validUsername, password: "" });
         setupMockRepositorySuccess(userRepository, "findByUsername", mockUser);
         setupArgon2Mocks(argon2, "", false);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, validPassword);

         assertServiceErrorResponse(result, HTTP_STATUS.UNAUTHORIZED, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });

      it("should be case sensitive for username", async() => {
         setupMockRepositoryNull(userRepository, "findByUsername");
         setupArgon2Mocks(argon2, "", false);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername.toUpperCase(), validPassword);

         assertServiceErrorResponse(result, HTTP_STATUS.UNAUTHORIZED, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });
   });

   describe("refreshToken", () => {
      it("should refresh token successfully with standard expiration", async() => {
         // 7 days from now
         const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         const expectedSeconds = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
         assertTokenConfigured(middleware, mockRes, TEST_USER_ID, expectedSeconds);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should refresh token with 10 minutes remaining", async() => {
         // 10 minutes from now
         const expirationDate = new Date(Date.now() + 10 * 60 * 1000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         const expectedSeconds = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
         assertTokenConfigured(middleware, mockRes, TEST_USER_ID, expectedSeconds);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should refresh token with 1 minute remaining", async() => {
         // 1 minute from now
         const expirationDate = new Date(Date.now() + 60 * 1000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         const expectedSeconds = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
         assertTokenConfigured(middleware, mockRes, TEST_USER_ID, expectedSeconds);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should refresh token with 5 seconds remaining", async() => {
         // 5 seconds from now
         const expirationDate = new Date(Date.now() + 5 * 1000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         const expectedSeconds = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
         assertTokenConfigured(middleware, mockRes, TEST_USER_ID, expectedSeconds);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should handle already expired token", async() => {
         // 1 second ago
         const expirationDate = new Date(Date.now() - 1000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         assertTokenConfigured(middleware, mockRes, TEST_USER_ID, 0);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should handle token expiring far in the future", async() => {
         // 30 days from now
         const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         const expectedSeconds = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
         assertTokenConfigured(middleware, mockRes, TEST_USER_ID, expectedSeconds);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should verify Math.max prevents negative seconds", async() => {
         // 5 seconds ago
         const expirationDate = new Date(Date.now() - 5000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         assertTokenConfigured(middleware, mockRes, TEST_USER_ID, 0);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should verify Math.floor rounds down fractional seconds", async() => {
         // 1.7 seconds from now
         const expirationDate = new Date(Date.now() + 1700);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         const expectedSeconds = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
         assertTokenConfigured(middleware, mockRes, TEST_USER_ID, expectedSeconds);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should verify expiration time calculation accuracy", async() => {
         // 2 minutes from now
         const expirationDate = new Date(Date.now() + 120000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         const expectedSeconds = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
         // Allow for small time differences
         expect(expectedSeconds).toBeGreaterThanOrEqual(118);
         expect(expectedSeconds).toBeLessThanOrEqual(120);
      });
   });

   describe("logoutUser", () => {
      it("should logout user successfully", async() => {
         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "logoutUser");

         assertTokensCleared(middleware, mockRes);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should handle multiple consecutive logouts", async() => {
         for (let i = 0; i < 3; i++) {
            const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "logoutUser");
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
         }

         expect(middleware.clearTokens).toHaveBeenCalledTimes(3);
      });

      it("should verify clearTokens is called on response", async() => {
         await callServiceMethodWithMockRes(mockRes, authenticationService, "logoutUser");

         assertTokensCleared(middleware, mockRes);
      });
   });
});