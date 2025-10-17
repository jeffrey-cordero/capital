import { createLoginCredentials, VALID_LOGIN } from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";

import * as authenticationController from "@/controllers/authenticationController";
import { createMockRequest, createMockResponse, MockRequest, MockResponse } from "@/tests/utils/api";
import { assertControllerErrorResponse, assertControllerSuccessResponse, assertControllerValidationErrorResponse } from "@/tests/utils/controllers";
import { TEST_TOKENS, TEST_USER_ID } from "@/tests/utils/tokens";

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
   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: jest.Mock;

   beforeEach(() => {
      mockReq = createMockRequest();
      mockRes = createMockResponse();
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
         mockGetAuthentication.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.GET(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, mockReq.cookies.access_token],
            HTTP_STATUS.OK,
            { authenticated: true }
         );
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
         mockGetAuthentication.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.GET(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, mockReq.cookies.access_token],
            HTTP_STATUS.UNAUTHORIZED,
            { refreshable: true }
         );
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
         mockGetAuthentication.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.GET(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, mockReq.cookies.access_token],
            HTTP_STATUS.OK,
            { authenticated: false }
         );
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
         mockGetAuthentication.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.GET(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, undefined],
            HTTP_STATUS.OK,
            { authenticated: false }
         );
      });

      it("should handle service errors", async() => {
         // Arrange
         mockReq.cookies = { access_token: TEST_TOKENS.VALID_ACCESS };
         const expectedError = new Error("Service error");

         const authenticationService = await import("@/services/authenticationService");
         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         mockGetAuthentication.mockRejectedValue(expectedError);

         // Act
         await authenticationController.GET(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockGetAuthentication, [mockRes, mockReq.cookies.access_token]);
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
         mockAuthenticateUser.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.LOGIN(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockAuthenticateUser,
            [mockRes, mockReq.body.username, mockReq.body.password],
            HTTP_STATUS.OK,
            { success: true }
         );
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
         mockAuthenticateUser.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.LOGIN(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerValidationErrorResponse(
            mockRes,
            mockAuthenticateUser,
            [mockRes, mockReq.body.username, mockReq.body.password],
            HTTP_STATUS.UNAUTHORIZED,
            {
               username: "Invalid credentials",
               password: "Invalid credentials"
            }
         );
      });

      it("should handle missing username", async() => {
         // Arrange
         mockReq.body = { password: VALID_LOGIN.password };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.BAD_REQUEST,
            errors: {
               username: "Required"
            }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         mockAuthenticateUser.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.LOGIN(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerValidationErrorResponse(
            mockRes,
            mockAuthenticateUser,
            [mockRes, undefined, mockReq.body.password],
            HTTP_STATUS.BAD_REQUEST,
            {
               username: "Required"
            }
         );
      });

      it("should handle missing password", async() => {
         // Arrange
         mockReq.body = { username: VALID_LOGIN.username };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.BAD_REQUEST,
            errors: {
               password: "Required"
            }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         mockAuthenticateUser.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.LOGIN(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerValidationErrorResponse(
            mockRes,
            mockAuthenticateUser,
            [mockRes, mockReq.body.username, undefined],
            HTTP_STATUS.BAD_REQUEST,
            {
               password: "Required"
            }
         );
      });

      it("should handle service errors", async() => {
         // Arrange
         mockReq.body = createLoginCredentials("TestUser");
         const expectedError = new Error("Database connection failed");

         const authenticationService = await import("@/services/authenticationService");
         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         mockAuthenticateUser.mockRejectedValue(expectedError);

         // Act
         await authenticationController.LOGIN(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockAuthenticateUser, [mockRes, mockReq.body.username, mockReq.body.password]);
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
         mockRefreshToken.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.REFRESH(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockRefreshToken,
            [mockRes, mockRes.locals.user_id],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should handle missing user_id in locals", async() => {
         // Arrange
         mockRes.locals = {};

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.BAD_REQUEST,
            errors: {
               user_id: "Missing user_id"
            }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockRefreshToken = authenticationService.refreshToken as jest.MockedFunction<typeof authenticationService.refreshToken>;
         mockRefreshToken.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.REFRESH(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerValidationErrorResponse(
            mockRes,
            mockRefreshToken,
            [mockRes, undefined],
            HTTP_STATUS.BAD_REQUEST,
            {
               user_id: "Missing user_id"
            }
         );
      });

      it("should handle service errors", async() => {
         // Arrange
         mockRes.locals = { user_id: TEST_USER_ID };
         const expectedError = new Error("Token refresh failed");

         const authenticationService = await import("@/services/authenticationService");
         const mockRefreshToken = authenticationService.refreshToken as jest.MockedFunction<typeof authenticationService.refreshToken>;
         mockRefreshToken.mockRejectedValue(expectedError);

         // Act
         await authenticationController.REFRESH(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockRefreshToken, [mockRes, mockRes.locals.user_id]);
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
         mockLogoutUser.mockResolvedValue(mockResponse);

         // Act
         await authenticationController.LOGOUT(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockLogoutUser,
            [mockRes],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should handle service errors", async() => {
         // Arrange
         const expectedError = new Error("Logout failed");

         const authenticationService = await import("@/services/authenticationService");
         const mockLogoutUser = authenticationService.logoutUser as jest.MockedFunction<typeof authenticationService.logoutUser>;
         mockLogoutUser.mockRejectedValue(expectedError);

         // Act
         await authenticationController.LOGOUT(mockReq as any, mockRes as any, mockNext as any);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockLogoutUser, [mockRes]);
      });

      it("should handle multiple logout calls", async() => {
         // Arrange
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };

         const authenticationService = await import("@/services/authenticationService");
         const mockLogoutUser = authenticationService.logoutUser as jest.MockedFunction<typeof authenticationService.logoutUser>;
         mockLogoutUser.mockResolvedValue(mockResponse);

         // Act & Assert - First logout call
         await authenticationController.LOGOUT(mockReq as any, mockRes as any, mockNext as any);
         expect(mockLogoutUser).toHaveBeenCalledTimes(1);

         // Act & Assert - Second logout call
         await authenticationController.LOGOUT(mockReq as any, mockRes as any, mockNext as any);
         expect(mockLogoutUser).toHaveBeenCalledTimes(2);
      });
   });
});