import { createLoginCredentials, VALID_LOGIN } from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import { Request, Response } from "express";

import * as authenticationController from "@/controllers/authenticationController";
import { TEST_TOKENS, TEST_USER_ID } from "@/tests/constants/tokens";
import { createMockRequest, createMockResponse } from "@/tests/utils/api";
import { assertControllerErrorResponse, testServiceErrorResponse, testServiceSuccess, testServiceThrownError } from "@/tests/utils/controllers";

/**
 * Mock the services module
 */
jest.mock("@/lib/services", () => {
   const { createMockSubmitServiceRequest } = require("@/tests/utils/controllers");
   return { submitServiceRequest: createMockSubmitServiceRequest() };
});

/**
 * Mock the authenticationService module
 */
jest.mock("@/services/authenticationService", () => ({
   getAuthentication: jest.fn(),
   authenticateUser: jest.fn(),
   refreshToken: jest.fn(),
   logoutUser: jest.fn()
}));

describe("Authentication Controller", () => {
   let mockReq: Request;
   let mockRes: Response;
   let mockNext: jest.Mock;

   beforeEach(() => {
      mockReq = createMockRequest() as Request;
      mockRes = createMockResponse() as Response;
      mockNext = jest.fn();
      jest.clearAllMocks();
   });

   describe("GET /authentication", () => {
      it("should return authentication status for valid token", async() => {
         // Arrange
         mockReq.cookies = { access_token: TEST_TOKENS.VALID_ACCESS };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { authenticated: true }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         testServiceSuccess(mockGetAuthentication, mockResponse);

         // Act
         await authenticationController.GET(mockReq, mockRes, mockNext);

         // Assert
         expect(mockGetAuthentication).toHaveBeenCalledWith(mockRes, mockReq.cookies.access_token);
      });

      it("should return refreshable flag for expired token", async() => {
         // Arrange
         mockReq.cookies = { access_token: TEST_TOKENS.EXPIRED_ACCESS };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.UNAUTHORIZED,
            data: { refreshable: true }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         testServiceErrorResponse(mockGetAuthentication, mockResponse);

         // Act
         await authenticationController.GET(mockReq, mockRes, mockNext);

         // Assert
         expect(mockGetAuthentication).toHaveBeenCalledWith(mockRes, mockReq.cookies.access_token);
      });

      it("should return unauthenticated for invalid token", async() => {
         // Arrange
         mockReq.cookies = { access_token: TEST_TOKENS.INVALID_ACCESS };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { authenticated: false }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         testServiceSuccess(mockGetAuthentication, mockResponse);

         // Act
         await authenticationController.GET(mockReq, mockRes, mockNext);

         // Assert
         expect(mockGetAuthentication).toHaveBeenCalledWith(mockRes, mockReq.cookies.access_token);
      });

      it("should handle missing access token", async() => {
         // Arrange
         mockReq.cookies = {};

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { authenticated: false }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         testServiceSuccess(mockGetAuthentication, mockResponse);

         // Act
         await authenticationController.GET(mockReq, mockRes, mockNext);

         // Assert
         expect(mockGetAuthentication).toHaveBeenCalledWith(mockRes, undefined);
      });

      it("should handle service errors", async() => {
         // Arrange
         mockReq.cookies = { access_token: TEST_TOKENS.VALID_ACCESS };
         const expectedError = new Error("Service error");

         const authenticationService = await import("@/services/authenticationService");
         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         testServiceThrownError(mockGetAuthentication, expectedError);

         // Act
         await authenticationController.GET(mockReq, mockRes, mockNext);

         // Assert
         expect(mockGetAuthentication).toHaveBeenCalledWith(mockRes, mockReq.cookies.access_token);
         assertControllerErrorResponse(mockRes, expectedError, mockGetAuthentication);
      });
   });

   describe("LOGIN /authentication", () => {
      it("should authenticate user with valid credentials", async() => {
         // Arrange
         mockReq.body = createLoginCredentials("TestUser");

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         testServiceSuccess(mockAuthenticateUser, mockResponse);

         // Act
         await authenticationController.LOGIN(mockReq, mockRes, mockNext);

         // Assert
         expect(mockAuthenticateUser).toHaveBeenCalledWith(mockRes, mockReq.body.username, mockReq.body.password);
      });

      it("should return error for invalid credentials", async() => {
         // Arrange
         const message = "Invalid credentials";
         mockReq.body = createLoginCredentials("TestUser");

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.UNAUTHORIZED,
            errors: {
               username: message,
               password: message
            }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         testServiceErrorResponse(mockAuthenticateUser, mockResponse);

         await authenticationController.LOGIN(mockReq, mockRes, mockNext);

         // Assert
         expect(mockAuthenticateUser).toHaveBeenCalledWith(mockRes, mockReq.body.username, mockReq.body.password);
      });

      it("should handle missing username", async() => {
         // Arrange
         mockReq.body = { password: VALID_LOGIN.password };
         const expectedError = new Error("Missing username");

         const authenticationService = await import("@/services/authenticationService");
         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         testServiceThrownError(mockAuthenticateUser, expectedError);

         // Act
         await authenticationController.LOGIN(mockReq, mockRes, mockNext);

         // Assert
         expect(mockAuthenticateUser).toHaveBeenCalledWith(mockRes, undefined, mockReq.body.password);
         assertControllerErrorResponse(mockRes, expectedError, mockAuthenticateUser);
      });

      it("should handle missing password", async() => {
         // Arrange
         mockReq.body = { username: VALID_LOGIN.username };
         const expectedError = new Error("Missing password");

         const authenticationService = await import("@/services/authenticationService");
         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         testServiceThrownError(mockAuthenticateUser, expectedError);

         // Act
         await authenticationController.LOGIN(mockReq, mockRes, mockNext);

         // Assert
         expect(mockAuthenticateUser).toHaveBeenCalledWith(mockRes, mockReq.body.username, undefined);
         assertControllerErrorResponse(mockRes, expectedError, mockAuthenticateUser);
      });

      it("should handle service errors", async() => {
         // Arrange
         mockReq.body = createLoginCredentials("TestUser");
         const expectedError = new Error("Database connection failed");

         const authenticationService = await import("@/services/authenticationService");
         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         testServiceThrownError(mockAuthenticateUser, expectedError);

         // Act
         await authenticationController.LOGIN(mockReq, mockRes, mockNext);

         // Assert
         expect(mockAuthenticateUser).toHaveBeenCalledWith(mockRes, mockReq.body.username, mockReq.body.password);
         assertControllerErrorResponse(mockRes, expectedError, mockAuthenticateUser);
      });
   });

   describe("REFRESH /authentication", () => {
      it("should refresh tokens successfully", async() => {
         // Arrange
         mockRes.locals = { user_id: TEST_USER_ID };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockRefreshToken = authenticationService.refreshToken as jest.MockedFunction<typeof authenticationService.refreshToken>;
         testServiceSuccess(mockRefreshToken, mockResponse);

         // Act
         await authenticationController.REFRESH(mockReq, mockRes, mockNext);

         // Assert
         expect(mockRefreshToken).toHaveBeenCalledWith(mockRes, mockRes.locals.user_id);
      });

      it("should handle missing user_id in locals", async() => {
         // Arrange
         mockRes.locals = {};
         const expectedError = new Error("Missing user_id");

         const authenticationService = await import("@/services/authenticationService");
         const mockRefreshToken = authenticationService.refreshToken as jest.MockedFunction<typeof authenticationService.refreshToken>;
         testServiceThrownError(mockRefreshToken, expectedError);

         // Act
         await authenticationController.REFRESH(mockReq, mockRes, mockNext);

         // Assert
         expect(mockRefreshToken).toHaveBeenCalledWith(mockRes, undefined);
         assertControllerErrorResponse(mockRes, expectedError, mockRefreshToken);
      });

      it("should handle service errors", async() => {
         // Arrange
         mockRes.locals = { user_id: TEST_USER_ID };
         const expectedError = new Error("Token refresh failed");

         const authenticationService = await import("@/services/authenticationService");
         const mockRefreshToken = authenticationService.refreshToken as jest.MockedFunction<typeof authenticationService.refreshToken>;
         testServiceThrownError(mockRefreshToken, expectedError);

         // Act
         await authenticationController.REFRESH(mockReq, mockRes, mockNext);

         // Assert
         expect(mockRefreshToken).toHaveBeenCalledWith(mockRes, mockRes.locals.user_id);
         assertControllerErrorResponse(mockRes, expectedError, mockRefreshToken);
      });
   });

   describe("LOGOUT /authentication", () => {
      it("should logout user successfully", async() => {
         // Arrange
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockLogoutUser = authenticationService.logoutUser as jest.MockedFunction<typeof authenticationService.logoutUser>;
         testServiceSuccess(mockLogoutUser, mockResponse);

         // Act
         await authenticationController.LOGOUT(mockReq, mockRes, mockNext);

         // Assert
         expect(mockLogoutUser).toHaveBeenCalledWith(mockRes);
      });

      it("should handle service errors", async() => {
         // Arrange
         const expectedError = new Error("Logout failed");

         const authenticationService = await import("@/services/authenticationService");
         const mockLogoutUser = authenticationService.logoutUser as jest.MockedFunction<typeof authenticationService.logoutUser>;
         testServiceThrownError(mockLogoutUser, expectedError);

         // Act
         await authenticationController.LOGOUT(mockReq, mockRes, mockNext);

         // Assert
         expect(mockLogoutUser).toHaveBeenCalledWith(mockRes);
         assertControllerErrorResponse(mockRes, expectedError, mockLogoutUser);
      });

      it("should handle multiple logout calls", async() => {
         // Arrange
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockLogoutUser = authenticationService.logoutUser as jest.MockedFunction<typeof authenticationService.logoutUser>;
         testServiceSuccess(mockLogoutUser, mockResponse);

         // Act & Assert - First logout call
         await authenticationController.LOGOUT(mockReq, mockRes, mockNext);
         expect(mockLogoutUser).toHaveBeenCalledTimes(1);

         // Act & Assert - Second logout call
         await authenticationController.LOGOUT(mockReq, mockRes, mockNext);
         expect(mockLogoutUser).toHaveBeenCalledTimes(2);
      });
   });
});