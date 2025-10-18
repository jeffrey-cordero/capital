import { createLoginCredentials, VALID_LOGIN } from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";

import * as authenticationController from "@/controllers/authenticationController";
import { createMockMiddleware, MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";
import { assertControllerErrorResponse, assertControllerSuccessResponse, assertControllerValidationErrorResponse, callServiceMethod } from "@/tests/utils/controllers";
import { TEST_TOKENS, TEST_USER_ID } from "@/tests/utils/tokens";

jest.mock("@/lib/services", () => ({
   submitServiceRequest: require("@/tests/utils/controllers").createMockSubmitServiceRequest()
}));

jest.mock("@/services/authenticationService", () => ({
   getAuthentication: jest.fn(),
   authenticateUser: jest.fn(),
   refreshToken: jest.fn(),
   logoutUser: jest.fn()
}));

describe("Authentication Controller", () => {
   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: MockNextFunction;
   let authenticationService: typeof import("@/services/authenticationService");

   beforeEach(async() => {
      jest.clearAllMocks();
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      authenticationService = await import("@/services/authenticationService");
   });

   describe("GET /authentication", () => {
      it("should return authentication status for valid token", async() => {
         mockReq.cookies = { access_token: TEST_TOKENS.VALID_ACCESS };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { authenticated: true }
         };

         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         mockGetAuthentication.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, mockReq.cookies.access_token],
            HTTP_STATUS.OK,
            { authenticated: true }
         );
      });

      it("should return refreshable flag for expired token", async() => {
         mockReq.cookies = { access_token: TEST_TOKENS.EXPIRED_ACCESS };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.UNAUTHORIZED,
            data: { refreshable: true }
         };

         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         mockGetAuthentication.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, mockReq.cookies.access_token],
            HTTP_STATUS.UNAUTHORIZED,
            { refreshable: true }
         );
      });

      it("should return unauthenticated for invalid token", async() => {
         mockReq.cookies = { access_token: TEST_TOKENS.INVALID_ACCESS };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { authenticated: false }
         };

         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         mockGetAuthentication.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, mockReq.cookies.access_token],
            HTTP_STATUS.OK,
            { authenticated: false }
         );
      });

      it("should handle missing access token", async() => {
         mockReq.cookies = {};

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { authenticated: false }
         };

         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         mockGetAuthentication.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, undefined],
            HTTP_STATUS.OK,
            { authenticated: false }
         );
      });

      it("should handle service errors", async() => {
         mockReq.cookies = { access_token: TEST_TOKENS.VALID_ACCESS };
         const expectedError = new Error("Service error");

         const mockGetAuthentication = authenticationService.getAuthentication as jest.MockedFunction<typeof authenticationService.getAuthentication>;
         mockGetAuthentication.mockRejectedValue(expectedError);

         await callServiceMethod(authenticationController.GET, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(mockRes, expectedError, mockGetAuthentication, [mockRes, mockReq.cookies.access_token]);
      });
   });

   describe("LOGIN /authentication", () => {
      it("should authenticate user with valid credentials", async() => {
         mockReq.body = createLoginCredentials("TestUser");

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };

         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         mockAuthenticateUser.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockAuthenticateUser,
            [mockRes, mockReq.body.username, mockReq.body.password],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should return error for invalid credentials", async() => {
         const message = "Invalid credentials";
         mockReq.body = createLoginCredentials("TestUser");

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.UNAUTHORIZED,
            errors: {
               username: message,
               password: message
            }
         };

         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         mockAuthenticateUser.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

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
         mockReq.body = { password: VALID_LOGIN.password };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.BAD_REQUEST,
            errors: {
               username: "Required"
            }
         };

         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         mockAuthenticateUser.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

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
         mockReq.body = { username: VALID_LOGIN.username };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.BAD_REQUEST,
            errors: {
               password: "Required"
            }
         };

         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         mockAuthenticateUser.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

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
         mockReq.body = createLoginCredentials("TestUser");
         const expectedError = new Error("Database connection failed");

         const mockAuthenticateUser = authenticationService.authenticateUser as jest.MockedFunction<typeof authenticationService.authenticateUser>;
         mockAuthenticateUser.mockRejectedValue(expectedError);

         await callServiceMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(mockRes, expectedError, mockAuthenticateUser, [mockRes, mockReq.body.username, mockReq.body.password]);
      });
   });

   describe("REFRESH /authentication", () => {
      it("should refresh tokens successfully", async() => {
         mockRes.locals = { user_id: TEST_USER_ID };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };

         const mockRefreshToken = authenticationService.refreshToken as jest.MockedFunction<typeof authenticationService.refreshToken>;
         mockRefreshToken.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.REFRESH, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockRefreshToken,
            [mockRes, mockRes.locals.user_id],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should handle missing user_id in locals", async() => {
         mockRes.locals = {};

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.BAD_REQUEST,
            errors: {
               user_id: "Missing user_id"
            }
         };

         const mockRefreshToken = authenticationService.refreshToken as jest.MockedFunction<typeof authenticationService.refreshToken>;
         mockRefreshToken.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.REFRESH, mockReq, mockRes, mockNext);

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
         mockRes.locals = { user_id: TEST_USER_ID };
         const expectedError = new Error("Token refresh failed");

         const mockRefreshToken = authenticationService.refreshToken as jest.MockedFunction<typeof authenticationService.refreshToken>;
         mockRefreshToken.mockRejectedValue(expectedError);

         await callServiceMethod(authenticationController.REFRESH, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(mockRes, expectedError, mockRefreshToken, [mockRes, mockRes.locals.user_id]);
      });
   });

   describe("LOGOUT /authentication", () => {
      it("should logout user successfully", async() => {
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };

         const mockLogoutUser = authenticationService.logoutUser as jest.MockedFunction<typeof authenticationService.logoutUser>;
         mockLogoutUser.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.LOGOUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockLogoutUser,
            [mockRes],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should handle service errors", async() => {
         const expectedError = new Error("Logout failed");

         const mockLogoutUser = authenticationService.logoutUser as jest.MockedFunction<typeof authenticationService.logoutUser>;
         mockLogoutUser.mockRejectedValue(expectedError);

         await callServiceMethod(authenticationController.LOGOUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(mockRes, expectedError, mockLogoutUser, [mockRes]);
      });

      it("should handle multiple logout calls", async() => {
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };

         const mockLogoutUser = authenticationService.logoutUser as jest.MockedFunction<typeof authenticationService.logoutUser>;
         mockLogoutUser.mockResolvedValue(mockResponse);

         await callServiceMethod(authenticationController.LOGOUT, mockReq, mockRes, mockNext);
         expect(mockLogoutUser).toHaveBeenCalledTimes(1);

         await callServiceMethod(authenticationController.LOGOUT, mockReq, mockRes, mockNext);
         expect(mockLogoutUser).toHaveBeenCalledTimes(2);
      });
   });
});