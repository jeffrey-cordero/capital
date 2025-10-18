import { HTTP_STATUS } from "capital/server";
import { Response } from "express";
import jwt from "jsonwebtoken";

import { authenticateRefreshToken, authenticateToken, clearToken, configureToken } from "@/lib/middleware";
import { createMockMiddleware, MockRequest, MockResponse } from "@/tests/utils/api";
import {
   callMiddleware,
   TEST_SECRET,
   TEST_USER_ID,
   testMissingSessionSecret,
   testUnexpectedErrorHandling,
   verifyToken,
   verifyTokenConfiguration,
   verifyTokensCleared
} from "@/tests/utils/tokens";

/**
 * Mock the error logger to minimize the output during middleware tests
 */
jest.mock("@/lib/logger", () => ({
   logger: {
      error: jest.fn()
   }
}));

describe("Middleware Functions", () => {
   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: jest.Mock;

   beforeEach(() => {
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      process.env.SESSION_SECRET = TEST_SECRET;
      jest.clearAllMocks();
   });

   describe("configureToken", () => {
      it("should set both access_token and refresh_token cookies", () => {
         // Act
         configureToken(mockRes as Response, TEST_USER_ID);

         // Assert
         verifyTokenConfiguration(mockRes, TEST_USER_ID);
      });

      it("should use default refresh token expiration when secondsUntilExpire is not provided", () => {
         // Act
         configureToken(mockRes as Response, TEST_USER_ID);

         // Assert
         const refreshToken = mockRes.cookies["refresh_token"];
         expect(refreshToken).toBeDefined();

         // Verify refresh token uses default 7d expiration
         verifyToken(refreshToken!.value, "refresh_token", TEST_USER_ID);
      });

      it("should handle missing SESSION_SECRET environment variable", () => {
         // Arrange
         delete process.env.SESSION_SECRET;

         // Act & Assert - JWT requires a secret
         expect(() => configureToken(mockRes as Response, TEST_USER_ID)).toThrow("secretOrPrivateKey must have a value");
      });
   });

   describe("clearToken", () => {
      it("should clear both access_token and refresh_token cookies", () => {
         // Act
         clearToken(mockRes as Response);

         // Assert
         verifyTokensCleared(mockRes);
      });
   });

   describe("authenticateToken", () => {
      it("should authenticate valid access token and attach user_id", () => {
         // Arrange
         const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "1h" });
         mockReq.cookies = { "access_token": validToken };

         const middleware = authenticateToken(true);

         // Act
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         // Assert
         expect(mockRes.locals.user_id).toBe(TEST_USER_ID);
         expect(mockRes.status).not.toHaveBeenCalled();
         expect(mockNext).toHaveBeenCalled();
      });

      it("should return unauthorized when token is missing and authentication required", () => {
         // Arrange
         mockReq.cookies = {};

         const middleware = authenticateToken(true);

         // Act
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         // Assert
         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return unauthorized with refreshable flag for expired token", () => {
         // Arrange
         const expiredToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "-1h" });
         mockReq.cookies = { "access_token": expiredToken };

         const middleware = authenticateToken(true);

         // Act
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         // Assert
         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         expect(mockRes.json).toHaveBeenCalledWith({ data: { refreshable: true } });
         // Not clearing cookie on expired token as it's handled by the client refresh flow
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return forbidden for invalid JWT signature", () => {
         // Arrange
         const invalidToken = jwt.sign({ user_id: TEST_USER_ID }, "wrong-secret");
         mockReq.cookies = { "access_token": invalidToken };

         const middleware = authenticateToken(true);

         // Act
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         // Assert
         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
         expect(mockRes.clearCookie).toHaveBeenCalledWith("access_token");
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return forbidden for malformed JWT", () => {
         // Arrange
         mockReq.cookies = { "access_token": "not-a-valid-jwt" };

         const middleware = authenticateToken(true);

         // Act
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         // Assert
         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
         expect(mockRes.clearCookie).toHaveBeenCalledWith("access_token");
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return forbidden when user_id is missing from JWT payload", () => {
         // Arrange
         const tokenWithoutUserId = jwt.sign({ some_field: "value" }, TEST_SECRET);
         mockReq.cookies = { "access_token": tokenWithoutUserId };

         const middleware = authenticateToken(true);

         // Act
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         // Assert
         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should call next when token not required and not present", () => {
         const middleware = authenticateToken(false);
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockNext).toHaveBeenCalled();
         expect(mockRes.status).not.toHaveBeenCalled();
      });

      it("should return redirect when token present but not required", () => {
         const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET);
         mockReq.cookies = { "access_token": validToken };

         const middleware = authenticateToken(false);
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.REDIRECT);
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should handle unexpected errors during token verification", () => {
         testUnexpectedErrorHandling(authenticateToken(true), HTTP_STATUS.FORBIDDEN, "access_token");
      });

      it("should handle missing SESSION_SECRET environment variable", () => {
         testMissingSessionSecret(authenticateToken(true), HTTP_STATUS.FORBIDDEN, "access_token");
      });
   });

   describe("authenticateRefreshToken", () => {
      it("should authenticate valid refresh token and attach user_id", () => {
         const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "7d" });
         mockReq.cookies = { "refresh_token": validToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockRes.locals.user_id).toBe(TEST_USER_ID);
         expect(mockNext).toHaveBeenCalled();
         expect(mockRes.status).not.toHaveBeenCalled();
      });

      it("should return unauthorized when refresh token is missing", () => {
         mockReq.cookies = {};

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return unauthorized and clear tokens for expired refresh token", () => {
         const expiredToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "-1d" });
         mockReq.cookies = { "refresh_token": expiredToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         verifyTokensCleared(mockRes);
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return unauthorized and clear tokens for invalid refresh token", () => {
         const invalidToken = jwt.sign({ user_id: TEST_USER_ID }, "wrong-secret");
         mockReq.cookies = { "refresh_token": invalidToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         verifyTokensCleared(mockRes);
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return forbidden when user_id is missing from refresh token payload", () => {
         const tokenWithoutUserId = jwt.sign({ some_field: "value" }, TEST_SECRET);
         mockReq.cookies = { "refresh_token": tokenWithoutUserId };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
         expect(mockNext).not.toHaveBeenCalled();
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
         // First, configure initial tokens
         configureToken(mockRes as Response, TEST_USER_ID);
         const firstAccessToken = mockRes.cookies["access_token"]!.value;
         const firstRefreshToken = mockRes.cookies["refresh_token"]!.value;

         // Clear the mock data
         mockRes.cookies = {};

         // Wait a small amount to ensure different iat timestamp
         await new Promise(resolve => setTimeout(resolve, 1100));

         // Simulate refresh by configuring tokens again
         configureToken(mockRes as Response, TEST_USER_ID);
         const secondAccessToken = mockRes.cookies["access_token"]!.value;
         const secondRefreshToken = mockRes.cookies["refresh_token"]!.value;

         // Tokens should be different (rotated) due to different iat
         expect(firstAccessToken).not.toBe(secondAccessToken);
         expect(firstRefreshToken).not.toBe(secondRefreshToken);

         // But they should contain the same user_id
         verifyToken(secondAccessToken, "access_token", TEST_USER_ID);
         verifyToken(secondRefreshToken, "refresh_token", TEST_USER_ID);
      });

      it("should preserve original refresh token expiration time across multiple refreshes", async() => {
         // Create initial refresh token with short expiration (2 minutes)
         const shortExpirationSeconds = 120; // 2 minutes
         configureToken(mockRes as Response, TEST_USER_ID, shortExpirationSeconds);

         // Get the original refresh token and its expiration
         const originalRefreshToken = mockRes.cookies["refresh_token"]!.value;
         const originalDecoded = verifyToken(originalRefreshToken, "refresh_token", TEST_USER_ID, shortExpirationSeconds);
         const originalExpiration = originalDecoded.exp!;

         // Simulate middleware setting the expiration in locals
         mockRes.locals.refresh_token_expiration = new Date(originalExpiration * 1000);

         // Clear the mock data
         mockRes.cookies = {};

         // Wait a small amount
         await new Promise(resolve => setTimeout(resolve, 100));

         // Simulate refresh by configuring tokens again with preserved expiration
         const secondsUntilExpire = Math.floor((originalExpiration * 1000 - Date.now()) / 1000);
         configureToken(mockRes as Response, TEST_USER_ID, secondsUntilExpire);

         const newRefreshToken = mockRes.cookies["refresh_token"]!.value;
         const newDecoded = verifyToken(newRefreshToken, "refresh_token", TEST_USER_ID, secondsUntilExpire);

         // The new refresh token should have the same expiration time as the original
         // Allow for 1 second difference due to timing of token creation
         expect(Math.abs(newDecoded.exp! - originalExpiration)).toBeLessThanOrEqual(1);
      });
   });

   describe("Refresh Token Expiration Handling", () => {
      it("should set refresh_token_expiration in res.locals when authenticating refresh token", () => {
         const validToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "7d" });
         mockReq.cookies = { "refresh_token": validToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockRes.locals.user_id).toBe(TEST_USER_ID);
         expect(mockRes.locals.refresh_token_expiration).toBeDefined();
         expect(mockRes.locals.refresh_token_expiration).toBeInstanceOf(Date);
         expect(mockNext).toHaveBeenCalled();
      });

      it("should call clearToken when refresh token is expired", () => {
         const expiredToken = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "-1d" });
         mockReq.cookies = { "refresh_token": expiredToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         verifyTokensCleared(mockRes);
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should call clearToken when refresh token is invalid", () => {
         const invalidToken = jwt.sign({ user_id: TEST_USER_ID }, "wrong-secret");
         mockReq.cookies = { "refresh_token": invalidToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
         verifyTokensCleared(mockRes);
         expect(mockNext).not.toHaveBeenCalled();
      });

      it("should handle refresh token very close to expiration", () => {
         // Create token expiring in 1 second
         const tokenExpiringSoon = jwt.sign({ user_id: TEST_USER_ID }, TEST_SECRET, { expiresIn: "1s" });
         mockReq.cookies = { "refresh_token": tokenExpiringSoon };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         // Should still work if token is valid (not expired yet)
         expect(mockRes.locals.user_id).toBe(TEST_USER_ID);
         expect(mockRes.locals.refresh_token_expiration).toBeDefined();
         expect(mockNext).toHaveBeenCalled();
      });

      it("should eventually have access token expiration greater than refresh token expiration", async() => {
         // Create refresh token with very short expiration (5 seconds)
         const shortExpirationSeconds = 5;
         configureToken(mockRes as Response, TEST_USER_ID, shortExpirationSeconds);

         const refreshToken = mockRes.cookies["refresh_token"]!.value;
         const accessToken = mockRes.cookies["access_token"]!.value;

         const refreshDecoded = verifyToken(refreshToken, "refresh_token", TEST_USER_ID, shortExpirationSeconds);
         const accessDecoded = verifyToken(accessToken, "access_token", TEST_USER_ID);

         // Initially, access token should expire before refresh token (access: 1 hour, refresh: 5 seconds)
         expect(accessDecoded.exp!).toBeGreaterThan(refreshDecoded.exp!);

         // Wait for refresh token to expire
         await new Promise(resolve => setTimeout(resolve, 6000));

         // Now refresh token should be expired
         const currentTime = Math.floor(Date.now() / 1000);
         expect(currentTime).toBeGreaterThan(refreshDecoded.exp!);
      });
   });
});