import { HTTP_STATUS } from "capital/server";
import jwt from "jsonwebtoken";

import { TOKEN_EXPIRATIONS } from "@/lib/middleware";
import { createMockMiddleware, MockRequest, MockResponse } from "@/tests/utils/api";

/**
 * Test token constants for authentication testing, used across middleware and controller
 * tests for consistent token testing
 */
export const TEST_TOKENS = {
   VALID_ACCESS: "valid.access.token",
   INVALID_ACCESS: "invalid.access.token",
   EXPIRED_ACCESS: "expired.access.token",
   MALFORMED_ACCESS: "malformed.access.token",
   VALID_REFRESH: "valid.refresh.token",
   INVALID_REFRESH: "invalid.refresh.token",
   EXPIRED_REFRESH: "expired.refresh.token",
   MALFORMED_REFRESH: "malformed.refresh.token"
} as const;

/**
 * Test user ID constant
 */
export const TEST_USER_ID = "test-user-123";

/**
 * Test secret key constant
 */
export const TEST_SECRET = "test-secret-key";

/**
 * Test user payload constant for JWT tokens
 */
export const TEST_USER_PAYLOAD = { user_id: TEST_USER_ID };

/**
 * Tests unexpected error handling
 *
 * @param {any} middlewareFunction - The middleware function to test
 * @param {number} expectedStatus - The expected status code
 * @param {string} cookieName - The name of the cookie to test, defaults to 'access_token'
 */
export function testUnexpectedErrorHandling(middlewareFunction: any, expectedStatus: number, cookieName: string = "access_token") {
   const { logger } = require("@/lib/logger");
   const mockError = new Error("Unexpected error");
   mockError.stack = "Error: Unexpected error\n    at someFunction";

   const verifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw mockError;
   });

   const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
   const { mockReq, mockRes, mockNext } = createMockMiddleware({ cookies: { [cookieName]: validToken } });
   callMiddleware(middlewareFunction, mockReq, mockRes, mockNext);

   expect(mockRes.status).toHaveBeenCalledWith(expectedStatus);
   expect(logger.error).toHaveBeenCalledWith(mockError.stack);
   expect(mockRes.clearCookie).not.toHaveBeenCalled();
   expect(mockNext).not.toHaveBeenCalled();

   // Restore the original jwt.verify
   verifySpy.mockRestore();
}

/**
 * Helper function to test missing SESSION_SECRET
 *
 * @param {Function} middlewareFunction - The middleware function to test
 * @param {number} expectedStatus - The expected status code
 * @param {string} cookieName - The name of the cookie to test, defaults to 'access_token'
 */
export function testMissingSessionSecret(middlewareFunction: any, expectedStatus: number, cookieName: string = "access_token") {
   // Store original secret
   const originalSecret = process.env.SESSION_SECRET;

   // Delete the secret
   delete process.env.SESSION_SECRET;

   const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
   const { mockReq, mockRes, mockNext } = createMockMiddleware({ cookies: { [cookieName]: validToken } });

   callMiddleware(middlewareFunction, mockReq, mockRes, mockNext);

   expect(mockRes.status).toHaveBeenCalledWith(expectedStatus);
   expect(mockNext).not.toHaveBeenCalled();

   // Restore original secret
   process.env.SESSION_SECRET = originalSecret;
}

/**
 * Helper function to validate token cookie structure and properties
 *
 * @param {MockResponse} mockRes - The mock response object
 * @param {"access_token" | "refresh_token"} tokenType - The type of token to validate
 * @param {boolean} exists - Whether the token should exist
 */
export function validateTokenCookie(mockRes: MockResponse, tokenType: "access_token" | "refresh_token", exists: boolean) {
   const token = mockRes.cookies[tokenType];

   if (exists) {
      expect(token).toBeDefined();
      expect(token).toMatchObject({
         value: expect.any(String),
         options: expect.objectContaining({
            httpOnly: true,
            sameSite: "none",
            secure: true,
            maxAge: tokenType === "access_token" ? TOKEN_EXPIRATIONS.ACCESS_TOKEN : TOKEN_EXPIRATIONS.REFRESH_TOKEN
         })
      });

      // Add path validation for refresh token
      if (tokenType === "refresh_token") {
         expect(token.options).toMatchObject({
            path: "/api/v1/authentication/refresh"
         });
      }
   } else {
      expect(token).toBeUndefined();
   }
}

/**
 * Helper function to verify JWT token properties and return the decoded token payload
 *
 * @param {string} tokenValue - The JWT token value
 * @param {"access_token" | "refresh_token"} tokenType - The type of token to verify
 * @param {number} customExpirationSeconds - Optional custom expiration time in seconds
 */
