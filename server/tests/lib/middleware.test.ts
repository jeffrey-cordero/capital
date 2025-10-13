import { HTTP_STATUS } from "capital/server";
import { Response } from "express";
import jwt from "jsonwebtoken";

import { authenticateRefreshToken, authenticateToken, clearToken, configureToken } from "@/lib/middleware";
import { TEST_SECRET, TEST_USER_ID } from "@/tests/constants/tokens";
import { createMockMiddleware, createMockResponse, MockResponse } from "@/tests/utils/api";

/**
 * Set test secret before running tests
 */
beforeAll(() => {
   process.env.SESSION_SECRET = TEST_SECRET;
});

/**
 * Mock the error logger to minimize the output
 */
jest.mock("@/lib/logger", () => ({
   logger: {
      error: jest.fn()
   }
}));

/**
 * Helper function to test unexpected error handling
 *
 * @param {Function} middlewareFunction - The middleware function to test
 * @param {number} expectedStatus - The expected status code
 * @param {string} cookieName - The name of the cookie to test, defaults to 'access_token'
 */
function testUnexpectedErrorHandling(middlewareFunction: any, expectedStatus: number, cookieName: string = "access_token") {
   const mockError = new Error("Unexpected error");
   mockError.stack = "Error: Unexpected error\n    at someFunction";

   const verifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw mockError;
   });

   const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
   const { req, res, next } = createMockMiddleware({ [cookieName]: validToken });
   middlewareFunction(req, res, next);

   expect(res.status).toHaveBeenCalledWith(expectedStatus);
   expect(next).not.toHaveBeenCalled();

   // Restore original jwt.verify
   verifySpy.mockRestore();
}

/**
 * Helper function to test missing SESSION_SECRET
 *
 * @param {Function} middlewareFunction - The middleware function to test
 * @param {number} expectedStatus - The expected status code
 * @param {string} cookieName - The name of the cookie to test, defaults to 'access_token'
 */
function testMissingSessionSecret(middlewareFunction: any, expectedStatus: number, cookieName: string = "access_token") {
   delete process.env.SESSION_SECRET;

   const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
   const { req, res, next } = createMockMiddleware({ [cookieName]: validToken });

   middlewareFunction(req, res, next);

   expect(res.status).toHaveBeenCalledWith(expectedStatus);
   expect(next).not.toHaveBeenCalled();

   // Restore original secret
   process.env.SESSION_SECRET = TEST_SECRET;
}

