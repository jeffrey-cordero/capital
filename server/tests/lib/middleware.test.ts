import { TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";
import { RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";

import { logger } from "@/lib/logger";
import {
   authenticateRefreshToken,
   authenticateToken,
   clearTokens,
   configureToken,
   TOKEN_EXPIRATIONS
} from "@/lib/middleware";
import { createMockMiddleware, MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";
import { TEST_SECRET, TEST_USER_PAYLOAD } from "@/tests/utils/tokens";

/**
 * Mock the logger to minimize the error output during middleware tests
 */
jest.mock("@/lib/logger");

describe("Authentication Middleware", () => {
   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: MockNextFunction;

   /**
    * Calls a middleware function with the mock request, response, and next function
    *
    * @param {RequestHandler} middleware - The middleware function to call
    */
   const callMiddleware = (middleware: RequestHandler): void => {
      middleware(mockReq as any, mockRes as any, mockNext as any);
   };

   /**
    * Asserts a response has the expected status code and does not call the `next` function
    *
    * @param {number} expectedStatus - The expected HTTP status code
    * @param {Record<string, any>} [json] - The expected JSON response, defaults to `{ errors: {} }`
    */
   const assertResponseStatus = (expectedStatus: number, json?: Record<string, any>): void => {
      expect(mockRes.status).toHaveBeenCalledWith(expectedStatus);
      expect(mockRes.json).toHaveBeenCalledWith(json || { errors: {} });
      expect(mockNext).not.toHaveBeenCalled();
   };

   /**
    * Asserts successful authentication with the `user_id` attached to the mock
    * `res.locals` and the `next` function called
    */
   const assertSuccessfulAuthentication = (): void => {
      expect(mockRes.locals.user_id).toBe(TEST_USER_ID);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
   };

   /**
    * Asserts successful authentication with refresh token expiration
    */
   const assertSuccessfulRefreshAuthentication = (): void => {
      assertSuccessfulAuthentication();
      expect(mockRes.locals.refresh_token_expiration).toBeDefined();
      expect(mockRes.locals.refresh_token_expiration).toBeInstanceOf(Date);
   };

   /**
    * Asserts that both access and refresh tokens are no longer handled via cookies
    */
   const assertTokensCleared = () => {
      expect(mockRes.clearCookie).not.toHaveBeenCalled();
      expect(Object.keys(mockRes.cookies)).toHaveLength(0);
   };

   /**
    * Asserts token structure from the returned tokens object
    *
    * @param {Object} tokens - The tokens object returned by configureToken
    * @param {"access_token" | "refresh_token"} tokenType - The type of token to validate
    */
   const assertTokenStructure = (tokens: any, tokenType: "access_token" | "refresh_token") => {
      const tokenValue = tokens[tokenType];
      expect(tokenValue).toBeDefined();
      expect(typeof tokenValue).toBe("string");
   };

   /**
    * Asserts a JWT token has the expected properties and returns the decoded token payload
    *
    * @param {string} tokenValue - The JWT token value
    * @param {"access_token" | "refresh_token"} tokenType - The type of token to verify
    * @param {number} customExpirationSeconds - Optional custom expiration time in seconds
    */
   const assertAndDecodeToken = (tokenValue: string, tokenType: "access_token" | "refresh_token", customExpirationSeconds?: number): jwt.JwtPayload => {
      const decoded = jwt.verify(tokenValue, TEST_SECRET) as jwt.JwtPayload;

      expect(decoded).toMatchObject({ user_id: TEST_USER_ID });
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe("number");

      const currentTime = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThan(currentTime);

      if (customExpirationSeconds !== undefined) {
         const expectedExpiration = currentTime + customExpirationSeconds;
         expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiration);
      } else {
         const expectedExpiration = currentTime + (tokenType === "access_token" ? TOKEN_EXPIRATIONS.ACCESS_TOKEN : TOKEN_EXPIRATIONS.REFRESH_TOKEN) / 1000;
         expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiration - 2);
         expect(decoded.exp).toBeLessThanOrEqual(expectedExpiration + 2);
      }

      return decoded;
   };

   /**
    * Asserts both access and refresh tokens are properly configured and returned
    *
    * @param {Object} tokens - The tokens object returned by configureToken
    */
   const assertTokenConfiguration = (tokens: any) => {
      expect(tokens).toBeDefined();
      expect(Object.keys(tokens)).toHaveLength(2);
      assertTokenStructure(tokens, "refresh_token");
      assertTokenStructure(tokens, "access_token");

      assertAndDecodeToken(tokens.access_token, "access_token");
      assertAndDecodeToken(tokens.refresh_token, "refresh_token");
   };

   /**
    * Arranges and asserts unexpected error handling for a middleware function
    *
    * @param {RequestHandler} middleware - The middleware function to test
    * @param {number} expectedStatus - The expected status code
    */
   const assertErrorHandling = (middleware: RequestHandler, expectedStatus: number) => {
      const mockError = new Error("Unexpected error");
      mockError.stack = "Error: Unexpected error\n    at someFunction";

      jest.spyOn(jwt, "verify").mockImplementation(() => {
         throw mockError;
      });

      const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
      mockReq.headers.authorization = `Bearer ${validToken}`;

      callMiddleware(middleware);

      expect(logger.error).toHaveBeenCalledWith(mockError.stack);
      expect(mockRes.clearCookie).not.toHaveBeenCalled();
      assertResponseStatus(expectedStatus);

      jest.spyOn(jwt, "verify").mockRestore();
   };

   /**
    * Arranges and asserts missing `SESSION_SECRET` error handling for a middleware function
    *
    * @param {Function} middlewareFunction - The middleware function to test
    * @param {number} expectedStatus - The expected status code
    */
   const assertMissingSessionSecret = (middlewareFunction: any, expectedStatus: number) => {
      delete process.env.SESSION_SECRET;

      const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
      mockReq.headers.authorization = `Bearer ${validToken}`;
      callMiddleware(middlewareFunction);

      expect(mockRes.clearCookie).not.toHaveBeenCalled();
      assertResponseStatus(expectedStatus);
   };

   beforeEach(() => {
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      process.env.SESSION_SECRET = TEST_SECRET;
      jest.clearAllMocks();
   });

   describe("Token Configuration", () => {
      it("should generate both access_token and refresh_token", () => {
         const tokens = configureToken(mockRes as Response, TEST_USER_ID);

         assertTokenConfiguration(tokens);
      });

      it("should use default refresh token expiration when secondsUntilExpire is not provided", () => {
         const tokens = configureToken(mockRes as Response, TEST_USER_ID);

         assertAndDecodeToken(tokens.refresh_token, "refresh_token");
      });

      it("should handle missing SESSION_SECRET environment variable", () => {
         delete process.env.SESSION_SECRET;

         expect(() => configureToken(mockRes as Response, TEST_USER_ID)).toThrow("secretOrPrivateKey must have a value");
      });
   });

   describe("Token Clearing", () => {
      it("should clear both access_token and refresh_token cookies", () => {
         clearTokens(mockRes as Response);

         assertTokensCleared();
      });
   });

   describe("Token Authentication", () => {
      /**
       * Asserts unauthorized response with refreshable flag and no token clearing
       */
      const assertUnauthorizedWithRefreshable = (): void => {
         expect(mockRes.clearCookie).not.toHaveBeenCalled();
         assertResponseStatus(HTTP_STATUS.UNAUTHORIZED, { data: { refreshable: true } });
      };

      /**
       * Asserts forbidden response with access token clearing and no refreshable flag
       */
      const assertForbiddenResponse = (): void => {
         assertTokensCleared();
         assertResponseStatus(HTTP_STATUS.FORBIDDEN, { errors: {} });
      };

      it("should authenticate valid access token and attach user_id to res.locals", () => {
         const validToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "1h" });
         mockReq.headers.authorization = `Bearer ${validToken}`;

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertSuccessfulAuthentication();
      });

      it("should return unauthorized when access token is missing and authentication required", () => {
         mockReq.headers.authorization = "";

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertResponseStatus(HTTP_STATUS.UNAUTHORIZED);
      });

      it("should return unauthorized with refreshable flag for expired access token", () => {
         const expiredToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "-1h" });
         mockReq.headers.authorization = `Bearer ${expiredToken}`;

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertUnauthorizedWithRefreshable();
      });

      it("should return forbidden for invalid JWT signature and NOT clear cookies (no-op)", () => {
         const invalidToken = jwt.sign(TEST_USER_PAYLOAD, "invalid-secret");
         mockReq.headers.authorization = `Bearer ${invalidToken}`;

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertForbiddenResponse();
      });

      it("should return forbidden for malformed JWT and NOT clear cookies (no-op)", () => {
         mockReq.headers.authorization = "Bearer not-a-valid-jwt";

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertForbiddenResponse();
      });

      it("should return forbidden when user_id is missing from access token payload and NOT clear cookies (no-op)", () => {
         const missingUserIdToken = jwt.sign({ some_field: "value" }, TEST_SECRET);
         mockReq.headers.authorization = `Bearer ${missingUserIdToken}`;

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertForbiddenResponse();
      });

      it("should call next when the access token is not required and not present", () => {
         const middleware = authenticateToken(false);
         callMiddleware(middleware);

         expect(mockNext).toHaveBeenCalled();
         expect(mockRes.status).not.toHaveBeenCalled();
      });

      it("should return redirect when the access token is present but not required", () => {
         const validAccessToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET);
         mockReq.headers.authorization = `Bearer ${validAccessToken}`;

         const middleware = authenticateToken(false);
         callMiddleware(middleware);

         assertResponseStatus(HTTP_STATUS.REDIRECT);
      });

      it("should handle unexpected errors during access token verification", () => {
         assertErrorHandling(authenticateToken(true), HTTP_STATUS.FORBIDDEN);
      });

      it("should handle missing SESSION_SECRET environment variable for access token", () => {
         assertMissingSessionSecret(authenticateToken(true), HTTP_STATUS.FORBIDDEN);
      });
   });

   describe("Refresh Token Authentication", () => {
      /**
       * Asserts unauthorized response with token clearing
       */
      const assertUnauthorizedWithTokenClearing = (): void => {
         assertTokensCleared();
         assertResponseStatus(HTTP_STATUS.UNAUTHORIZED);
      };

      it("should authenticate valid refresh token and attach user_id to res.locals and refresh_token_expiration to res.locals", () => {
         const validRefreshToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "7d" });
         mockReq.headers.authorization = `Bearer ${validRefreshToken}`;

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertSuccessfulRefreshAuthentication();
      });

      it("should return unauthorized and NOT clear cookies (no-op) when the refresh token is missing", () => {
         mockReq.headers.authorization = "";

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertTokensCleared();
         assertResponseStatus(HTTP_STATUS.UNAUTHORIZED);
      });

      it("should return unauthorized and NOT clear cookies (no-op) for an expired refresh token", () => {
         const expiredToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "-1d" });
         mockReq.headers.authorization = `Bearer ${expiredToken}`;

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertUnauthorizedWithTokenClearing();
      });

      it("should return unauthorized and clear both tokens when an invalid refresh token is provided", () => {
         const invalidToken = jwt.sign(TEST_USER_PAYLOAD, "wrong-secret");
         mockReq.headers.authorization = `Bearer ${invalidToken}`;

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertUnauthorizedWithTokenClearing();
      });

      it("should return forbidden when user_id is missing from the refresh token payload", () => {
         const missingUserIdToken = jwt.sign({ some_field: "value" }, TEST_SECRET);
         mockReq.headers.authorization = `Bearer ${missingUserIdToken}`;

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertResponseStatus(HTTP_STATUS.FORBIDDEN);
      });

      it("should handle unexpected errors during refresh token verification and clear both tokens", () => {
         assertErrorHandling(authenticateRefreshToken(), HTTP_STATUS.FORBIDDEN);
      });

      it("should handle missing SESSION_SECRET environment variable for the refresh token", () => {
         assertMissingSessionSecret(authenticateRefreshToken(), HTTP_STATUS.UNAUTHORIZED);
      });
   });

   describe("Token Rotation", () => {
      /**
       * Asserts token rotation by checking that new tokens are different from original tokens
       *
       * @param {string} firstAccessToken - The first access token
       * @param {string} firstRefreshToken - The first refresh token
       * @param {string} secondAccessToken - The second access token
       * @param {string} secondRefreshToken - The second refresh token
       */
      const assertTokenRotation = (firstAccessToken: string, firstRefreshToken: string, secondAccessToken: string, secondRefreshToken: string): void => {
         expect(firstAccessToken).not.toBe(secondAccessToken);
         expect(firstRefreshToken).not.toBe(secondRefreshToken);
      };

      /**
       * Asserts refresh token expiration preservation across multiple refresh calls
       *
       * @param {string} originalRefreshToken - The original refresh token
       * @param {number} originalExpirationTime - The original expiration time
       * @param {number} secondsUntilExpire - Seconds until expiration
       */
      const assertRefreshTokenExpirationPreservation = (originalRefreshToken: string, originalExpirationTime: number, secondsUntilExpire: number): void => {
         mockReq.headers.authorization = `Bearer ${originalRefreshToken}`;
         callMiddleware(authenticateRefreshToken());
         assertSuccessfulRefreshAuthentication();

         const tokens = configureToken(mockRes as any, TEST_USER_ID, secondsUntilExpire);

         const newRefreshToken = tokens.refresh_token;
         const newDecoded = assertAndDecodeToken(newRefreshToken, "refresh_token", secondsUntilExpire);

         // Assert the new refresh token should have the same expiration time as the original refresh token to avoid infinite login
         expect(Math.abs(newDecoded.exp! - originalExpirationTime)).toEqual(0);
      };

      it("should issue new access and refresh tokens with the same user_id when refreshing", async() => {
         const firstTokens = configureToken(mockRes as Response, TEST_USER_ID);
         const firstAccessToken = firstTokens.access_token;
         const firstRefreshToken = firstTokens.refresh_token;

         await new Promise(resolve => setTimeout(resolve, 1100));

         const secondTokens = configureToken(mockRes as Response, TEST_USER_ID);
         const secondAccessToken = secondTokens.access_token;
         const secondRefreshToken = secondTokens.refresh_token;
         assertTokenRotation(firstAccessToken, firstRefreshToken, secondAccessToken, secondRefreshToken);
      });

      it("should preserve original refresh token expiration time across multiple refresh calls", async() => {
         const firstTokens = configureToken(mockRes as Response, TEST_USER_ID);
         const originalRefreshToken = firstTokens.refresh_token;
         const originalDecoded = assertAndDecodeToken(originalRefreshToken, "refresh_token");
         const originalExpirationTime = originalDecoded.exp!;
         const secondsUntilExpire = Math.max(0, Math.floor((originalExpirationTime - Date.now()) / 1000));

         assertRefreshTokenExpirationPreservation(originalRefreshToken, originalExpirationTime, secondsUntilExpire);
      });
   });

   describe("Refresh Token Expiration", () => {
      /**
       * Asserts unauthorized response with token clearing
       */
      const assertUnauthorizedWithTokenClearing = (): void => {
         assertTokensCleared();
         assertResponseStatus(HTTP_STATUS.UNAUTHORIZED);
      };

      /**
       * Asserts token expiration relationship and expired token behavior, where refresh
       * token should eventually expire before access token
       *
       * @param {string} refreshToken - The refresh token
       * @param {string} accessToken - The access token
       * @param {number} secondsUntilExpire - Seconds until expiration
       */
      const assertTokenExpirationRelationship = async(refreshToken: string, accessToken: string, secondsUntilExpire: number): Promise<void> => {
         const refreshDecoded = assertAndDecodeToken(refreshToken, "refresh_token", secondsUntilExpire);
         const accessDecoded = assertAndDecodeToken(accessToken, "access_token");
         expect(accessDecoded.exp!).toBeGreaterThan(refreshDecoded.exp!);

         // Arrange the test to wait for 2 seconds to ensure the refresh token expires
         await new Promise(resolve => setTimeout(resolve, 2000));
         const currentTime = Math.floor(Date.now() / 1000);
         expect(currentTime).toBeGreaterThan(refreshDecoded.exp!);

         // Arrange the test to authenticate the refresh token, which should return unauthorized
         mockReq.headers.authorization = `Bearer ${refreshToken}`;
         callMiddleware(authenticateRefreshToken());

         assertResponseStatus(HTTP_STATUS.UNAUTHORIZED);
      };

      it("should authenticate a valid refresh token and set refresh_token_expiration in res.locals", () => {
         const validToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "7d" });
         mockReq.headers.authorization = `Bearer ${validToken}`;

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertSuccessfulRefreshAuthentication();
      });

      it("should return unauthorized and NOT clear cookies (no-op) when an expired refresh token is provided", () => {
         const expiredToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "-1d" });
         mockReq.headers.authorization = `Bearer ${expiredToken}`;

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertUnauthorizedWithTokenClearing();
      });

      it("should return unauthorized and clear both tokens when an invalid refresh token is provided", () => {
         const invalidToken = jwt.sign(TEST_USER_PAYLOAD, "wrong-secret");
         mockReq.headers.authorization = `Bearer ${invalidToken}`;

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertUnauthorizedWithTokenClearing();
      });

      it("should authenticate a valid refresh token very close to expiration", () => {
         const tokenExpiringSoon = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "5s" });
         mockReq.headers.authorization = `Bearer ${tokenExpiringSoon}`;

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertSuccessfulRefreshAuthentication();
      });

      it("should eventually have access token expiration greater than refresh token expiration", async() => {
         const secondsUntilExpire = 1;
         const tokens = configureToken(mockRes as Response, TEST_USER_ID, secondsUntilExpire);

         const refreshToken = tokens.refresh_token;
         const accessToken = tokens.access_token;

         await assertTokenExpirationRelationship(refreshToken, accessToken, secondsUntilExpire);
      });
   });
});