import { createMockUser, TEST_CONSTANTS } from "capital/mocks/server";
import { HTTP_STATUS } from "capital/server";
import { User } from "capital/user";

import * as userController from "@/controllers/userController";
import { createMockMiddleware, MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";
import {
   assertControllerSuccessResponse,
   assertControllerValidationErrorResponse,
   callServiceMethod,
   setupMockServiceSuccess,
   setupMockServiceValidationError
} from "@/tests/utils/controllers";

jest.mock("@/lib/services", () => ({
   submitServiceRequest: require("@/tests/utils/controllers").createMockSubmitServiceRequest()
}));

jest.mock("@/services/userService", () => ({
   createUser: jest.fn(),
   fetchUserDetails: jest.fn(),
   updateAccountDetails: jest.fn(),
   deleteAccount: jest.fn()
}));

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
      it("should create a new user successfully", async() => {
         mockReq.body = createMockUser();
         const mockCreateUser = setupMockServiceSuccess(userService, "createUser", HTTP_STATUS.CREATED, { success: true });

         await callServiceMethod(userController.POST, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockCreateUser,
            [mockReq, mockRes, mockReq.body],
            HTTP_STATUS.CREATED,
            { success: true }
         );
      });

      it("should handle user creation conflicts", async() => {
         mockReq.body = createMockUser();
         const mockCreateUser = setupMockServiceValidationError(userService, "createUser", HTTP_STATUS.CONFLICT, {
            username: "Username already exists",
            email: "Email already exists"
         });

         await callServiceMethod(userController.POST, mockReq, mockRes, mockNext);

         assertControllerValidationErrorResponse(
            mockRes,
            mockCreateUser,
            [mockReq, mockRes, mockReq.body],
            HTTP_STATUS.CONFLICT,
            {
               username: "Username already exists",
               email: "Email already exists"
            }
         );
      });
   });

   describe("GET /users", () => {
      it("should fetch user details successfully", async() => {
         const mockUser: User = createMockUser();
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         const mockFetchUserDetails = setupMockServiceSuccess(userService, "fetchUserDetails", HTTP_STATUS.OK, mockUser);

         await callServiceMethod(userController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockFetchUserDetails,
            [mockRes.locals.user_id],
            HTTP_STATUS.OK,
            mockUser
         );
      });
   });

   describe("PUT /users", () => {
      it("should update user account details successfully", async() => {
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         mockReq.body = { username: "newusername", email: "newemail@example.com" };
         const mockUpdateAccountDetails = setupMockServiceSuccess(userService, "updateAccountDetails", HTTP_STATUS.OK, { success: true });

         await callServiceMethod(userController.PUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockUpdateAccountDetails,
            [TEST_CONSTANTS.TEST_USER_ID, mockReq.body],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should handle user update conflicts", async() => {
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         mockReq.body = { username: "newusername" };
         const mockUpdateAccountDetails = setupMockServiceValidationError(userService, "updateAccountDetails", HTTP_STATUS.CONFLICT, {
            username: "Username already exists"
         });

         await callServiceMethod(userController.PUT, mockReq, mockRes, mockNext);

         assertControllerValidationErrorResponse(
            mockRes,
            mockUpdateAccountDetails,
            [TEST_CONSTANTS.TEST_USER_ID, mockReq.body],
            HTTP_STATUS.CONFLICT,
            {
               username: "Username already exists"
            }
         );
      });
   });

   describe("DELETE /users", () => {
      it("should delete user account successfully", async() => {
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         const mockDeleteAccount = setupMockServiceSuccess(userService, "deleteAccount", HTTP_STATUS.OK, { success: true });

         await callServiceMethod(userController.DELETE, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockDeleteAccount,
            [mockReq, mockRes],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should handle user not found during deletion", async() => {
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         const mockDeleteAccount = setupMockServiceValidationError(userService, "deleteAccount", HTTP_STATUS.NOT_FOUND, {
            user_id: "User not found"
         });

         await callServiceMethod(userController.DELETE, mockReq, mockRes, mockNext);

         assertControllerValidationErrorResponse(
            mockRes,
            mockDeleteAccount,
            [mockReq, mockRes],
            HTTP_STATUS.NOT_FOUND,
            {
               user_id: "User not found"
            }
         );
      });
   });
});