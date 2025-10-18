import { createMockUser, TEST_CONSTANTS } from "capital/mocks/server";
import { HTTP_STATUS, ServerResponse } from "capital/server";

import * as userController from "@/controllers/userController";
import { createMockMiddleware, MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";
import { assertControllerSuccessResponse, assertControllerValidationErrorResponse, callServiceMethod } from "@/tests/utils/controllers";

/**
 * Mock the services module
 */
jest.mock("@/lib/services", () => ({
   submitServiceRequest: require("@/tests/utils/controllers").createMockSubmitServiceRequest()
}));

/**
 * Mock user service methods
 */
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
         const mockUser = createMockUser();
         mockReq.body = mockUser;

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.CREATED,
            data: { success: true }
         };
         const mockCreateUser = userService.createUser as jest.MockedFunction<typeof userService.createUser>;
         mockCreateUser.mockResolvedValue(mockResponse);

         await callServiceMethod(userController.POST, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockCreateUser,
            [mockReq, mockRes, mockUser],
            HTTP_STATUS.CREATED,
            { success: true }
         );
      });

      it("should handle user creation conflicts", async() => {
         const mockUser = createMockUser();
         mockReq.body = mockUser;

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.CONFLICT,
            errors: {
               username: "Username already exists",
               email: "Email already exists"
            }
         };

         const mockCreateUser = userService.createUser as jest.MockedFunction<typeof userService.createUser>;
         mockCreateUser.mockResolvedValue(mockResponse);

         await callServiceMethod(userController.POST, mockReq, mockRes, mockNext);

         assertControllerValidationErrorResponse(
            mockRes,
            mockCreateUser,
            [mockReq, mockRes, mockUser],
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
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };

         const mockUserDetails = createMockUser();
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: mockUserDetails
         };
         const mockFetchUserDetails = userService.fetchUserDetails as jest.MockedFunction<typeof userService.fetchUserDetails>;
         mockFetchUserDetails.mockResolvedValue(mockResponse);

         await callServiceMethod(userController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockFetchUserDetails,
            [mockRes.locals.user_id],
            HTTP_STATUS.OK,
            mockUserDetails
         );
      });
   });

   describe("PUT /users", () => {
      it("should update user account details successfully", async() => {
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         const mockUpdates = { username: "newusername", email: "newemail@example.com" };
         mockReq.body = mockUpdates;

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };
         const mockUpdateAccountDetails = userService.updateAccountDetails as jest.MockedFunction<typeof userService.updateAccountDetails>;
         mockUpdateAccountDetails.mockResolvedValue(mockResponse);

         await callServiceMethod(userController.PUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockUpdateAccountDetails,
            [TEST_CONSTANTS.TEST_USER_ID, mockUpdates],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should handle user update conflicts", async() => {
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         const mockUpdates = { username: "newusername" };
         mockReq.body = mockUpdates;

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.CONFLICT,
            errors: {
               username: "Username already exists"
            }
         };

         const mockUpdateAccountDetails = userService.updateAccountDetails as jest.MockedFunction<typeof userService.updateAccountDetails>;
         mockUpdateAccountDetails.mockResolvedValue(mockResponse);

         await callServiceMethod(userController.PUT, mockReq, mockRes, mockNext);

         assertControllerValidationErrorResponse(
            mockRes,
            mockUpdateAccountDetails,
            [TEST_CONSTANTS.TEST_USER_ID, mockUpdates],
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

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };
         const mockDeleteAccount = userService.deleteAccount as jest.MockedFunction<typeof userService.deleteAccount>;
         mockDeleteAccount.mockResolvedValue(mockResponse);

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

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.NOT_FOUND,
            errors: {
               user_id: "User not found"
            }
         };

         const mockDeleteAccount = userService.deleteAccount as jest.MockedFunction<typeof userService.deleteAccount>;
         mockDeleteAccount.mockResolvedValue(mockResponse);

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