describe("Middleware Functions", () => {
   describe("configureToken", () => {
      it("should set both access_token and refresh_token cookies", () => {
         // Arrange
         const res = createMockResponse();

         // Act
         configureToken(res as Response, TEST_USER_ID);

         // Assert
         expect(res.cookieData).toHaveLength(2);

         // Check access_token
         const accessToken = res.cookieData.find(c => c.name === "access_token");
         expect(accessToken).toBeDefined();
         expect(accessToken?.options.httpOnly).toBe(true);
         expect(accessToken?.options.secure).toBe(true);
         expect(accessToken?.options.sameSite).toBe("none");

         // Verify access token contains user_id
         const decodedAccess = jwt.verify(accessToken!.value, TEST_SECRET) as any;
         expect(decodedAccess.user_id).toBe(TEST_USER_ID);

         // Check refresh_token
         const refreshToken = res.cookieData.find(c => c.name === "refresh_token");
         expect(refreshToken).toBeDefined();
         expect(refreshToken?.options.httpOnly).toBe(true);
         expect(refreshToken?.options.secure).toBe(true);
         expect(refreshToken?.options.path).toBe("/api/v1/authentication/refresh");

         // Verify refresh token contains user_id
         const decodedRefresh = jwt.verify(refreshToken!.value, TEST_SECRET) as any;
         expect(decodedRefresh.user_id).toBe(TEST_USER_ID);
      });

      it("should use default refresh token expiration when secondsUntilExpire is not provided", () => {
         // Arrange
         const res = createMockResponse();

         // Act
         configureToken(res as Response, TEST_USER_ID);

         // Assert
         const refreshToken = res.cookieData.find(c => c.name === "refresh_token");
         expect(refreshToken).toBeDefined();

         // Verify refresh token uses default 7d expiration
         const decodedRefresh = jwt.verify(refreshToken!.value, TEST_SECRET) as any;
         expect(decodedRefresh.user_id).toBe(TEST_USER_ID);
         expect(decodedRefresh.exp).toBeGreaterThan(Date.now() / 1000 + 6 * 24 * 60 * 60); // More than 6 days
      });

      it("should handle missing SESSION_SECRET environment variable", () => {
         // Arrange
         delete process.env.SESSION_SECRET;
         const res = createMockResponse();

         // Act & Assert
         // This should throw an error since JWT requires a secret
         expect(() => configureToken(res as Response, TEST_USER_ID)).toThrow("secretOrPrivateKey must have a value");

         // Restore original secret
         process.env.SESSION_SECRET = TEST_SECRET;
      });
   });

   describe("clearToken", () => {
      it("should clear both access_token and refresh_token cookies", () => {
         // Arrange
         const res = createMockResponse();

         // Act
         clearToken(res as Response);

         // Assert
         expect(res.clearCookieData).toHaveLength(2);

         // Check access_token cleared
         const accessClear = res.clearCookieData.find(c => c.name === "access_token");
         expect(accessClear).toBeDefined();
         expect(accessClear?.options.httpOnly).toBe(true);

         // Check refresh_token cleared
         const refreshClear = res.clearCookieData.find(c => c.name === "refresh_token");
         expect(refreshClear).toBeDefined();
         expect(refreshClear?.options.path).toBe("/api/v1/authentication/refresh");
      });
   });

   describe("authenticateToken", () => {
      it("should authenticate valid access token and attach user_id", () => {
         // Arrange
         const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "1h" });
         const { req, res, next } = createMockMiddleware({ access_token: validToken });

         const middleware = authenticateToken(true);

         // Act
         middleware(req, res, next);

         // Assert
         expect(res.locals.user_id).toBe(TEST_USER_ID);
         expect(next).toHaveBeenCalled();
         expect(res.status).not.toHaveBeenCalled();
      });

      it("should return unauthorized when token is missing and authentication required", () => {
         // Arrange
         const { req, res, next } = createMockMiddleware();

         const middleware = authenticateToken(true);

         // Act
         middleware(req, res, next);

         // Assert
         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         expect(next).not.toHaveBeenCalled();
      });

      it("should return unauthorized with refreshable flag for expired token", () => {
         // Arrange
         const expiredToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "-1h" });
         const { req, res, next } = createMockMiddleware({ access_token: expiredToken });

         const middleware = authenticateToken(true);

         // Act
         middleware(req, res, next);

         // Assert
         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         expect(res.json).toHaveBeenCalledWith({ data: { refreshable: true } });
         // Not clearing cookie on expired token as it's handled by the client refresh flow
         expect(next).not.toHaveBeenCalled();
      });

      it("should return forbidden for invalid JWT signature", () => {
         // Arrange
         const invalidToken = jwt.sign({ user_id: TEST_USER_ID }, "wrong-secret");
         const { req, res, next } = createMockMiddleware({ access_token: invalidToken });

         const middleware = authenticateToken(true);

         // Act
         middleware(req, res, next);

         // Assert
         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
         expect(res.clearCookie).toHaveBeenCalledWith("access_token");
         expect(next).not.toHaveBeenCalled();
      });

      it("should return forbidden for malformed JWT", () => {
         // Arrange
         const { req, res, next } = createMockMiddleware({ access_token: "not-a-valid-jwt" });

         const middleware = authenticateToken(true);

         // Act
         middleware(req, res, next);

         // Assert
         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
         expect(res.clearCookie).toHaveBeenCalledWith("access_token");
         expect(next).not.toHaveBeenCalled();
      });

      it("should return forbidden when user_id is missing from JWT payload", () => {
         // Arrange
         const tokenWithoutUserId = jwt.sign({ some_field: "value" }, TEST_SECRET);
         const { req, res, next } = createMockMiddleware({ access_token: tokenWithoutUserId });

         const middleware = authenticateToken(true);

         // Act
         middleware(req, res, next);

         // Assert
         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
         expect(next).not.toHaveBeenCalled();
      });

      it("should call next when token not required and not present", () => {
         const { req, res, next } = createMockMiddleware();

         const middleware = authenticateToken(false);
         middleware(req, res, next);

         expect(next).toHaveBeenCalled();
         expect(res.status).not.toHaveBeenCalled();
      });

      it("should return redirect when token present but not required", () => {
         const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
         const { req, res, next } = createMockMiddleware({ access_token: validToken });

         const middleware = authenticateToken(false);
         middleware(req, res, next);

         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.REDIRECT);
         expect(next).not.toHaveBeenCalled();
      });

      it("should handle unexpected errors during token verification", () => {
         testUnexpectedErrorHandling(authenticateToken(true), HTTP_STATUS.FORBIDDEN);
      });

      it("should handle missing SESSION_SECRET environment variable", () => {
         testMissingSessionSecret(authenticateToken(true), HTTP_STATUS.FORBIDDEN);
      });
   });

   describe("authenticateRefreshToken", () => {
      it("should authenticate valid refresh token and attach user_id", () => {
         const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "7d" });
         const { req, res, next } = createMockMiddleware({ refresh_token: validToken });

         const middleware = authenticateRefreshToken();
         middleware(req, res, next);

         expect(res.locals.user_id).toBe(TEST_USER_ID);
         expect(next).toHaveBeenCalled();
         expect(res.status).not.toHaveBeenCalled();
      });

      it("should return unauthorized when refresh token is missing", () => {
         const { req, res, next } = createMockMiddleware();

         const middleware = authenticateRefreshToken();
         middleware(req, res, next);

         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         expect(next).not.toHaveBeenCalled();
      });

      it("should return unauthorized and clear tokens for expired refresh token", () => {
         const expiredToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "-1d" });
         const { req, res, next } = createMockMiddleware({ refresh_token: expiredToken });

         const middleware = authenticateRefreshToken();
         middleware(req, res, next);

         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         expect((res as MockResponse).clearCookieData).toHaveLength(2);
         expect(next).not.toHaveBeenCalled();
      });

      it("should return unauthorized and clear tokens for invalid refresh token", () => {
         const invalidToken = jwt.sign({ user_id: TEST_USER_ID }, "wrong-secret");
         const { req, res, next } = createMockMiddleware({ refresh_token: invalidToken });

         const middleware = authenticateRefreshToken();
         middleware(req, res, next);

         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         expect((res as MockResponse).clearCookieData).toHaveLength(2);
         expect(next).not.toHaveBeenCalled();
      });

      it("should return forbidden when user_id is missing from refresh token payload", () => {
         const tokenWithoutUserId = jwt.sign({ some_field: "value" }, TEST_SECRET);
         const { req, res, next } = createMockMiddleware({ refresh_token: tokenWithoutUserId });

         const middleware = authenticateRefreshToken();
         middleware(req, res, next);

         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
         expect(next).not.toHaveBeenCalled();
      });

      it("should handle unexpected errors during refresh token verification", () => {
         testUnexpectedErrorHandling(authenticateRefreshToken(), HTTP_STATUS.FORBIDDEN, "refresh_token");
      });

      it("should handle missing SESSION_SECRET environment variable", () => {
         testMissingSessionSecret(authenticateRefreshToken(), HTTP_STATUS.UNAUTHORIZED, "refresh_token");
      });
   });

   describe("Token Rotation on Refresh", () => {
      it("should issue new tokens with same user_id when refreshing", async() => {
         const res = createMockResponse();

         // First, configure initial tokens
         configureToken(res as Response, TEST_USER_ID);
         const firstAccessToken = res.cookieData.find(c => c.name === "access_token")!.value;
         const firstRefreshToken = res.cookieData.find(c => c.name === "refresh_token")!.value;

         // Clear the mock data
         res.cookieData = [];

         // Wait a small amount to ensure different iat timestamp
         await new Promise(resolve => setTimeout(resolve, 1100));

         // Simulate refresh by configuring tokens again
         configureToken(res as Response, TEST_USER_ID);
         const secondAccessToken = res.cookieData.find(c => c.name === "access_token")!.value;
         const secondRefreshToken = res.cookieData.find(c => c.name === "refresh_token")!.value;

         // Tokens should be different (rotated) due to different iat
         expect(firstAccessToken).not.toBe(secondAccessToken);
         expect(firstRefreshToken).not.toBe(secondRefreshToken);

         // But they should contain the same user_id
         const decoded1 = jwt.verify(secondAccessToken, TEST_SECRET) as any;
         const decoded2 = jwt.verify(secondRefreshToken, TEST_SECRET) as any;
         expect(decoded1.user_id).toBe(TEST_USER_ID);
         expect(decoded2.user_id).toBe(TEST_USER_ID);
      });

      it("should preserve original refresh token expiration time across multiple refreshes", async() => {
         const res = createMockResponse();

         // Create initial refresh token with short expiration (2 minutes)
         const shortExpirationSeconds = 120; // 2 minutes
         configureToken(res as Response, TEST_USER_ID, shortExpirationSeconds);

         // Get the original refresh token and its expiration
         const originalRefreshToken = res.cookieData.find(c => c.name === "refresh_token")!.value;
         const originalDecoded = jwt.verify(originalRefreshToken, TEST_SECRET) as any;
         const originalExpiration = originalDecoded.exp;

         // Simulate middleware setting the expiration in locals
         res.locals.refresh_token_expiration = new Date(originalExpiration * 1000);

         // Clear the mock data
         res.cookieData = [];

         // Wait a small amount
         await new Promise(resolve => setTimeout(resolve, 100));

         // Simulate refresh by configuring tokens again with preserved expiration
         const secondsUntilExpire = Math.floor((originalExpiration * 1000 - Date.now()) / 1000);
         configureToken(res as Response, TEST_USER_ID, secondsUntilExpire);

         const newRefreshToken = res.cookieData.find(c => c.name === "refresh_token")!.value;
         const newDecoded = jwt.verify(newRefreshToken, TEST_SECRET) as any;

         // The new refresh token should have the same expiration time as the original
         // Allow for 1 second difference due to timing of token creation
         expect(Math.abs(newDecoded.exp - originalExpiration)).toBeLessThanOrEqual(1);
      });
   });

   describe("Refresh Token Expiration Handling", () => {
      it("should set refresh_token_expiration in res.locals when authenticating refresh token", () => {
         const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "7d" });
         const { req, res, next } = createMockMiddleware({ refresh_token: validToken });

         const middleware = authenticateRefreshToken();
         middleware(req, res, next);

         expect(res.locals.user_id).toBe(TEST_USER_ID);
         expect(res.locals.refresh_token_expiration).toBeDefined();
         expect(res.locals.refresh_token_expiration).toBeInstanceOf(Date);
         expect(next).toHaveBeenCalled();
      });

      it("should call clearToken when refresh token is expired", () => {
         const expiredToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "-1d" });
         const { req, res, next } = createMockMiddleware({ refresh_token: expiredToken });

         const middleware = authenticateRefreshToken();
         middleware(req, res, next);

         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         expect((res as MockResponse).clearCookieData).toHaveLength(2); // Both tokens cleared
         expect((res as MockResponse).clearCookieData.find(c => c.name === "access_token")).toBeDefined();
         expect((res as MockResponse).clearCookieData.find(c => c.name === "refresh_token")).toBeDefined();
         expect(next).not.toHaveBeenCalled();
      });

      it("should call clearToken when refresh token is invalid", () => {
         const invalidToken = jwt.sign({ user_id: TEST_USER_ID }, "wrong-secret");
         const { req, res, next } = createMockMiddleware({ refresh_token: invalidToken });

         const middleware = authenticateRefreshToken();
         middleware(req, res, next);

         expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         expect((res as MockResponse).clearCookieData).toHaveLength(2); // Both tokens cleared
         expect(next).not.toHaveBeenCalled();
      });

      it("should handle refresh token very close to expiration", () => {
         // Create token expiring in 1 second
         const tokenExpiringSoon = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "1s" });
         const { req, res, next } = createMockMiddleware({ refresh_token: tokenExpiringSoon });

         const middleware = authenticateRefreshToken();
         middleware(req, res, next);

         // Should still work if token is valid (not expired yet)
         expect(res.locals.user_id).toBe(TEST_USER_ID);
         expect(res.locals.refresh_token_expiration).toBeDefined();
         expect(next).toHaveBeenCalled();
      });

      it("should eventually have access token expiration greater than refresh token expiration", async() => {
         const res = createMockResponse();

         // Create refresh token with very short expiration (5 seconds)
         const shortExpirationSeconds = 5;
         configureToken(res as Response, TEST_USER_ID, shortExpirationSeconds);

         const refreshToken = res.cookieData.find(c => c.name === "refresh_token")!.value;
         const accessToken = res.cookieData.find(c => c.name === "access_token")!.value;

         const refreshDecoded = jwt.verify(refreshToken, TEST_SECRET) as any;
         const accessDecoded = jwt.verify(accessToken, TEST_SECRET) as any;

         // Initially, access token should expire before refresh token (access: 1 hour, refresh: 5 seconds)
         expect(accessDecoded.exp).toBeGreaterThan(refreshDecoded.exp);

         // Wait for refresh token to expire
         await new Promise(resolve => setTimeout(resolve, 6000));

         // Now refresh token should be expired
         const currentTime = Math.floor(Date.now() / 1000);
         expect(currentTime).toBeGreaterThan(refreshDecoded.exp);
      });
   });
});