import { createMockUser, TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";
import { User } from "capital/user";

import * as userController from "@/controllers/userController";
import { createMockMiddleware, MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";
import {
   arrangeMockServiceError,
   arrangeMockServiceSuccess,
   arrangeMockServiceValidationError,
   assertControllerErrorResponse,
   assertControllerSuccessResponse,
   callControllerMethod
} from "@/tests/utils/controllers";

jest.mock("@/lib/services", () => ({
   submitServiceRequest: require("@/tests/utils/controllers").createMockSubmitServiceRequest()
}));

jest.mock("@/services/userService");

describe("User Controller", () => {
   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: MockNextFunction;
   let userService: typeof import("@/services/userService");

   beforeEach(async() => {
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      userService = await import("@/services/userService");
   });

   describe("POST /users", () => {
      it("should return success for valid user creation", async() => {
         mockReq.body = createMockUser();
         const mockCreateUser = arrangeMockServiceSuccess(
            userService,
            "createUser",
            HTTP_STATUS.CREATED,
            { success: true }
         );

         await callControllerMethod(userController.POST, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockCreateUser,
            [mockRes, mockReq.body],
            HTTP_STATUS.CREATED,
            { success: true }
         );
      });

      it("should return validation errors for user creation conflicts", async() => {
         mockReq.body = createMockUser();
         const mockCreateUser = arrangeMockServiceValidationError(
            userService,
            "createUser",
            HTTP_STATUS.CONFLICT,
            {
               username: "Username already exists",
               email: "Email already exists"
            }
         );

         await callControllerMethod(userController.POST, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockCreateUser,
            [mockRes, mockReq.body],
            HTTP_STATUS.CONFLICT,
            {
               username: "Username already exists",
               email: "Email already exists"
            }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.body = createMockUser();
         const expectedError = new Error("Database connection failed");
         const mockCreateUser = arrangeMockServiceError(userService, "createUser", expectedError);

         await callControllerMethod(userController.POST, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockCreateUser,
            [mockRes, mockReq.body],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("GET /users", () => {
      it("should return user details for valid user ID", async() => {
         const mockUser: User = createMockUser();
         mockRes.locals = { user_id: TEST_USER_ID };
         const mockFetchUserDetails = arrangeMockServiceSuccess(
            userService,
            "fetchUserDetails",
            HTTP_STATUS.OK,
            mockUser
         );

         await callControllerMethod(userController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockFetchUserDetails,
            [mockRes.locals.user_id],
            HTTP_STATUS.OK,
            mockUser
         );
      });

      it("should return not found for invalid user ID", async() => {
         mockRes.locals = { user_id: "missing-user-id" };
         const mockFetchUserDetails = arrangeMockServiceValidationError(
            userService,
            "fetchUserDetails",
            HTTP_STATUS.NOT_FOUND,
            { user_id: "User does not exist based on the provided ID" }
         );

         await callControllerMethod(userController.GET, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockFetchUserDetails,
            [mockRes.locals.user_id],
            HTTP_STATUS.NOT_FOUND,
            { user_id: "User does not exist based on the provided ID" }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockRes.locals = { user_id: TEST_USER_ID };
         const expectedError = new Error("Database connection failed");
         const mockFetchUserDetails = arrangeMockServiceError(userService, "fetchUserDetails", expectedError);

         await callControllerMethod(userController.GET, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockFetchUserDetails,
            [mockRes.locals.user_id],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("PUT /users", () => {
      it("should return success for valid user account details update", async() => {
         mockRes.locals = { user_id: TEST_USER_ID };
         mockReq.body = { username: "newusername", email: "newemail@example.com" };
         const mockUpdateAccountDetails = arrangeMockServiceSuccess(
            userService,
            "updateAccountDetails",
            HTTP_STATUS.OK,
            { success: true }
         );

         await callControllerMethod(userController.PUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockUpdateAccountDetails,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should return validation errors for user update conflicts", async() => {
         mockRes.locals = { user_id: TEST_USER_ID };
         mockReq.body = { username: "newusername" };
         const mockUpdateAccountDetails = arrangeMockServiceValidationError(
            userService,
            "updateAccountDetails",
            HTTP_STATUS.CONFLICT,
            {
               username: "Username already exists"
            }
         );

         await callControllerMethod(userController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateAccountDetails,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.CONFLICT,
            {
               username: "Username already exists"
            }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockRes.locals = { user_id: TEST_USER_ID };
         const expectedError = new Error("Database connection failed");
         const mockUpdateAccountDetails = arrangeMockServiceError(userService, "updateAccountDetails", expectedError);

         await callControllerMethod(userController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockUpdateAccountDetails,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("DELETE /users", () => {
      it("should return success for valid user account deletion", async() => {
         mockRes.locals = { user_id: TEST_USER_ID };
         const mockDeleteAccount = arrangeMockServiceSuccess(
            userService,
            "deleteAccount",
            HTTP_STATUS.OK,
            { success: true }
         );

         await callControllerMethod(userController.DELETE, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockDeleteAccount,
            [mockRes],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should return validation errors for user not found", async() => {
         mockRes.locals = { user_id: TEST_USER_ID };
         const mockDeleteAccount = arrangeMockServiceValidationError(
            userService,
            "deleteAccount",
            HTTP_STATUS.NOT_FOUND,
            {
               user_id: "User does not exist based on the provided ID"
            }
         );

         await callControllerMethod(userController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockDeleteAccount,
            [mockRes],
            HTTP_STATUS.NOT_FOUND,
            {
               user_id: "User does not exist based on the provided ID"
            }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockRes.locals = { user_id: TEST_USER_ID };
         const expectedError = new Error("Database connection failed");
         const mockDeleteAccount = arrangeMockServiceError(userService, "deleteAccount", expectedError);

         await callControllerMethod(userController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockDeleteAccount,
            [mockRes],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });
});