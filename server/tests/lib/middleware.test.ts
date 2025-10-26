import { HTTP_STATUS } from "capital/server";
import { Response } from "express";
import jwt from "jsonwebtoken";

import { authenticateRefreshToken, authenticateToken, clearTokens, configureToken } from "@/lib/middleware";
import { createMockMiddleware, MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";
import {
   arrangeMissingSessionSecret,
   arrangeUnexpectedErrorHandling,
   assertAndDecodeToken,
   assertForbiddenResponse,
   assertRefreshTokenExpirationPreservation,
   assertResponseStatus,
   assertSuccessfulAuthentication,
   assertSuccessfulRefreshAuthentication,
   assertTokenConfiguration,
   assertTokenExpirationRelationship,
   assertTokenRotation,
   assertTokensCleared,
   assertUnauthorizedWithRefreshable,
   assertUnauthorizedWithTokenClearing,
   callMiddleware,
   TEST_SECRET,
   TEST_USER_ID,
   TEST_USER_PAYLOAD
} from "@/tests/utils/tokens";

/**
 * Mock the logger to minimize the error output during middleware tests
 */
jest.mock("@/lib/logger");

describe("Authentication Middleware", () => {
   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: MockNextFunction;

   beforeEach(() => {
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      process.env.SESSION_SECRET = TEST_SECRET;
      jest.clearAllMocks();
   });

   describe("Token Configuration", () => {
      it("should set both access_token and refresh_token cookies", () => {
         configureToken(mockRes as Response, TEST_USER_ID);

         assertTokenConfiguration(mockRes);
      });

      it("should use default refresh token expiration when secondsUntilExpire is not provided", () => {
         configureToken(mockRes as Response, TEST_USER_ID);

         const refreshToken = mockRes.cookies["refresh_token"];
         expect(refreshToken).toBeDefined();
         assertAndDecodeToken(refreshToken!.value, "refresh_token");
      });

      it("should handle missing SESSION_SECRET environment variable", () => {
         delete process.env.SESSION_SECRET;

         expect(() => configureToken(mockRes as Response, TEST_USER_ID)).toThrow("secretOrPrivateKey must have a value");
      });
   });

   describe("Token Clearing", () => {
      it("should clear both access_token and refresh_token cookies", () => {
         clearTokens(mockRes as Response);

         assertTokensCleared(mockRes);
      });
   });

   describe("Token Authentication", () => {
      it("should authenticate valid access token and attach user_id", () => {
         const validToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "1h" });
         mockReq.cookies = { "access_token": validToken };

         const middleware = authenticateToken(true);
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertSuccessfulAuthentication(mockRes, mockNext);
      });

      it("should return unauthorized when access token is missing and authentication required", () => {
         mockReq.cookies = {};

         const middleware = authenticateToken(true);
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertResponseStatus(mockRes, HTTP_STATUS.UNAUTHORIZED, mockNext);
      });

      it("should return unauthorized with refreshable flag for expired access token", () => {
         const expiredToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "-1h" });
         mockReq.cookies = { "access_token": expiredToken };

         const middleware = authenticateToken(true);
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertUnauthorizedWithRefreshable(mockRes, mockNext);
      });

      it("should return forbidden for invalid JWT signature and clear the invalid access token", () => {
         const invalidToken = jwt.sign(TEST_USER_PAYLOAD, "invalid-secret");
         mockReq.cookies = { "access_token": invalidToken };

         const middleware = authenticateToken(true);
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertForbiddenResponse(mockRes, mockNext);
      });

      it("should return forbidden for malformed JWT and clear the malformed token", () => {
         mockReq.cookies = { "access_token": "not-a-valid-jwt" };

         const middleware = authenticateToken(true);
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertForbiddenResponse(mockRes, mockNext);
      });

      it("should return forbidden when user_id is missing from access token payload and clear the invalid access token", () => {
         const missingUserIdToken = jwt.sign({ some_field: "value" }, TEST_SECRET);
         mockReq.cookies = { "access_token": missingUserIdToken };

         const middleware = authenticateToken(true);
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertForbiddenResponse(mockRes, mockNext);
      });

      it("should call next when the access token is not required and not present", () => {
         const middleware = authenticateToken(false);
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         expect(mockNext).toHaveBeenCalled();
         expect(mockRes.status).not.toHaveBeenCalled();
      });

      it("should return redirect when the access token is present but not required", () => {
         const validAccessToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET);
         mockReq.cookies = { "access_token": validAccessToken };

         const middleware = authenticateToken(false);
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertResponseStatus(mockRes, HTTP_STATUS.REDIRECT, mockNext);
      });

      it("should handle unexpected errors during access token verification", () => {
         arrangeUnexpectedErrorHandling(authenticateToken(true), HTTP_STATUS.FORBIDDEN, "access_token");
      });

      it("should handle missing SESSION_SECRET environment variable for access token", () => {
         arrangeMissingSessionSecret(authenticateToken(true), HTTP_STATUS.FORBIDDEN, "access_token");
      });
   });

   describe("Refresh Token Authentication", () => {
      it("should authenticate valid refresh token and attach user_id to res.locals after a successful token refresh", () => {
         const validRefreshToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "7d" });
         mockReq.cookies = { "refresh_token": validRefreshToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertSuccessfulRefreshAuthentication(mockRes, mockNext);
      });

      it("should return unauthorized and clear both tokens when the refresh token is missing", () => {
         mockReq.cookies = {};

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertTokensCleared(mockRes);
         assertResponseStatus(mockRes, HTTP_STATUS.UNAUTHORIZED, mockNext);
      });

      it("should return unauthorized and clear both access and refresh tokens for an expired refresh token", () => {
         const expiredToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "-1d" });
         mockReq.cookies = { "refresh_token": expiredToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertUnauthorizedWithTokenClearing(mockRes, mockNext);
      });

      it("should return unauthorized and clear both tokens when an invalid refresh token is provided", () => {
         const invalidToken = jwt.sign(TEST_USER_PAYLOAD, "wrong-secret");
         mockReq.cookies = { "refresh_token": invalidToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertUnauthorizedWithTokenClearing(mockRes, mockNext);
      });

      it("should return forbidden when user_id is missing from the refresh token payload", () => {
         const missingUserIdToken = jwt.sign({ some_field: "value" }, TEST_SECRET);
         mockReq.cookies = { "refresh_token": missingUserIdToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertResponseStatus(mockRes, HTTP_STATUS.FORBIDDEN, mockNext);
      });

      it("should handle unexpected errors during refresh token verification and clear both tokens", () => {
         arrangeUnexpectedErrorHandling(authenticateRefreshToken(), HTTP_STATUS.FORBIDDEN, "refresh_token");
      });

      it("should handle missing SESSION_SECRET environment variable for the refresh token", () => {
         arrangeMissingSessionSecret(authenticateRefreshToken(), HTTP_STATUS.UNAUTHORIZED, "refresh_token");
      });
   });

   describe("Token Rotation", () => {
      it("should issue new access and refresh tokens with the same user_id when refreshing", async() => {
         // Arrange the initial access and refresh tokens
         configureToken(mockRes as Response, TEST_USER_ID);

         const firstAccessToken = mockRes.cookies["access_token"]!.value;
         const firstRefreshToken = mockRes.cookies["refresh_token"]!.value;

         // Verify the initial tokens
         assertTokenConfiguration(mockRes);

         // Clear the mock response cookies to simulate a local logout action
         mockRes.cookies = {};
         await new Promise(resolve => setTimeout(resolve, 1100));

         // Simulate a successful token provision by configuring tokens after simulating a logout action
         configureToken(mockRes as Response, TEST_USER_ID);
         const secondAccessToken = mockRes.cookies["access_token"]!.value;
         const secondRefreshToken = mockRes.cookies["refresh_token"]!.value;

         // Verify token rotation
         assertTokenRotation(mockRes, firstAccessToken, firstRefreshToken, secondAccessToken, secondRefreshToken);
      });

      it("should preserve original refresh token expiration time across multiple refresh calls", async() => {
         // Arrange the initial refresh token to expire in 2 minutes
         configureToken(mockRes as Response, TEST_USER_ID);

         // Verify the initial access and refresh tokens
         assertTokenConfiguration(mockRes);

         // Get the original refresh token and verify its expiration time
         const originalRefreshToken = mockRes.cookies["refresh_token"]!.value;
         const originalDecoded = assertAndDecodeToken(originalRefreshToken, "refresh_token");
         const originalExpirationTime = originalDecoded.exp!;

         // Calculate seconds until expiration
         const secondsUntilExpire = Math.max(0, Math.floor((originalExpirationTime - Date.now()) / 1000));

         // Verify refresh token expiration preservation
         assertRefreshTokenExpirationPreservation(mockRes, mockReq, mockNext, originalRefreshToken, originalExpirationTime, secondsUntilExpire);
      });
   });

   describe("Refresh Token Expiration", () => {
      it("should authenticate a valid refresh token and set refresh_token_expiration in res.locals", () => {
         const validToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "7d" });
         mockReq.cookies = { "refresh_token": validToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertSuccessfulRefreshAuthentication(mockRes, mockNext);
      });

      it("should return unauthorized and clear both tokens when an expired refresh token is provided", () => {
         const expiredToken = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "-1d" });
         mockReq.cookies = { "refresh_token": expiredToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertUnauthorizedWithTokenClearing(mockRes, mockNext);
      });

      it("should return unauthorized and clear both tokens when an invalid refresh token is provided", () => {
         const invalidToken = jwt.sign(TEST_USER_PAYLOAD, "wrong-secret");
         mockReq.cookies = { "refresh_token": invalidToken };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertUnauthorizedWithTokenClearing(mockRes, mockNext);
      });

      it("should authenticate a valid refresh token very close to expiration", () => {
         // Create token expiring in 5 seconds
         const tokenExpiringSoon = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: "5s" });
         mockReq.cookies = { "refresh_token": tokenExpiringSoon };

         const middleware = authenticateRefreshToken();
         callMiddleware(middleware, mockReq, mockRes, mockNext);

         assertSuccessfulRefreshAuthentication(mockRes, mockNext);
      });

      it("should eventually have access token expiration greater than refresh token expiration", async() => {
         // Create refresh token with a short expiration
         const secondsUntilExpire = 1;
         configureToken(mockRes as Response, TEST_USER_ID, secondsUntilExpire);

         const refreshToken = mockRes.cookies["refresh_token"]!.value;
         const accessToken = mockRes.cookies["access_token"]!.value;

         // Verify token expiration relationship and expired token behavior
         await assertTokenExpirationRelationship(mockRes, mockReq, mockNext, refreshToken, accessToken, secondsUntilExpire);
      });
   });
});