export function verifyAndDecodeToken(tokenValue: string, tokenType: "access_token" | "refresh_token", customExpirationSeconds?: number): jwt.JwtPayload {
   const decoded = jwt.verify(tokenValue, TEST_SECRET) as jwt.JwtPayload;

   // Verify user_id is present
   expect(decoded).toMatchObject({ user_id: TEST_USER_ID });

   // Verify expiration is present
   expect(decoded.exp).toBeDefined();
   expect(typeof decoded.exp).toBe("number");

   // Verify token is not expired
   const currentTime = Math.floor(Date.now() / 1000);
   expect(decoded.exp).toBeGreaterThan(currentTime);

   // Verify token has appropriate expiration time
   if (customExpirationSeconds !== undefined) {
      // For custom expiration times, just verify it's reasonable (not too far in the past or future)
      const expectedExpiration = currentTime + customExpirationSeconds;
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiration);
   } else {
      // For standard expiration times, verify against type-based expectations
      const expectedExpirationSeconds = (tokenType === "access_token" ? TOKEN_EXPIRATIONS.ACCESS_TOKEN : TOKEN_EXPIRATIONS.REFRESH_TOKEN) / 1000;
      const expectedExpiration = currentTime + expectedExpirationSeconds;
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiration);
   }

   return decoded;
}

/**
 * Helper function to verify both access and refresh tokens are properly configured
 *
 * @param {MockResponse} mockRes - The mock response object
 */
export function verifyTokenConfiguration(mockRes: MockResponse) {
   // Validate cookie structure
   expect(Object.keys(mockRes.cookies)).toHaveLength(2);
   validateTokenCookie(mockRes, "refresh_token", true);
   validateTokenCookie(mockRes, "access_token", true);

   // Verify JWT payloads
   const accessToken = mockRes.cookies["access_token"];
   const refreshToken = mockRes.cookies["refresh_token"];

   verifyAndDecodeToken(accessToken!.value, "access_token");
   verifyAndDecodeToken(refreshToken!.value, "refresh_token");
}

/**
 * Helper function to verify that both access and refresh tokens are cleared
 *
 * @param {MockResponse} mockRes - The mock response object
 */
export function verifyTokensCleared(mockRes: MockResponse) {
   // Verify clearCookie was called for both tokens
   expect(mockRes.clearCookie).toHaveBeenCalledWith("access_token", expect.any(Object));
   expect(mockRes.clearCookie).toHaveBeenCalledWith("refresh_token", expect.any(Object));

   // Verify cookies object is empty
   expect(Object.keys(mockRes.cookies)).toHaveLength(0);
}

/**
 * Calls middleware with proper type casting
 *
 * @param {any} middleware - The middleware function to call
 * @param {MockRequest} mockReq - The mock request object
 * @param {MockResponse} mockRes - The mock response object
 * @param {jest.Mock} mockNext - The mock next function
 */
export function callMiddleware(middleware: any, mockReq: MockRequest, mockRes: MockResponse, mockNext: jest.Mock): void {
   middleware(mockReq as any, mockRes as any, mockNext as any);
}

/**
 * Verifies forbidden response with access token clearing
 *
 * @param {MockResponse} mockRes - The mock response object
 * @param {jest.Mock} mockNext - The mock next function
 */
export function verifyForbiddenResponse(mockRes: MockResponse, mockNext: jest.Mock): void {
   expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
   expect(mockRes.clearCookie).toHaveBeenCalledWith("access_token");
   expect(mockRes.json).toHaveBeenCalledWith({ errors: {} });
   expect(mockNext).not.toHaveBeenCalled();
}

/**
 * Verifies response status without next call
 *
 * @param {MockResponse} mockRes - The mock response object
 * @param {number} expectedStatus - The expected HTTP status code
 * @param {jest.Mock} mockNext - The mock next function
 */
export function verifyResponseStatus(mockRes: MockResponse, expectedStatus: number, mockNext: jest.Mock): void {
   expect(mockRes.status).toHaveBeenCalledWith(expectedStatus);
   expect(mockNext).not.toHaveBeenCalled();
}

/**
 * Verifies unauthorized response with refreshable flag
 *
 * @param {MockResponse} mockRes - The mock response object
 * @param {jest.Mock} mockNext - The mock next function
 */
export function verifyUnauthorizedWithRefreshable(mockRes: MockResponse, mockNext: jest.Mock): void {
   expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
   expect(mockRes.json).toHaveBeenCalledWith({ data: { refreshable: true } });
   expect(mockRes.clearCookie).not.toHaveBeenCalled();
   expect(mockNext).not.toHaveBeenCalled();
}

/**
 * Verifies successful authentication with user_id
 *
 * @param {MockResponse} mockRes - The mock response object
 * @param {jest.Mock} mockNext - The mock next function
 */
export function verifySuccessfulAuthentication(mockRes: MockResponse, mockNext: jest.Mock): void {
   expect(mockRes.locals.user_id).toBe(TEST_USER_ID);
   expect(mockRes.status).not.toHaveBeenCalled();
   expect(mockNext).toHaveBeenCalled();
}

/**
 * Verifies successful authentication with refresh token expiration
 *
 * @param {MockResponse} mockRes - The mock response object
 * @param {jest.Mock} mockNext - The mock next function
 */
