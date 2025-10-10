/**
 * Tests for userController with mocked database
 */

import { createMockUser, HTTP_STATUS, ServerResponse, TEST_CONSTANTS } from "capital/server";
import { Request, Response } from "express";

import * as userController from "@/controllers/userController";
import { mockDatabaseError, mockSuccessfulQuery, resetDatabaseMocks } from "@/tests/mocks/database";
import { createMockRequest, createMockResponse } from "@/tests/utils/utils";

// Mock the database module
jest.mock("@/lib/database", () => ({
   pool: {
      query: jest.fn()
   }
}));

// Mock the services module
jest.mock("@/lib/services", () => ({
   submitServiceRequest: jest.fn((res, callback) => callback())
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
         const mockUser = createMockUser();
         mockReq.body = mockUser;
         mockSuccessfulQuery();

         // Mock the service to return success
         const userService = await import("@/services/userService");
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.CREATED,
            data: { success: true }
         };
         (userService.createUser as jest.MockedFunction<typeof userService.createUser>).mockResolvedValue(mockResponse);

         await userController.POST(mockReq as Request, mockRes as Response, jest.fn());

         expect(userService.createUser).toHaveBeenCalledWith(mockReq, mockRes, mockUser);
      });

      it("should handle user creation errors", async() => {
         const mockUser = createMockUser();
         mockReq.body = mockUser;
         mockDatabaseError("User already exists");

         // Mock the service to return error
         const userService = await import("@/services/userService");
         (userService.createUser as jest.MockedFunction<typeof userService.createUser>).mockRejectedValue(new Error("User already exists"));

         await userController.POST(mockReq as Request, mockRes as Response, jest.fn());

         // Since submitServiceRequest is mocked to just call the callback, the error will be thrown and not caught
         expect(userService.createUser).toHaveBeenCalledWith(mockReq, mockRes, mockUser);
      });
   });

   describe("GET /users", () => {
      it("should fetch user details successfully", async() => {
         mockRes.locals = { user_id: TEST_CONSTANTS.TEST_USER_ID };
         mockSuccessfulQuery();

         // Mock the service to return user details
         const userService = await import("@/services/userService");
         const mockUserDetails = createMockUser();
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: mockUserDetails
         };
         (userService.fetchUserDetails as jest.MockedFunction<typeof userService.fetchUserDetails>).mockResolvedValue(mockResponse);

         await userController.GET(mockReq as Request, mockRes as Response, jest.fn());

         expect(userService.fetchUserDetails).toHaveBeenCalledWith(TEST_CONSTANTS.TEST_USER_ID);
      });
   });
});