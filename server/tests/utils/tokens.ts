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
 * Helper function to test unexpected error handling
 *
 * @param {any} middlewareFunction - The middleware function to test
 * @param {number} expectedStatus - The expected status code
 * @param {string} cookieName - The name of the cookie to test, defaults to 'access_token'
 */
export function testUnexpectedErrorHandling(middlewareFunction: any, expectedStatus: number, cookieName: string = "access_token") {
   const mockError = new Error("Unexpected error");
   mockError.stack = "Error: Unexpected error\n    at someFunction";

   const verifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw mockError;
   });

   const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
   const { mockReq, mockRes, mockNext } = createMockMiddleware({ cookies: { [cookieName]: validToken } });
   callMiddleware(middlewareFunction, mockReq, mockRes, mockNext);

   expect(mockRes.status).toHaveBeenCalledWith(expectedStatus);
   expect(mockNext).not.toHaveBeenCalled();

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
 * Helper function to verify JWT token properties
 *
 * @param {string} tokenValue - The JWT token value
 * @param {"access_token" | "refresh_token"} tokenType - The type of token to verify
 * @param {string} expectedUserId - The expected user ID
 * @param {number} customExpirationSeconds - Optional custom expiration time in seconds (overrides default type-based validation)
 */
export function verifyToken(tokenValue: string, tokenType: "access_token" | "refresh_token", expectedUserId: string = TEST_USER_ID, customExpirationSeconds?: number): jwt.JwtPayload {
   const decoded = jwt.verify(tokenValue, TEST_SECRET) as jwt.JwtPayload;

   // Verify user_id is present
   expect(decoded).toMatchObject({ user_id: expectedUserId });

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
 * @param {string} expectedUserId - The expected user ID
 */
export function verifyTokenConfiguration(mockRes: MockResponse, expectedUserId: string = TEST_USER_ID) {
   // Validate cookie structure
   expect(Object.keys(mockRes.cookies)).toHaveLength(2);
   validateTokenCookie(mockRes, "refresh_token", true);
   validateTokenCookie(mockRes, "access_token", true);

   // Verify JWT payloads
   const accessToken = mockRes.cookies["access_token"];
   const refreshToken = mockRes.cookies["refresh_token"];
   verifyToken(accessToken!.value, "access_token", expectedUserId);
   verifyToken(refreshToken!.value, "refresh_token", expectedUserId);
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
 * Helper function to call middleware with proper type casting
 *
 * This reduces redundancy in middleware tests by encapsulating the common
 * pattern of calling middleware with type assertions
 *
 * @param {any} middleware - The middleware function to call
 * @param {MockRequest} mockReq - The mock request object
 * @param {MockResponse} mockRes - The mock response object
 * @param {jest.Mock} mockNext - The mock next function
 */
export function callMiddleware(middleware: any, mockReq: MockRequest, mockRes: MockResponse, mockNext: jest.Mock): void {
   middleware(mockReq as any, mockRes as any, mockNext as any);
}