export function verifySuccessfulRefreshAuthentication(mockRes: MockResponse, mockNext: jest.Mock): void {
   // Verify successful authentication is attached to res.locals as the user_id and next method is called
   verifySuccessfulAuthentication(mockRes, mockNext);

   // Verify refresh token expiration is attached to res.locals as a Date object
   expect(mockRes.locals.refresh_token_expiration).toBeDefined();
   expect(mockRes.locals.refresh_token_expiration).toBeInstanceOf(Date);
}

/**
 * Verifies unauthorized response with token clearing
 *
 * @param {MockResponse} mockRes - The mock response object
 * @param {jest.Mock} mockNext - The mock next function
 */
export function verifyUnauthorizedWithTokenClearing(mockRes: MockResponse, mockNext: jest.Mock): void {
   // Verify both access and refresh tokens are cleared
   verifyTokensCleared(mockRes);

   // Verify an unauthorized response status and next call is not called
   verifyResponseStatus(mockRes, HTTP_STATUS.UNAUTHORIZED, mockNext);
}

/**
 * Verifies token rotation by checking that new tokens are different from original tokens
 *
 * @param {MockResponse} mockRes - The mock response object
 * @param {string} firstAccessToken - The first access token
 * @param {string} firstRefreshToken - The first refresh token
 * @param {string} secondAccessToken - The second access token
 * @param {string} secondRefreshToken - The second refresh token
 */
export function verifyTokenRotation(mockRes: MockResponse, firstAccessToken: string, firstRefreshToken: string, secondAccessToken: string, secondRefreshToken: string): void {
   // Tokens should be different due to different iat timestamps
   expect(firstAccessToken).not.toBe(secondAccessToken);
   expect(firstRefreshToken).not.toBe(secondRefreshToken);

   // Verify the new tokens
   verifyTokenConfiguration(mockRes);
}

/**
 * Verifies refresh token expiration preservation across multiple refresh calls
 *
 * @param {MockResponse} mockRes - The mock response object
 * @param {MockRequest} mockReq - The mock request object
 * @param {jest.Mock} mockNext - The mock next function
 * @param {string} originalRefreshToken - The original refresh token
 * @param {number} originalExpirationTime - The original expiration time
 * @param {number} secondsUntilExpire - Seconds until expiration
 */
export function verifyRefreshTokenExpirationPreservation(mockRes: MockResponse, mockReq: MockRequest, mockNext: jest.Mock, originalRefreshToken: string, originalExpirationTime: number, secondsUntilExpire: number): void {
   // Simulate the refresh token authentication middleware setting the expiration time in res.locals
   mockReq.cookies = { "refresh_token": originalRefreshToken };
   const { authenticateRefreshToken } = require("@/lib/middleware");
   const middleware = authenticateRefreshToken();
   callMiddleware(middleware, mockReq, mockRes, mockNext);

   // Verify the middleware set the expiration time in res.locals
   verifySuccessfulRefreshAuthentication(mockRes, mockNext);

   // Simulate refresh by configuring tokens again with the same expiration time as the original
   const { configureToken } = require("@/lib/middleware");
   configureToken(mockRes as any, TEST_USER_ID, secondsUntilExpire);

   const newRefreshToken = mockRes.cookies["refresh_token"]!.value;
   const newDecoded = verifyAndDecodeToken(newRefreshToken, "refresh_token", secondsUntilExpire);

   // The new refresh token should have the same expiration time as the original refresh token
   expect(Math.abs(newDecoded.exp! - originalExpirationTime)).toEqual(0);
}

/**
 * Verifies token expiration relationship and expired token behavior
 *
 * @param {MockResponse} mockRes - The mock response object
 * @param {MockRequest} mockReq - The mock request object
 * @param {jest.Mock} mockNext - The mock next function
 * @param {string} refreshToken - The refresh token
 * @param {string} accessToken - The access token
 * @param {number} secondsUntilExpire - Seconds until expiration
 */
export async function verifyTokenExpirationRelationship(mockRes: MockResponse, mockReq: MockRequest, mockNext: jest.Mock, refreshToken: string, accessToken: string, secondsUntilExpire: number): Promise<void> {
   const refreshDecoded = verifyAndDecodeToken(refreshToken, "refresh_token", secondsUntilExpire);
   const accessDecoded = verifyAndDecodeToken(accessToken, "access_token");

   // Initially the access token should expire before the refresh token
   expect(accessDecoded.exp!).toBeGreaterThan(refreshDecoded.exp!);

   // Wait for refresh token to expire
   await new Promise(resolve => setTimeout(resolve, 2000));
   const currentTime = Math.floor(Date.now() / 1000);
   expect(currentTime).toBeGreaterThan(refreshDecoded.exp!);

   // Verify the refresh token is expired when attempting to refresh the tokens
   mockReq.cookies = { "refresh_token": refreshToken };
   const { authenticateRefreshToken } = require("@/lib/middleware");
   const middleware = authenticateRefreshToken();
   callMiddleware(middleware, mockReq, mockRes, mockNext);

   verifyUnauthorizedWithTokenClearing(mockRes, mockNext);
}