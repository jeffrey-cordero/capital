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
import { TEST_SECRET, TEST_USER_ID, TEST_USER_PAYLOAD } from "@/tests/utils/tokens";

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
    * Asserts that both access and refresh tokens are cleared from the mock cookies object
    */
   const assertTokensCleared = () => {
      // Assert `clearCookie` was called for both tokens
      expect(mockRes.clearCookie).toHaveBeenNthCalledWith(1, "access_token", expect.objectContaining({
         httpOnly: true,
         sameSite: "none",
         secure: true
      }));
      expect(mockRes.clearCookie).toHaveBeenNthCalledWith(2, "refresh_token", expect.objectContaining({
         httpOnly: true,
         sameSite: "none",
         secure: true,
         path: "/api/v1/authentication/refresh"
      }));

      // Assert the mock `cookies` object is empty
      expect(Object.keys(mockRes.cookies)).toHaveLength(0);
   };

   /**
    * Arranges and asserts unexpected error handling for a middleware function
    *
    * @param {RequestHandler} middleware - The middleware function to test
    * @param {number} expectedStatus - The expected status code
    * @param {string} cookieName - The name of the cookie to test, defaults to 'access_token'
    */
   const assertErrorHandling = (middleware: RequestHandler, expectedStatus: number, cookieName: string = "access_token") => {
      // Arrange a mock error during `jwt.verify` invocation
      const mockError = new Error("Unexpected error");
      mockError.stack = "Error: Unexpected error\n    at someFunction";

      jest.spyOn(jwt, "verify").mockImplementation(() => {
         throw mockError;
      });

      // Arrange a valid token payload for the middleware function
      const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
      mockReq.cookies = { [cookieName]: validToken };

      // Act
      callMiddleware(middleware);

      // Assert the error handling functionality of the middleware function
      expect(logger.error).toHaveBeenCalledWith(mockError.stack);
      expect(mockRes.clearCookie).not.toHaveBeenCalled();
      assertResponseStatus(expectedStatus);

      // Restore the original `jwt.verify` functionality
      jest.spyOn(jwt, "verify").mockRestore();
   };

   /**
    * Arranges and asserts missing `SESSION_SECRET` error handling for a middleware function
    *
    * @param {Function} middlewareFunction - The middleware function to test
    * @param {number} expectedStatus - The expected status code
    * @param {string} cookieName - The name of the cookie to test, defaults to 'access_token'
    */
   const assertMissingSessionSecret = (middlewareFunction: any, expectedStatus: number, cookieName: string = "access_token") => {
      delete process.env.SESSION_SECRET;

      // Call the middleware function with a valid token payload
      const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
      mockReq.cookies = { [cookieName]: validToken };
      callMiddleware(middlewareFunction);

      // Assert the error handling functionality of the middleware function
      assertTokensCleared();
      assertResponseStatus(expectedStatus);
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

      // Assert the `user_id` is present
      expect(decoded).toMatchObject({ user_id: TEST_USER_ID });

      // Assert the expiration time is present
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe("number");

      // Assert the token is not expired after converting the current time to seconds since epoch
      const currentTime = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThan(currentTime);

      // Assert the token has an appropriate expiration time
      if (customExpirationSeconds !== undefined) {
         const expectedExpiration = currentTime + customExpirationSeconds;
         expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiration);
      } else {
         // Assert the expiration time against type-based expectations
         const expectedExpiration = currentTime + (tokenType === "access_token" ? TOKEN_EXPIRATIONS.ACCESS_TOKEN : TOKEN_EXPIRATIONS.REFRESH_TOKEN) / 1000;

         // Assert the expiration time with a small margin of error
         expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiration - 2);
         expect(decoded.exp).toBeLessThanOrEqual(expectedExpiration + 2);
      }

      return decoded;
   };

   /**
    * Asserts token cookie structure and properties
    *
    * @param {"access_token" | "refresh_token"} tokenType - The type of token to validate
    * @param {boolean} exists - Whether the token should exist
    */
   const assertTokenStructure = (tokenType: "access_token" | "refresh_token", exists: boolean) => {
      const token = mockRes.cookies[tokenType];

      if (exists) {
         // Assert the token is defined
         expect(token).toBeDefined();

         // Assert all token properties match the expected structure
         expect(token).toMatchObject({
            value: expect.any(String),
            options: expect.objectContaining({
               httpOnly: true,
               sameSite: "none",
               secure: true,
               maxAge: TOKEN_EXPIRATIONS.REFRESH_TOKEN
            })
         });

         // Assert the path is set explicitly for refresh token
         if (tokenType === "refresh_token") {
            expect(token.options).toMatchObject({
               path: "/api/v1/authentication/refresh"
            });
         }
      } else {
         expect(token).toBeUndefined();
      }
   };

   /**
    * Asserts both access and refresh tokens are properly configured
    */
   const assertTokenConfiguration = () => {
      // Assert the mock cookies object has both authentication token cookies
      expect(Object.keys(mockRes.cookies)).toHaveLength(2);
      assertTokenStructure("refresh_token", true);
      assertTokenStructure("access_token", true);

      // Assert both JWT payloads are valid
      const accessToken = mockRes.cookies["access_token"]!.value;
      assertAndDecodeToken(accessToken, "access_token");

      const refreshToken = mockRes.cookies["refresh_token"]!.value;
      assertAndDecodeToken(refreshToken, "refresh_token");
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
      // Assert successful authentication
      assertSuccessfulAuthentication();

      // Assert refresh token expiration is attached to the mock `res.locals` as a Date object
      expect(mockRes.locals.refresh_token_expiration).toBeDefined();
      expect(mockRes.locals.refresh_token_expiration).toBeInstanceOf(Date);
   };

   beforeEach(() => {
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      process.env.SESSION_SECRET = TEST_SECRET;
      jest.clearAllMocks();
   });

   describe("Token Configuration", () => {
      it("should set both access_token and refresh_token cookies", () => {
         configureToken(mockRes as Response, TEST_USER_ID);

         assertTokenConfiguration();
      });

      it("should use default refresh token expiration when secondsUntilExpire is not provided", () => {
         configureToken(mockRes as Response, TEST_USER_ID);

         const refreshToken = mockRes.cookies["refresh_token"]!.value;
         assertAndDecodeToken(refreshToken, "refresh_token");
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
         mockReq.cookies = { "access_token": validToken };

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertSuccessfulAuthentication();
      });

      it("should return unauthorized when access token is missing and authentication required", () => {
         mockReq.cookies = {};

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertResponseStatus(HTTP_STATUS.UNAUTHORIZED);
      });

      it("should return unauthorized with refreshable flag for expired access token", () => {
         const expiredToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "-1h" });
         mockReq.cookies = { "access_token": expiredToken };

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertUnauthorizedWithRefreshable();
      });

      it("should return forbidden for invalid JWT signature and clear the invalid access token", () => {
         const invalidToken = jwt.sign(TEST_USER_PAYLOAD, "invalid-secret");
         mockReq.cookies = { "access_token": invalidToken };

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertForbiddenResponse();
      });

      it("should return forbidden for malformed JWT and clear the malformed token", () => {
         mockReq.cookies = { "access_token": "not-a-valid-jwt" };

         const middleware = authenticateToken(true);
         callMiddleware(middleware);

         assertForbiddenResponse();
      });

      it("should return forbidden when user_id is missing from access token payload and clear the invalid access token", () => {
         const missingUserIdToken = jwt.sign({ some_field: "value" }, TEST_SECRET);
         mockReq.cookies = { "access_token": missingUserIdToken };

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
         mockReq.cookies = { "access_token": validAccessToken };

         const middleware = authenticateToken(false);
         callMiddleware(middleware);

         assertResponseStatus(HTTP_STATUS.REDIRECT);
      });

      it("should handle unexpected errors during access token verification", () => {
         assertErrorHandling(authenticateToken(true), HTTP_STATUS.FORBIDDEN, "access_token");
      });

      it("should handle missing SESSION_SECRET environment variable for access token", () => {
         assertMissingSessionSecret(authenticateToken(true), HTTP_STATUS.FORBIDDEN, "access_token");
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
         mockReq.cookies = { "refresh_token": validRefreshToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertSuccessfulRefreshAuthentication();
      });

      it("should return unauthorized and clear both tokens when the refresh token is missing", () => {
         mockReq.cookies = {};

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertTokensCleared();
         assertResponseStatus(HTTP_STATUS.UNAUTHORIZED);
      });

      it("should return unauthorized and clear both access and refresh tokens for an expired refresh token", () => {
         const expiredToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "-1d" });
         mockReq.cookies = { "refresh_token": expiredToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertUnauthorizedWithTokenClearing();
      });

      it("should return unauthorized and clear both tokens when an invalid refresh token is provided", () => {
         const invalidToken = jwt.sign(TEST_USER_PAYLOAD, "wrong-secret");
         mockReq.cookies = { "refresh_token": invalidToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertUnauthorizedWithTokenClearing();
      });

      it("should return forbidden when user_id is missing from the refresh token payload", () => {
         const missingUserIdToken = jwt.sign({ some_field: "value" }, TEST_SECRET);
         mockReq.cookies = { "refresh_token": missingUserIdToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertResponseStatus(HTTP_STATUS.FORBIDDEN);
      });

      it("should handle unexpected errors during refresh token verification and clear both tokens", () => {
         assertErrorHandling(authenticateRefreshToken(), HTTP_STATUS.FORBIDDEN, "refresh_token");
      });

      it("should handle missing SESSION_SECRET environment variable for the refresh token", () => {
         assertMissingSessionSecret(authenticateRefreshToken(), HTTP_STATUS.UNAUTHORIZED, "refresh_token");
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
         // Assert the tokens are different due to different iat timestamps
         expect(firstAccessToken).not.toBe(secondAccessToken);
         expect(firstRefreshToken).not.toBe(secondRefreshToken);

         // Assert the new tokens are properly configured
         assertTokenConfiguration();
      };

      it("should issue new access and refresh tokens with the same user_id when refreshing", async() => {
         // Arrange the initial access and refresh tokens
         configureToken(mockRes as Response, TEST_USER_ID);

         const firstAccessToken = mockRes.cookies["access_token"]!.value;
         const firstRefreshToken = mockRes.cookies["refresh_token"]!.value;

         // Assert the initial tokens are properly configured
         assertTokenConfiguration();

         // Arrange the mock response cookies to simulate a local logout action
         mockRes.cookies = {};
         await new Promise(resolve => setTimeout(resolve, 1100));

         // Act
         configureToken(mockRes as Response, TEST_USER_ID);

         // Assert token rotation
         const secondAccessToken = mockRes.cookies["access_token"]!.value;
         const secondRefreshToken = mockRes.cookies["refresh_token"]!.value;
         assertTokenRotation(firstAccessToken, firstRefreshToken, secondAccessToken, secondRefreshToken);
      });

      it("should preserve original refresh token expiration time across multiple refresh calls", async() => {
         /**
          * Asserts refresh token expiration preservation across multiple refresh calls
          *
          * @param {string} originalRefreshToken - The original refresh token
          * @param {number} originalExpirationTime - The original expiration time
          * @param {number} secondsUntilExpire - Seconds until expiration
          */
         const assertRefreshTokenExpirationPreservation = (originalRefreshToken: string, originalExpirationTime: number, secondsUntilExpire: number): void => {
            // Arrange the refresh token authentication middleware setting the expiration time in res.locals
            mockReq.cookies = { "refresh_token": originalRefreshToken };
            callMiddleware(authenticateRefreshToken());

            // Assert the middleware set the expiration time in res.locals
            assertSuccessfulRefreshAuthentication();

            // Arrange the refresh by configuring tokens again with the same expiration time as the original
            configureToken(mockRes as any, TEST_USER_ID, secondsUntilExpire);

            const newRefreshToken = mockRes.cookies["refresh_token"]!.value;
            const newDecoded = assertAndDecodeToken(newRefreshToken, "refresh_token", secondsUntilExpire);

            // Assert the new refresh token should have the same expiration time as the original refresh token
            expect(Math.abs(newDecoded.exp! - originalExpirationTime)).toEqual(0);
         };

         // Arrange the initial refresh token to expire in 2 minutes
         configureToken(mockRes as Response, TEST_USER_ID);

         // Assert the initial access and refresh tokens are properly configured
         assertTokenConfiguration();

         // Arrange the original refresh token and assert its expiration time
         const originalRefreshToken = mockRes.cookies["refresh_token"]!.value;
         const originalDecoded = assertAndDecodeToken(originalRefreshToken, "refresh_token");
         const originalExpirationTime = originalDecoded.exp!;

         // Arrange the seconds until expiration
         const secondsUntilExpire = Math.max(0, Math.floor((originalExpirationTime - Date.now()) / 1000));

         // Assert refresh token expiration preservation
         assertRefreshTokenExpirationPreservation(originalRefreshToken, originalExpirationTime, secondsUntilExpire);
      });
   });

   describe("Refresh Token Expiration", () => {
      /**
       * Asserts successful authentication with refresh token expiration
       */
      const assertSuccessfulRefreshAuthentication = (): void => {
         // Assert successful authentication is attached to res.locals as the user_id and next method is called
         assertSuccessfulAuthentication();

         // Assert refresh token expiration is attached to res.locals as a Date object
         expect(mockRes.locals.refresh_token_expiration).toBeDefined();
         expect(mockRes.locals.refresh_token_expiration).toBeInstanceOf(Date);
      };

      /**
       * Asserts unauthorized response with token clearing
       */
      const assertUnauthorizedWithTokenClearing = (): void => {
         // Assert both access and refresh tokens are cleared
         expect(mockRes.clearCookie).toHaveBeenCalledWith("access_token", expect.any(Object));
         expect(mockRes.clearCookie).toHaveBeenCalledWith("refresh_token", expect.any(Object));

         // Assert the cookies object is empty
         expect(Object.keys(mockRes.cookies)).toHaveLength(0);

         // Assert an unauthorized response status and next call is not called
         assertResponseStatus(HTTP_STATUS.UNAUTHORIZED);
      };

      /**
       * Asserts token expiration relationship and expired token behavior
       *
       * @param {string} refreshToken - The refresh token
       * @param {string} accessToken - The access token
       * @param {number} secondsUntilExpire - Seconds until expiration
       */
      const assertTokenExpirationRelationship = async(refreshToken: string, accessToken: string, secondsUntilExpire: number): Promise<void> => {
         const refreshDecoded = assertAndDecodeToken(refreshToken, "refresh_token", secondsUntilExpire);
         const accessDecoded = assertAndDecodeToken(accessToken, "access_token");

         // Initially the access token should expire before the refresh token
         expect(accessDecoded.exp!).toBeGreaterThan(refreshDecoded.exp!);

         // Wait for refresh token to expire
         await new Promise(resolve => setTimeout(resolve, 2000));
         const currentTime = Math.floor(Date.now() / 1000);
         expect(currentTime).toBeGreaterThan(refreshDecoded.exp!);

         // Verify the refresh token is expired when attempting to refresh the tokens
         mockReq.cookies = { "refresh_token": refreshToken };
         callMiddleware(authenticateRefreshToken());

         assertUnauthorizedWithTokenClearing();
      };

      it("should authenticate a valid refresh token and set refresh_token_expiration in res.locals", () => {
         const validToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "7d" });
         mockReq.cookies = { "refresh_token": validToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertSuccessfulRefreshAuthentication();
      });

      it("should return unauthorized and clear both tokens when an expired refresh token is provided", () => {
         const expiredToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "-1d" });
         mockReq.cookies = { "refresh_token": expiredToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertUnauthorizedWithTokenClearing();
      });

      it("should return unauthorized and clear both tokens when an invalid refresh token is provided", () => {
         const invalidToken = jwt.sign(TEST_USER_PAYLOAD, "wrong-secret");
         mockReq.cookies = { "refresh_token": invalidToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertUnauthorizedWithTokenClearing();
      });

      it("should authenticate a valid refresh token very close to expiration", () => {
         // Create token expiring in 5 seconds
         const tokenExpiringSoon = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "5s" });
         mockReq.cookies = { "refresh_token": tokenExpiringSoon };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware);

         assertSuccessfulRefreshAuthentication();
      });

      it("should eventually have access token expiration greater than refresh token expiration", async() => {
         // Create refresh token with a short expiration
         const secondsUntilExpire = 1;
         configureToken(mockRes as Response, TEST_USER_ID, secondsUntilExpire);

         const refreshToken = mockRes.cookies["refresh_token"]!.value;
         const accessToken = mockRes.cookies["access_token"]!.value;

         // Verify token expiration relationship and expired token behavior
         await assertTokenExpirationRelationship(refreshToken, accessToken, secondsUntilExpire);
      });
   });
});