import { Account } from "capital/accounts";
import { createMockAccounts, TEST_ACCOUNT_ID, TEST_ACCOUNT_IDS, VALID_ACCOUNT } from "capital/mocks/accounts";
import { TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";

import * as accountsController from "@/controllers/accountsController";
import { createMockMiddleware, MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";
import {
   arrangeMockServiceError,
   arrangeMockServiceSuccess,
   arrangeMockServiceValidationError,
   assertControllerErrorResponse,
   assertControllerSuccessResponse,
   callControllerMethod
} from "@/tests/utils/controllers";

jest.mock("@/lib/logger");

jest.mock("@/services/accountsService");

describe("Accounts Controller", () => {
   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: MockNextFunction;
   let accountsService: typeof import("@/services/accountsService");

   beforeEach(async() => {
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      mockRes.locals = { user_id: TEST_USER_ID };
      accountsService = await import("@/services/accountsService");
   });

   describe("GET /accounts", () => {
      it("should return success for valid accounts fetch", async() => {
         const mockAccounts: Account[] = createMockAccounts();
         const mockFetchAccounts = arrangeMockServiceSuccess(
            accountsService,
            "fetchAccounts",
            HTTP_STATUS.OK,
            mockAccounts
         );

         await callControllerMethod(accountsController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockFetchAccounts,
            [TEST_USER_ID],
            HTTP_STATUS.OK,
            mockAccounts
         );
      });

      it("should return internal server error for service errors", async() => {
         const expectedError = new Error("Database connection failed");
         const mockFetchAccounts = arrangeMockServiceError(accountsService, "fetchAccounts", expectedError);

         await callControllerMethod(accountsController.GET, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockFetchAccounts,
            [TEST_USER_ID],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("POST /accounts", () => {
      it("should return success for valid account creation", async() => {
         mockReq.body = VALID_ACCOUNT;
         const mockCreateAccount = arrangeMockServiceSuccess(
            accountsService,
            "createAccount",
            HTTP_STATUS.CREATED,
            { account_id: TEST_ACCOUNT_ID }
         );

         await callControllerMethod(accountsController.POST, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockCreateAccount,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.CREATED,
            { account_id: TEST_ACCOUNT_ID }
         );
      });

      it("should return validation errors for invalid account data", async() => {
         mockReq.body = { name: "" };
         const mockCreateAccount = arrangeMockServiceValidationError(
            accountsService,
            "createAccount",
            HTTP_STATUS.BAD_REQUEST,
            { name: "Name must be at least 1 character" }
         );

         await callControllerMethod(accountsController.POST, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockCreateAccount,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.BAD_REQUEST,
            { name: "Name must be at least 1 character" }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.body = VALID_ACCOUNT;
         const expectedError = new Error("Database connection failed");
         const mockCreateAccount = arrangeMockServiceError(accountsService, "createAccount", expectedError);

         await callControllerMethod(accountsController.POST, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockCreateAccount,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("PUT /accounts/ordering", () => {
      it("should return success for valid accounts ordering update", async() => {
         mockReq.params.id = "ordering";
         mockReq.body.accountsIds = TEST_ACCOUNT_IDS;
         const mockUpdateAccountsOrdering = arrangeMockServiceSuccess(
            accountsService,
            "updateAccountsOrdering",
            HTTP_STATUS.NO_CONTENT,
            undefined
         );

         await callControllerMethod(accountsController.PUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockUpdateAccountsOrdering,
            [TEST_USER_ID, TEST_ACCOUNT_IDS],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should return validation errors for invalid accounts ordering", async() => {
         mockReq.params.id = "ordering";
         mockReq.body.accountsIds = "";
         const mockUpdateAccountsOrdering = arrangeMockServiceValidationError(
            accountsService,
            "updateAccountsOrdering",
            HTTP_STATUS.BAD_REQUEST,
            { accounts: "Account ID's array must be a valid array representation" }
         );

         await callControllerMethod(accountsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateAccountsOrdering,
            [TEST_USER_ID, mockReq.body.accountsIds],
            HTTP_STATUS.BAD_REQUEST,
            { accounts: "Account ID's array must be a valid array representation" }
         );
      });

      it("should return not found when accounts do not exist", async() => {
         mockReq.params.id = "ordering";
         mockReq.body.accountsIds = TEST_ACCOUNT_IDS;
         const mockUpdateAccountsOrdering = arrangeMockServiceValidationError(
            accountsService,
            "updateAccountsOrdering",
            HTTP_STATUS.NOT_FOUND,
            { accounts: "Account(s) do not exist or do not belong to the user based on the provided IDs" }
         );

         await callControllerMethod(accountsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateAccountsOrdering,
            [TEST_USER_ID, mockReq.body.accountsIds],
            HTTP_STATUS.NOT_FOUND,
            { accounts: "Account(s) do not exist or do not belong to the user based on the provided IDs" }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.params.id = "ordering";
         mockReq.body.accountsIds = TEST_ACCOUNT_IDS;
         const expectedError = new Error("Database connection failed");
         const mockUpdateAccountsOrdering = arrangeMockServiceError(accountsService, "updateAccountsOrdering", expectedError);

         await callControllerMethod(accountsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockUpdateAccountsOrdering,
            [TEST_USER_ID, TEST_ACCOUNT_IDS],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("PUT /accounts/:id", () => {
      it("should return success for valid account update", async() => {
         mockReq.params.id = TEST_ACCOUNT_ID;
         mockReq.body = {
            name: "Updated Account",
            last_updated: new Date().toISOString()
         };
         const mockUpdateAccount = arrangeMockServiceSuccess(
            accountsService,
            "updateAccount",
            HTTP_STATUS.NO_CONTENT,
            undefined
         );

         await callControllerMethod(accountsController.PUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockUpdateAccount,
            [TEST_USER_ID, { ...mockReq.body, account_id: TEST_ACCOUNT_ID }],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should return validation errors for invalid account update", async() => {
         mockReq.params.id = TEST_ACCOUNT_ID;
         mockReq.body = {
            name: "Updated Account"
         };
         const mockUpdateAccount = arrangeMockServiceValidationError(
            accountsService,
            "updateAccount",
            HTTP_STATUS.BAD_REQUEST,
            { last_updated: "Missing last updated timestamp" }
         );

         await callControllerMethod(accountsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateAccount,
            [TEST_USER_ID, { ...mockReq.body, account_id: TEST_ACCOUNT_ID }],
            HTTP_STATUS.BAD_REQUEST,
            { last_updated: "Missing last updated timestamp" }
         );
      });

      it("should return not found when account does not exist", async() => {
         mockReq.params.id = TEST_ACCOUNT_ID;
         mockReq.body = {
            name: "Updated Account",
            last_updated: new Date().toISOString()
         };
         const mockUpdateAccount = arrangeMockServiceValidationError(
            accountsService,
            "updateAccount",
            HTTP_STATUS.NOT_FOUND,
            { account_id: "Account does not exist based on the provided ID" }
         );

         await callControllerMethod(accountsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateAccount,
            [TEST_USER_ID, { ...mockReq.body, account_id: mockReq.params.id }],
            HTTP_STATUS.NOT_FOUND,
            {
               account_id: "Account does not exist based on the provided ID"
            }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.params.id = TEST_ACCOUNT_ID;
         mockReq.body = {
            name: "Updated Account",
            last_updated: new Date().toISOString()
         };
         const expectedError = new Error("Database connection failed");
         const mockUpdateAccount = arrangeMockServiceError(accountsService, "updateAccount", expectedError);

         await callControllerMethod(accountsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockUpdateAccount,
            [TEST_USER_ID, { ...mockReq.body, account_id: TEST_ACCOUNT_ID }],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("DELETE /accounts/:id", () => {
      it("should return success for valid account deletion", async() => {
         mockReq.params.id = TEST_ACCOUNT_ID;
         const mockDeleteAccount = arrangeMockServiceSuccess(
            accountsService,
            "deleteAccount",
            HTTP_STATUS.NO_CONTENT,
            undefined
         );

         await callControllerMethod(accountsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockDeleteAccount,
            [TEST_USER_ID, TEST_ACCOUNT_ID],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should return validation errors for missing account ID", async() => {
         mockReq.params.id = "";
         const mockDeleteAccount = arrangeMockServiceValidationError(
            accountsService,
            "deleteAccount",
            HTTP_STATUS.BAD_REQUEST,
            { account_id: "Missing account ID" }
         );

         await callControllerMethod(accountsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockDeleteAccount,
            [TEST_USER_ID, mockReq.params.id],
            HTTP_STATUS.BAD_REQUEST,
            { account_id: "Missing account ID" }
         );
      });

      it("should return not found when account does not exist", async() => {
         mockReq.params.id = TEST_ACCOUNT_ID;
         const mockDeleteAccount = arrangeMockServiceValidationError(
            accountsService,
            "deleteAccount",
            HTTP_STATUS.NOT_FOUND,
            { account_id: "Account does not exist based on the provided ID or does not belong to the user" }
         );

         await callControllerMethod(accountsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockDeleteAccount,
            [TEST_USER_ID, mockReq.params.id],
            HTTP_STATUS.NOT_FOUND,
            { account_id: "Account does not exist based on the provided ID or does not belong to the user" }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.params.id = TEST_ACCOUNT_ID;
         const expectedError = new Error("Database connection failed");
         const mockDeleteAccount = arrangeMockServiceError(accountsService, "deleteAccount", expectedError);

         await callControllerMethod(accountsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockDeleteAccount,
            [TEST_USER_ID, TEST_ACCOUNT_ID],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });
});