import jwt from "jsonwebtoken";
import { HTTP_STATUS } from "capital/server";

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
 * @param {Function} middlewareFunction - The middleware function to test
 * @param {number} expectedStatus - The expected status code
 * @param {string} cookieName - The name of the cookie to test, defaults to 'access_token'
 * @param {any} createMockMiddleware - Function to create mock middleware objects
 */
export function testUnexpectedErrorHandling(middlewareFunction: any, expectedStatus: number, cookieName: string = "access_token", createMockMiddleware: any) {
   const mockError = new Error("Unexpected error");
   mockError.stack = "Error: Unexpected error\n    at someFunction";

   const verifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw mockError;
   });

   const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
   const { req, res, next } = createMockMiddleware({ cookies: { [cookieName]: validToken } });
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
 * @param {any} createMockMiddleware - Function to create mock middleware objects
 */
export function testMissingSessionSecret(middlewareFunction: any, expectedStatus: number, cookieName: string = "access_token", createMockMiddleware: any) {
   // Store original secret
   const originalSecret = process.env.SESSION_SECRET;

   // Delete the secret
   delete process.env.SESSION_SECRET;

   const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
   const { req, res, next } = createMockMiddleware({ cookies: { [cookieName]: validToken } });

   middlewareFunction(req, res, next);

   expect(res.status).toHaveBeenCalledWith(expectedStatus);
   expect(next).not.toHaveBeenCalled();

   // Restore original secret
   process.env.SESSION_SECRET = originalSecret;
}

/**
 * Helper function to validate token cookie structure and properties
 *
 * @param {any} res - The mock response object
 * @param {"access_token" | "refresh_token"} tokenType - The type of token to validate
 * @param {boolean} exists - Whether the token should exist
 */
export function validateTokenCookie(res: any, tokenType: "access_token" | "refresh_token", exists: boolean) {
   const token = res.cookies[tokenType];

   if (exists) {
      expect(token).toBeDefined();
      expect(token).toMatchObject({
         value: expect.any(String),
         options: expect.objectContaining({
            httpOnly: true,
            sameSite: "none",
            secure: true,
            maxAge: tokenType === "access_token" ? 1000 * 60 * 60 : 1000 * 60 * 60 * 24 * 7
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
 * @param {string} expectedUserId - The expected user ID
 * @param {number} minExpirationSeconds - Optional minimum expiration time in seconds from now
 */
export function verifyToken(tokenValue: string, expectedUserId: string = TEST_USER_ID, minExpirationSeconds?: number): jwt.JwtPayload {
   const decoded = jwt.verify(tokenValue, TEST_SECRET) as jwt.JwtPayload;
   expect(decoded).toMatchObject({ user_id: expectedUserId });

   if (minExpirationSeconds !== undefined) {
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000 + minExpirationSeconds);
   }

   return decoded;
}


/**
 * Helper function to verify both access and refresh tokens are properly configured
 *
 * @param {any} res - The mock response object
 * @param {string} expectedUserId - The expected user ID
 */
export function verifyTokenConfiguration(res: any, expectedUserId: string = TEST_USER_ID) {
   // Validate cookie structure
   validateTokenCookie(res, "access_token", true);
   validateTokenCookie(res, "refresh_token", true);

   // Verify JWT payloads
   const accessToken = res.cookies["access_token"];
   const refreshToken = res.cookies["refresh_token"];
   verifyToken(accessToken!.value, expectedUserId);
   verifyToken(refreshToken!.value, expectedUserId);
}

/**
 * Helper function to verify that both access and refresh tokens are cleared
 *
 * @param {any} res - The mock response object
 */
export function verifyTokensCleared(res: any) {
   // Verify clearCookie was called for both tokens
   expect(res.clearCookie).toHaveBeenCalledWith("access_token", expect.any(Object));
   expect(res.clearCookie).toHaveBeenCalledWith("refresh_token", expect.any(Object));

   // Verify cookies object is empty
   expect(Object.keys(res.cookies)).toHaveLength(0);
}
