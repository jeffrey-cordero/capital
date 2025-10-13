/**
 * Tests for accountsController with mocked services
 */

import { Account } from "capital/accounts";
import { createMockAccount } from "capital/mocks/accounts";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import { Request, Response } from "express";

import * as accountsController from "@/controllers/accountsController";
import { TEST_USER_ID } from "@/tests/constants/tokens";
import { createMockRequest, createMockResponse } from "@/tests/utils/api";
import {
   assertControllerErrorResponse,
   assertControllerSuccessResponse,
   testServiceErrorResponse,
   testServiceSuccess,
   testServiceThrownError
} from "@/tests/utils/controllers";

/**
 * Mock the services module
 */
jest.mock("@/lib/services", () => {
   const { createMockSubmitServiceRequest } = require("@/tests/utils/controllers");
   return { submitServiceRequest: createMockSubmitServiceRequest() };
});

/**
 * Mock the accountsService module
 */
jest.mock("@/services/accountsService", () => ({
   fetchAccounts: jest.fn(),
   createAccount: jest.fn(),
   updateAccount: jest.fn(),
   updateAccountsOrdering: jest.fn(),
   deleteAccount: jest.fn()
}));

describe("Accounts Controller", () => {
   let mockReq: Partial<Request>;
   let mockRes: Partial<Response>;
   let mockNext: jest.Mock;

   beforeEach(() => {
      mockReq = createMockRequest();
      mockRes = createMockResponse();
      mockRes.locals = { user_id: TEST_USER_ID };
      mockNext = jest.fn();
      jest.clearAllMocks();
   });

   describe("GET /accounts", () => {
      it("should fetch user accounts successfully", async() => {
         // Arrange
         const mockAccounts: Account[] = [
            createMockAccount("Checking") as Account,
            createMockAccount("Savings") as Account
         ];

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: mockAccounts
         };

         const accountsService = await import("@/services/accountsService");
         const mockFetchAccounts = accountsService.fetchAccounts as jest.MockedFunction<typeof accountsService.fetchAccounts>;
         testServiceSuccess(mockFetchAccounts, mockResponse);

         // Act
         await accountsController.GET(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockFetchAccounts,
            [TEST_USER_ID],
            HTTP_STATUS.OK,
            mockAccounts
         );
      });

      it("should return empty array for new user", async() => {
         // Arrange
         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.OK,
            data: []
         };

         const accountsService = await import("@/services/accountsService");
         const mockFetchAccounts = accountsService.fetchAccounts as jest.MockedFunction<typeof accountsService.fetchAccounts>;
         testServiceSuccess(mockFetchAccounts, mockResponse);

         // Act
         await accountsController.GET(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockFetchAccounts,
            [TEST_USER_ID],
            HTTP_STATUS.OK,
            []
         );
      });

      it("should handle service errors", async() => {
         // Arrange
         const expectedError = new Error("Database connection failed");

         const accountsService = await import("@/services/accountsService");
         const mockFetchAccounts = accountsService.fetchAccounts as jest.MockedFunction<typeof accountsService.fetchAccounts>;
         testServiceThrownError(mockFetchAccounts, expectedError);

         // Act
         await accountsController.GET(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockFetchAccounts);
      });

      it("should handle missing user_id", async() => {
         // Arrange
         mockRes.locals = {};
         const expectedError = new Error("Missing user_id");

         const accountsService = await import("@/services/accountsService");
         const mockFetchAccounts = accountsService.fetchAccounts as jest.MockedFunction<typeof accountsService.fetchAccounts>;
         testServiceThrownError(mockFetchAccounts, expectedError);

         // Act
         await accountsController.GET(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockFetchAccounts);
      });
   });

   describe("POST /accounts", () => {
      it("should create account successfully", async() => {
         // Arrange
         const newAccount = createMockAccount("Checking");
         mockReq.body = newAccount;

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.CREATED,
            data: { account_id: "new-account-123" }
         };

         const accountsService = await import("@/services/accountsService");
         const mockCreateAccount = accountsService.createAccount as jest.MockedFunction<typeof accountsService.createAccount>;
         testServiceSuccess(mockCreateAccount, mockResponse);

         // Act
         await accountsController.POST(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockCreateAccount,
            [TEST_USER_ID, newAccount],
            HTTP_STATUS.CREATED,
            { account_id: "new-account-123" }
         );
      });

      it("should handle validation errors", async() => {
         // Arrange
         const invalidAccount = {
            name: "", // Invalid: empty name
            type: "InvalidType", // Invalid: not in enum
            balance: "invalid-balance" // Invalid: not a number
         };
         mockReq.body = invalidAccount;

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.BAD_REQUEST,
            errors: {
               name: "Name must be at least 1 character",
               type: "Invalid account type",
               balance: "Balance must be a valid currency amount"
            }
         };

         const accountsService = await import("@/services/accountsService");
         const mockCreateAccount = accountsService.createAccount as jest.MockedFunction<typeof accountsService.createAccount>;
         testServiceErrorResponse(mockCreateAccount, mockResponse);

         // Act
         await accountsController.POST(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         expect(mockCreateAccount).toHaveBeenCalledWith(TEST_USER_ID, invalidAccount);
      });

      it("should handle missing account data", async() => {
         // Arrange
         mockReq.body = {};
         const expectedError = new Error("Missing account data");

         const accountsService = await import("@/services/accountsService");
         const mockCreateAccount = accountsService.createAccount as jest.MockedFunction<typeof accountsService.createAccount>;
         testServiceThrownError(mockCreateAccount, expectedError);

         // Act
         await accountsController.POST(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockCreateAccount);
      });

      it("should handle service errors", async() => {
         // Arrange
         const newAccount = createMockAccount("Savings");
         mockReq.body = newAccount;
         const expectedError = new Error("Database insert failed");

         const accountsService = await import("@/services/accountsService");
         const mockCreateAccount = accountsService.createAccount as jest.MockedFunction<typeof accountsService.createAccount>;
         testServiceThrownError(mockCreateAccount, expectedError);

         // Act
         await accountsController.POST(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockCreateAccount);
      });
   });

   describe("PUT /accounts/:id", () => {
      it("should update account details successfully", async() => {
         // Arrange
         const accountId = "account-123";
         const updateData = {
            name: "Updated Checking Account",
            balance: 1500.00,
            last_updated: new Date().toISOString()
         };
         mockReq.params = { id: accountId };
         mockReq.body = updateData;

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.NO_CONTENT,
            data: undefined
         };

         const accountsService = await import("@/services/accountsService");
         const mockUpdateAccount = accountsService.updateAccount as jest.MockedFunction<typeof accountsService.updateAccount>;
         testServiceSuccess(mockUpdateAccount, mockResponse);

         // Act
         await accountsController.PUT(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         const expectedData = { ...updateData, account_id: accountId };
         assertControllerSuccessResponse(
            mockRes,
            mockUpdateAccount,
            [TEST_USER_ID, expectedData],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should update account ordering successfully", async() => {
         // Arrange
         const orderingData = {
            accountsIds: ["account-1", "account-2", "account-3"]
         };
         mockReq.params = { id: "ordering" };
         mockReq.body = orderingData;

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.NO_CONTENT,
            data: undefined
         };

         const accountsService = await import("@/services/accountsService");
         const mockUpdateAccountsOrdering = accountsService.updateAccountsOrdering as jest.MockedFunction<typeof accountsService.updateAccountsOrdering>;
         testServiceSuccess(mockUpdateAccountsOrdering, mockResponse);

         // Act
         await accountsController.PUT(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockUpdateAccountsOrdering,
            [TEST_USER_ID, orderingData.accountsIds],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should handle account not found", async() => {
         // Arrange
         const accountId = "non-existent-account";
         const updateData = {
            name: "Updated Account",
            balance: 1000.00,
            last_updated: new Date().toISOString()
         };
         mockReq.params = { id: accountId };
         mockReq.body = updateData;

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.NOT_FOUND,
            errors: {
               account_id: "Account does not exist based on the provided ID"
            }
         };

         const accountsService = await import("@/services/accountsService");
         const mockUpdateAccount = accountsService.updateAccount as jest.MockedFunction<typeof accountsService.updateAccount>;
         testServiceErrorResponse(mockUpdateAccount, mockResponse);

         // Act
         await accountsController.PUT(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         const expectedData = { ...updateData, account_id: accountId };
         expect(mockUpdateAccount).toHaveBeenCalledWith(TEST_USER_ID, expectedData);
      });

      it("should handle validation errors", async() => {
         // Arrange
         const accountId = "account-123";
         const invalidUpdateData = {
            name: "", // Invalid: empty name
            balance: "invalid-balance" // Invalid: not a number
         };
         mockReq.params = { id: accountId };
         mockReq.body = invalidUpdateData;

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.BAD_REQUEST,
            errors: {
               name: "Name must be at least 1 character",
               balance: "Balance must be a valid currency amount"
            }
         };

         const accountsService = await import("@/services/accountsService");
         const mockUpdateAccount = accountsService.updateAccount as jest.MockedFunction<typeof accountsService.updateAccount>;
         testServiceErrorResponse(mockUpdateAccount, mockResponse);

         // Act
         await accountsController.PUT(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         const expectedData = { ...invalidUpdateData, account_id: accountId };
         expect(mockUpdateAccount).toHaveBeenCalledWith(TEST_USER_ID, expectedData);
      });

      it("should handle missing account ID", async() => {
         // Arrange
         mockReq.params = {};
         mockReq.body = { name: "Updated Account" };
         const expectedError = new Error("Missing account ID");

         const accountsService = await import("@/services/accountsService");
         const mockUpdateAccount = accountsService.updateAccount as jest.MockedFunction<typeof accountsService.updateAccount>;
         testServiceThrownError(mockUpdateAccount, expectedError);

         // Act
         await accountsController.PUT(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockUpdateAccount);
      });

      it("should handle service errors", async() => {
         // Arrange
         const accountId = "account-123";
         const updateData = {
            name: "Updated Account",
            balance: 1000.00,
            last_updated: new Date().toISOString()
         };
         mockReq.params = { id: accountId };
         mockReq.body = updateData;
         const expectedError = new Error("Database update failed");

         const accountsService = await import("@/services/accountsService");
         const mockUpdateAccount = accountsService.updateAccount as jest.MockedFunction<typeof accountsService.updateAccount>;
         testServiceThrownError(mockUpdateAccount, expectedError);

         // Act
         await accountsController.PUT(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         const expectedData = { ...updateData, account_id: accountId };
         assertControllerErrorResponse(mockRes, expectedError, mockUpdateAccount);
      });
   });

   describe("DELETE /accounts/:id", () => {
      it("should delete account successfully", async() => {
         // Arrange
         const accountId = "account-123";
         mockReq.params = { id: accountId };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.NO_CONTENT,
            data: undefined
         };

         const accountsService = await import("@/services/accountsService");
         const mockDeleteAccount = accountsService.deleteAccount as jest.MockedFunction<typeof accountsService.deleteAccount>;
         testServiceSuccess(mockDeleteAccount, mockResponse);

         // Act
         await accountsController.DELETE(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerSuccessResponse(
            mockRes,
            mockDeleteAccount,
            [TEST_USER_ID, accountId],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should handle account not found", async() => {
         // Arrange
         const accountId = "non-existent-account";
         mockReq.params = { id: accountId };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.NOT_FOUND,
            errors: {
               account_id: "Account does not exist based on the provided ID or does not belong to the user"
            }
         };

         const accountsService = await import("@/services/accountsService");
         const mockDeleteAccount = accountsService.deleteAccount as jest.MockedFunction<typeof accountsService.deleteAccount>;
         testServiceErrorResponse(mockDeleteAccount, mockResponse);

         // Act
         await accountsController.DELETE(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         expect(mockDeleteAccount).toHaveBeenCalledWith(TEST_USER_ID, accountId);
      });

      it("should handle missing account ID", async() => {
         // Arrange
         mockReq.params = {};
         const expectedError = new Error("Missing account ID");

         const accountsService = await import("@/services/accountsService");
         const mockDeleteAccount = accountsService.deleteAccount as jest.MockedFunction<typeof accountsService.deleteAccount>;
         testServiceThrownError(mockDeleteAccount, expectedError);

         // Act
         await accountsController.DELETE(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockDeleteAccount);
      });

      it("should handle service errors", async() => {
         // Arrange
         const accountId = "account-123";
         mockReq.params = { id: accountId };
         const expectedError = new Error("Database delete failed");

         const accountsService = await import("@/services/accountsService");
         const mockDeleteAccount = accountsService.deleteAccount as jest.MockedFunction<typeof accountsService.deleteAccount>;
         testServiceThrownError(mockDeleteAccount, expectedError);

         // Act
         await accountsController.DELETE(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         assertControllerErrorResponse(mockRes, expectedError, mockDeleteAccount);
      });

      it("should handle invalid account ID format", async() => {
         // Arrange
         const invalidAccountId = "invalid-uuid-format";
         mockReq.params = { id: invalidAccountId };

         const mockResponse: ServerResponse = {
            code: HTTP_STATUS.BAD_REQUEST,
            errors: {
               account_id: "Missing account ID"
            }
         };

         const accountsService = await import("@/services/accountsService");
         const mockDeleteAccount = accountsService.deleteAccount as jest.MockedFunction<typeof accountsService.deleteAccount>;
         testServiceErrorResponse(mockDeleteAccount, mockResponse);

         // Act
         await accountsController.DELETE(mockReq as Request, mockRes as Response, mockNext);

         // Assert
         expect(mockDeleteAccount).toHaveBeenCalledWith(TEST_USER_ID, invalidAccountId);
      });
   });
});