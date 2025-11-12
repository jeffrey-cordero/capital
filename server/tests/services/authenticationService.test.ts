import { createMockUser, TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";

import * as authenticationService from "@/services/authenticationService";
import { createMockMiddleware, MockResponse } from "@/tests/utils/api";
import {
   arrangeArgon2Error,
   arrangeArgon2Mocks,
   arrangeMockRepositoryError,
   arrangeMockRepositorySuccess,
   assertArgon2Calls,
   assertMethodNotCalled,
   assertMethodsNotCalled,
   assertServiceErrorResponse,
   assertServiceSuccessResponse,
   assertServiceThrows,
   callServiceMethodWithMockRes
} from "@/tests/utils/services";
import { TEST_SECRET, TEST_TOKENS, TEST_USER_PAYLOAD } from "@/tests/utils/tokens";

jest.mock("argon2");
jest.mock("jsonwebtoken");
jest.mock("@/lib/logger");
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

   /**
    * Asserts the mock `clearTokens` method was called with the mock response object
    */
   const assertTokensCleared = (): void => {
      expect(middleware.clearTokens).toHaveBeenCalledWith(mockRes);
   };

   /**
    * Asserts middleware.configureToken was called correctly
    *
    * @param {string} userId - Expected user ID
    * @param {number} secondsUntilExpire - Optional expected seconds until expire
    */
   const assertTokenConfigured = (
      userId: string,
      secondsUntilExpire?: number
   ): void => {
      if (secondsUntilExpire !== undefined) {
         const calledSeconds = (middleware.configureToken as jest.Mock).mock.calls[0][2];
         expect(calledSeconds).toBeLessThanOrEqual(secondsUntilExpire + 2);
         expect(calledSeconds).toBeGreaterThanOrEqual(secondsUntilExpire - 2);
         expect(middleware.configureToken).toHaveBeenCalledWith(mockRes, userId, calledSeconds);
      } else {
         expect(middleware.configureToken).toHaveBeenCalledWith(mockRes, userId);
      }
   };

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
      /**
       * Arranges JWT verify mock to return the provided payload
       *
       * @param {Record<string, any>} payload - Payload to inject into the JWT verify mock
       */
      const arrangeMockJWTVerify = (payload: Record<string, any>): void => {
         (jwt.verify as jest.Mock).mockReturnValue(payload);
      };

      /**
       * Arranges JWT verify mock to throw error
       *
       * @param {string} errorMessage - Error message to throw
       */
      const arrangeMockJWTVerifyError = (errorMessage: string): void => {
         (jwt.verify as jest.Mock).mockImplementation(() => {
            if (errorMessage === "jwt expired") {
               throw new jwt.TokenExpiredError("jwt expired", new Date());
            } else if (errorMessage === "invalid signature" || errorMessage === "jwt malformed" || errorMessage === "jwt must be provided") {
               throw new jwt.JsonWebTokenError(errorMessage);
            } else {
               throw new Error(errorMessage);
            }
         });
      };

      it("should authenticate user and return success for valid JWT token", async() => {
         arrangeMockJWTVerify(TEST_USER_PAYLOAD);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.VALID_ACCESS);

         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: true });
      });

      it("should return refreshable flag when JWT token has expired", async() => {
         arrangeMockJWTVerifyError("jwt expired");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.EXPIRED_ACCESS);

         expect(mockRes.clearCookie).not.toHaveBeenCalled();
         assertServiceSuccessResponse(result, HTTP_STATUS.UNAUTHORIZED, { refreshable: true });
      });

      it("should clear tokens and return unauthenticated for invalid JWT signature", async() => {
         arrangeMockJWTVerifyError("invalid signature");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.INVALID_ACCESS);

         assertTokensCleared();
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: false });
      });

      it("should clear tokens and return unauthenticated for malformed JWT", async() => {
         arrangeMockJWTVerifyError("jwt malformed");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.MALFORMED_ACCESS);

         assertTokensCleared();
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: false });
      });

      it("should clear tokens and return unauthenticated when no token is provided", async() => {
         arrangeMockJWTVerifyError("jwt must be provided");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", "");

         assertTokensCleared();
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: false });
      });

      it("should return internal server error for unexpected errors", async() => {
         arrangeMockJWTVerifyError("Unexpected error");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.VALID_ACCESS);

         assertServiceErrorResponse(result, HTTP_STATUS.INTERNAL_SERVER_ERROR, { server: "Internal Server Error" });
      });

      it("should handle missing SESSION_SECRET environment variable", async() => {
         delete process.env.SESSION_SECRET;
         arrangeMockJWTVerifyError("secretOrPrivateKey must have a value");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.VALID_ACCESS);

         assertServiceErrorResponse(result, HTTP_STATUS.INTERNAL_SERVER_ERROR, { server: "Internal Server Error" });
      });

      it("should verify jwt.verify is called with correct token and secret", async() => {
         arrangeMockJWTVerify(TEST_USER_PAYLOAD);

         await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.VALID_ACCESS);

         expect(jwt.verify).toHaveBeenCalledWith(TEST_TOKENS.VALID_ACCESS, TEST_SECRET);
      });

      it("should handle token expiring in 1 second", async() => {
         const payload = { ...TEST_USER_PAYLOAD, exp: Math.floor(Date.now() / 1000) + 1 };
         arrangeMockJWTVerify(payload);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", "expiring.token");

         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { authenticated: true });
      });

      it("should handle token expired by 1 second", async() => {
         arrangeMockJWTVerifyError("jwt expired");

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "getAuthentication", TEST_TOKENS.EXPIRED_ACCESS);

         assertServiceSuccessResponse(result, HTTP_STATUS.UNAUTHORIZED, { refreshable: true });
      });
   });

   describe("authenticateUser", () => {
      it("should authenticate user with valid credentials", async() => {
         const mockUser = createMockUser({ username: validUsername, password: hashedPassword });
         arrangeMockRepositorySuccess(userRepository, "findByUsername", mockUser);
         arrangeArgon2Mocks(argon2, hashedPassword, true);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, validPassword);

         assertTokenConfigured(mockUser.user_id!);
         assertArgon2Calls(argon2, hashedPassword, validPassword);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should return unauthorized for nonexistent username", async() => {
         arrangeMockRepositorySuccess(userRepository, "findByUsername", null);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", "nonexistent", validPassword);

         assertMethodsNotCalled([
            { module: argon2, methods: ["verify", "hash"] },
            { module: middleware, methods: ["configureToken"] }
         ]);
         assertServiceErrorResponse(result, HTTP_STATUS.UNAUTHORIZED, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });

      it("should return unauthorized for invalid password", async() => {
         const mockUser = createMockUser({ username: validUsername, password: hashedPassword });
         arrangeMockRepositorySuccess(userRepository, "findByUsername", mockUser);
         arrangeArgon2Mocks(argon2, hashedPassword, false);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, "wrongpassword");

         assertArgon2Calls(argon2, hashedPassword, "wrongpassword");
         assertMethodNotCalled(middleware, "configureToken");
         assertServiceErrorResponse(result, HTTP_STATUS.UNAUTHORIZED, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });

      it("should return unauthorized for missing username", async() => {
         arrangeMockRepositorySuccess(userRepository, "findByUsername", null);
         arrangeArgon2Mocks(argon2, "", false);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", "", validPassword);

         assertMethodsNotCalled([
            { module: argon2, methods: ["verify", "hash"] },
            { module: middleware, methods: ["configureToken"] }
         ]);
         assertServiceErrorResponse(result, HTTP_STATUS.UNAUTHORIZED, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });

      it("should return unauthorized for missing password", async() => {
         const mockUser = createMockUser({ username: validUsername, password: hashedPassword });
         arrangeMockRepositorySuccess(userRepository, "findByUsername", mockUser);
         arrangeArgon2Mocks(argon2, hashedPassword, false);

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, "");

         assertArgon2Calls(argon2, hashedPassword, "");
         assertMethodNotCalled(middleware, "configureToken");
         assertServiceErrorResponse(result, HTTP_STATUS.UNAUTHORIZED, {
            username: "Invalid credentials",
            password: "Invalid credentials"
         });
      });

      it("should handle repository error during user lookup", async() => {
         arrangeMockRepositoryError(userRepository, "findByUsername", "Database connection failed");

         await assertServiceThrows(
            () => callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, validPassword),
            "Database connection failed"
         );

         assertMethodsNotCalled([
            { module: argon2, methods: ["verify", "hash"] },
            { module: middleware, methods: ["configureToken"] }
         ]);
      });

      it("should handle argon2.verify error", async() => {
         const mockUser = createMockUser({ username: validUsername, password: hashedPassword });
         arrangeMockRepositorySuccess(userRepository, "findByUsername", mockUser);

         const argon2Error = new Error("Argon2 verification failed");
         arrangeArgon2Error(argon2, argon2Error);

         await assertServiceThrows(
            () => callServiceMethodWithMockRes(mockRes, authenticationService, "authenticateUser", validUsername, validPassword),
            "Argon2 verification failed"
         );

         assertArgon2Calls(argon2, hashedPassword, validPassword);
         assertMethodNotCalled(middleware, "configureToken");
      });
   });

   describe("refreshToken", () => {
      it("should refresh token successfully with standard expiration (7 days)", async() => {
         const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         const expectedSeconds = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
         assertTokenConfigured(TEST_USER_ID, expectedSeconds);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should refresh token with 5 seconds remaining", async() => {
         const expirationDate = new Date(Date.now() + 5 * 1000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         const expectedSeconds = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
         assertTokenConfigured(TEST_USER_ID, expectedSeconds);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should handle expired refresh token during the refresh request to be configured to 0 seconds for expired refresh tokens", async() => {
         const expirationDate = new Date(Date.now() - 25000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         assertTokenConfigured(TEST_USER_ID, 0);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });

      it("should configure refresh token with 2 minutes remaining", async() => {
         const expirationDate = new Date(Date.now() + 120000);
         mockRes.locals.refresh_token_expiration = expirationDate;

         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "refreshToken", TEST_USER_ID);

         const expectedSeconds = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
         assertTokenConfigured(TEST_USER_ID, expectedSeconds);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, { success: true });
      });
   });

   describe("logoutUser", () => {
      it("should logout user successfully", async() => {
         const result: ServerResponse = await callServiceMethodWithMockRes(mockRes, authenticationService, "logoutUser");

         assertTokensCleared();
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

         assertTokensCleared();
      });
   });
});