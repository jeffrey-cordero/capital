/**
 * Tests for userController with mocked database
 */

import { createMockUser, TEST_CONSTANTS } from "capital/mocks/server";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import { Request, Response } from "express";

import * as userController from "@/controllers/userController";
import { mockDatabaseError, mockSuccessfulQuery, resetDatabaseMocks } from "@/tests/mocks/database";
import { assertControllerErrorResponse, createSubmitServiceRequestMock, testServiceSuccess, testServiceThrownError } from "@/tests/utils/controllers";
import { createMockRequest, createMockResponse } from "@/tests/utils/utils";

// Mock the database module
jest.mock("@/lib/database", () => ({
   pool: {
      query: jest.fn()
   }
}));

// Mock the services module
jest.mock("@/lib/services", () => ({
   submitServiceRequest: createSubmitServiceRequestMock()
}));

// Mock the userService module
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
         testServiceSuccess(mockCreateUser, mockResponse);

         // Act
         await userController.POST(mockReq as Request, mockRes as Response, jest.fn());

         // Assert
         expect(mockCreateUser).toHaveBeenCalledWith(mockReq, mockRes, mockUser);
      });

      it("should handle user creation errors", async() => {
         // Arrange
         const mockUser = createMockUser();
         mockReq.body = mockUser;
         mockDatabaseError("User already exists");

         const userService = await import("@/services/userService");
         const mockCreateUser = userService.createUser as jest.MockedFunction<typeof userService.createUser>;
         testServiceThrownError(mockCreateUser, new Error("User already exists"));

         // Act
         await userController.POST(mockReq as Request, mockRes as Response, jest.fn());

         // Assert
         expect(mockCreateUser).toHaveBeenCalledWith(mockReq, mockRes, mockUser);
         assertControllerErrorResponse(mockRes);
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
         testServiceSuccess(mockFetchUserDetails, mockResponse);

         // Act
         await userController.GET(mockReq as Request, mockRes as Response, jest.fn());

         // Assert
         expect(mockFetchUserDetails).toHaveBeenCalledWith(mockRes.locals.user_id);
      });
   });
});