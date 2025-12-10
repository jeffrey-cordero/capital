import { createValidLogin, TEST_USER_ID, VALID_LOGIN } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";

import * as authenticationController from "@/controllers/authenticationController";
import { createMockMiddleware, MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";
import {
   arrangeMockServiceError,
   arrangeMockServiceSuccess,
   arrangeMockServiceValidationError,
   assertControllerErrorResponse,
   assertControllerSuccessResponse,
   callControllerMethod
} from "@/tests/utils/controllers";
import { TEST_TOKENS } from "@/tests/utils/tokens";

jest.mock("@/lib/logger");
jest.mock("@/services/authenticationService");

describe("Authentication Controller", () => {
   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: MockNextFunction;
   let authenticationService: typeof import("@/services/authenticationService");

   beforeEach(async() => {
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      authenticationService = await import("@/services/authenticationService");
   });

   describe("GET /authentication", () => {
      it("should return authenticated for valid token", async() => {
         mockReq.cookies = { access_token: TEST_TOKENS.VALID_ACCESS };
         const mockGetAuthentication = arrangeMockServiceSuccess(
            authenticationService,
            "getAuthentication",
            HTTP_STATUS.OK,
            { authenticated: true }
         );

         await callControllerMethod(authenticationController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, mockReq.cookies.access_token],
            HTTP_STATUS.OK,
            { authenticated: true }
         );
      });

      it("should return refreshable for expired token", async() => {
         mockReq.cookies = { access_token: TEST_TOKENS.EXPIRED_ACCESS };
         const mockGetAuthentication = arrangeMockServiceSuccess(
            authenticationService,
            "getAuthentication",
            HTTP_STATUS.UNAUTHORIZED,
            { refreshable: true }
         );

         await callControllerMethod(authenticationController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, mockReq.cookies.access_token],
            HTTP_STATUS.UNAUTHORIZED,
            { refreshable: true }
         );
      });

      it("should return unauthenticated for invalid access token", async() => {
         mockReq.cookies = { access_token: TEST_TOKENS.INVALID_ACCESS };
         const mockGetAuthentication = arrangeMockServiceSuccess(
            authenticationService,
            "getAuthentication",
            HTTP_STATUS.OK,
            { authenticated: false }
         );

         await callControllerMethod(authenticationController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, mockReq.cookies.access_token],
            HTTP_STATUS.OK,
            { authenticated: false }
         );
      });

      it("should return unauthenticated for missing access token in cookies", async() => {
         mockReq.cookies = {};
         const mockGetAuthentication = arrangeMockServiceSuccess(
            authenticationService,
            "getAuthentication",
            HTTP_STATUS.OK,
            { authenticated: false }
         );

         await callControllerMethod(authenticationController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockGetAuthentication,
            [mockRes, undefined],
            HTTP_STATUS.OK,
            { authenticated: false }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.cookies = { access_token: TEST_TOKENS.VALID_ACCESS };
         const expectedError = new Error("Database connection failed");
         const mockGetAuthentication = arrangeMockServiceError(authenticationService, "getAuthentication", expectedError);

         await callControllerMethod(authenticationController.GET, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockGetAuthentication,
            [mockRes, mockReq.cookies.access_token],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("POST /authentication/login", () => {
      it("should authenticate user with valid credentials", async() => {
         mockReq.body = createValidLogin();
         const mockAuthenticateUser = arrangeMockServiceSuccess(
            authenticationService,
            "authenticateUser",
            HTTP_STATUS.OK,
            { success: true }
         );

         await callControllerMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockAuthenticateUser,
            [mockRes, mockReq.body.username, mockReq.body.password],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should return validation errors for invalid credentials", async() => {
         mockReq.body = createValidLogin();
         const mockAuthenticateUser = arrangeMockServiceValidationError(
            authenticationService,
            "authenticateUser",
            HTTP_STATUS.UNAUTHORIZED,
            {
               username: "Invalid credentials",
               password: "Invalid credentials"
            }
         );

         await callControllerMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockAuthenticateUser,
            [mockRes, mockReq.body.username, mockReq.body.password],
            HTTP_STATUS.UNAUTHORIZED,
            {
               username: "Invalid credentials",
               password: "Invalid credentials"
            }
         );
      });

      it("should return validation error for missing username", async() => {
         mockReq.body = { password: VALID_LOGIN.password };
         const mockAuthenticateUser = arrangeMockServiceValidationError(
            authenticationService,
            "authenticateUser",
            HTTP_STATUS.BAD_REQUEST,
            {
               username: "Required"
            }
         );

         await callControllerMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockAuthenticateUser,
            [mockRes, undefined, mockReq.body.password],
            HTTP_STATUS.BAD_REQUEST,
            {
               username: "Required"
            }
         );
      });

      it("should return validation error for missing password", async() => {
         mockReq.body = { username: VALID_LOGIN.username };
         const mockAuthenticateUser = arrangeMockServiceValidationError(
            authenticationService,
            "authenticateUser",
            HTTP_STATUS.BAD_REQUEST,
            {
               password: "Required"
            }
         );

         await callControllerMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockAuthenticateUser,
            [mockRes, mockReq.body.username, undefined],
            HTTP_STATUS.BAD_REQUEST,
            {
               password: "Required"
            }
         );
      });

      it("should handle missing username and password", async() => {
         mockReq.body = {};
         const mockAuthenticateUser = arrangeMockServiceValidationError(
            authenticationService,
            "authenticateUser",
            HTTP_STATUS.BAD_REQUEST,
            {
               username: "Required",
               password: "Required"
            }
         );

         await callControllerMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockAuthenticateUser,
            [mockRes, mockReq.body.username, undefined],
            HTTP_STATUS.BAD_REQUEST,
            {
               username: "Required",
               password: "Required"
            }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.body = createValidLogin();
         const expectedError = new Error("Database connection failed");
         const mockAuthenticateUser = arrangeMockServiceError(authenticationService, "authenticateUser", expectedError);

         await callControllerMethod(authenticationController.LOGIN, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockAuthenticateUser,
            [mockRes, mockReq.body.username, mockReq.body.password],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("POST /authentication/refresh", () => {
      it("should return success for valid refresh token", async() => {
         mockRes.locals = { user_id: TEST_USER_ID };
         const mockRefreshToken = arrangeMockServiceSuccess(
            authenticationService,
            "refreshToken",
            HTTP_STATUS.OK,
            { success: true }
         );

         await callControllerMethod(authenticationController.REFRESH, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockRefreshToken,
            [mockRes, mockRes.locals.user_id],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockRes.locals = { user_id: TEST_USER_ID };
         const expectedError = new Error("Internal server error");
         const mockRefreshToken = arrangeMockServiceError(authenticationService, "refreshToken", expectedError);

         await callControllerMethod(authenticationController.REFRESH, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockRefreshToken,
            [mockRes, mockRes.locals.user_id],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("POST /authentication/logout", () => {
      it("should return success for valid access token", async() => {
         const mockLogoutUser = arrangeMockServiceSuccess(
            authenticationService,
            "logoutUser",
            HTTP_STATUS.OK,
            { success: true }
         );

         await callControllerMethod(authenticationController.LOGOUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockLogoutUser,
            [mockRes],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should return internal server error for service errors", async() => {
         const expectedError = new Error("Internal server error");
         const mockLogoutUser = arrangeMockServiceError(authenticationService, "logoutUser", expectedError);

         await callControllerMethod(authenticationController.LOGOUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockLogoutUser,
            [mockRes],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });

      it("should return success for multiple logout calls", async() => {
         // Clear all of the prior mocked service function calls to reset the mock counter
         jest.clearAllMocks();

         const mockLogoutUser = arrangeMockServiceSuccess(
            authenticationService,
            "logoutUser",
            HTTP_STATUS.OK,
            { success: true }
         );

         for (let i = 0; i < 3; i++) {
            await callControllerMethod(authenticationController.LOGOUT, mockReq, mockRes, mockNext);
            expect(mockLogoutUser).toHaveBeenCalledTimes(i + 1);
            assertControllerSuccessResponse(
               mockRes,
               mockLogoutUser,
               [mockRes],
               HTTP_STATUS.OK,
               { success: true }
            );
         }
      });
   });
});