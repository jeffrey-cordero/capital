/**
 * Tests for userController with mocked database
 */

import { createMockUser, TEST_CONSTANTS } from "capital/mocks/server";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import { Request, Response } from "express";

import * as userController from "@/controllers/userController";
import { mockDatabaseError, mockSuccessfulQuery, resetDatabaseMocks } from "@/tests/mocks/database";
import { createMockRequest, createMockResponse } from "@/tests/utils/api";
import { assertControllerErrorResponse, assertControllerSuccessResponse } from "@/tests/utils/controllers";

/**
 * Mock the database module
 */
jest.mock("@/lib/database", () => ({
   pool: {
      query: jest.fn()
   }
}));

/**
 * Mock the services module
 */
jest.mock("@/lib/services", () => {
   const { createMockSubmitServiceRequest } = require("@/tests/utils/controllers");

   return { submitServiceRequest: createMockSubmitServiceRequest() };
});

/**
 * Mock the userService module
 */
jest.mock("@/services/userService", () => ({
   createUser: jest.fn(),
   fetchUserDetails: jest.fn(),
   updateAccountDetails: jest.fn(),
   deleteAccount: jest.fn()
}));

describe("User Controller", () => {
   let mockReq: Partial<Request>;
   let mockRes: Partial<Response>;

   beforeEach(() => {
      mockReq = createMockRequest();
      mockRes = createMockResponse();
      resetDatabaseMocks();
   });

   describe("POST /users", () => {
      it("should create a new user successfully", async() => {
         // Arrange
         const mockUser = createMockUser();
         mockReq.body = mockUser;
         mockSuccessfulQuery();

         const userService = await import("@/services/userService");
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.CREATED,
            data: { success: true }
         };
         const mockCreateUser = userService.createUser as jest.MockedFunction<typeof userService.createUser>;
         mockCreateUser.mockResolvedValue(mockResponse);

         // Act
         await userController.POST(mockReq as Request, mockRes as Response, jest.fn());

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockCreateUser,
            [mockReq, mockRes, mockUser],
            HTTP_STATUS.CREATED,
            { success: true }
         );
      });

      it("should handle user creation errors", async() => {
         // Arrange
         const mockUser = createMockUser();
         mockReq.body = mockUser;
         mockDatabaseError("User already exists");
         const expectedError = new Error("User already exists");

         const userService = await import("@/services/userService");
         const mockCreateUser = userService.createUser as jest.MockedFunction<typeof userService.createUser>;
         mockCreateUser.mockRejectedValue(expectedError);

         // Act
         await userController.POST(mockReq as Request, mockRes as Response, jest.fn());

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockCreateUser, [mockReq, mockRes, mockUser]);
      });
   });

   describe("GET /users", () => {
      it("should fetch user details successfully", async() => {
         // Arrange
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         mockSuccessfulQuery();

         const userService = await import("@/services/userService");
         const mockUserDetails = createMockUser();
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: mockUserDetails
         };
         const mockFetchUserDetails = userService.fetchUserDetails as jest.MockedFunction<typeof userService.fetchUserDetails>;
         mockFetchUserDetails.mockResolvedValue(mockResponse);

         // Act
         await userController.GET(mockReq as Request, mockRes as Response, jest.fn());

         // Assert
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
         // Arrange
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         const mockUpdates = { username: "newusername", email: "newemail@example.com" };
         mockReq.body = mockUpdates;
         mockSuccessfulQuery();

         const userService = await import("@/services/userService");
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };
         const mockUpdateAccountDetails = userService.updateAccountDetails as jest.MockedFunction<typeof userService.updateAccountDetails>;
         mockUpdateAccountDetails.mockResolvedValue(mockResponse);

         // Act
         await userController.PUT(mockReq as Request, mockRes as Response, jest.fn());

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockUpdateAccountDetails,
            [TEST_CONSTANTS.TEST_USER_ID, mockUpdates],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should handle user update errors", async() => {
         // Arrange
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         const mockUpdates = { username: "newusername" };
         mockReq.body = mockUpdates;
         mockDatabaseError("Update failed");
         const expectedError = new Error("Update failed");

         const userService = await import("@/services/userService");
         const mockUpdateAccountDetails = userService.updateAccountDetails as jest.MockedFunction<typeof userService.updateAccountDetails>;
         mockUpdateAccountDetails.mockRejectedValue(expectedError);

         // Act
         await userController.PUT(mockReq as Request, mockRes as Response, jest.fn());

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockUpdateAccountDetails, [TEST_CONSTANTS.TEST_USER_ID, mockUpdates]);
      });
   });

   describe("DELETE /users", () => {
      it("should delete user account successfully", async() => {
         // Arrange
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         mockSuccessfulQuery();

         const userService = await import("@/services/userService");
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: { success: true }
         };
         const mockDeleteAccount = userService.deleteAccount as jest.MockedFunction<typeof userService.deleteAccount>;
         mockDeleteAccount.mockResolvedValue(mockResponse);

         // Act
         await userController.DELETE(mockReq as Request, mockRes as Response, jest.fn());

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockDeleteAccount,
            [mockReq, mockRes],
            HTTP_STATUS.OK,
            { success: true }
         );
      });

      it("should handle user deletion errors", async() => {
         // Arrange
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         mockDatabaseError("Deletion failed");
         const expectedError = new Error("Deletion failed");

         const userService = await import("@/services/userService");
         const mockDeleteAccount = userService.deleteAccount as jest.MockedFunction<typeof userService.deleteAccount>;
         mockDeleteAccount.mockRejectedValue(expectedError);

         // Act
         await userController.DELETE(mockReq as Request, mockRes as Response, jest.fn());

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockDeleteAccount, [mockReq, mockRes]);
      });
   });
});