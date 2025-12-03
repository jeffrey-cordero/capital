import { createMockTransactions, TEST_TRANSACTION_ID, TEST_TRANSACTION_IDS, VALID_TRANSACTION } from "capital/mocks/transactions";
import { TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";
import { Transaction } from "capital/transactions";

import * as transactionsController from "@/controllers/transactionsController";
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

jest.mock("@/services/transactionsService");

describe("Transactions Controller", () => {
   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: MockNextFunction;
   let transactionsService: typeof import("@/services/transactionsService");

   beforeEach(async() => {
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      mockRes.locals = { user_id: TEST_USER_ID };
      transactionsService = await import("@/services/transactionsService");
   });

   describe("GET /transactions", () => {
      it("should return success for valid transactions fetch", async() => {
         const mockTransactions: Transaction[] = createMockTransactions();
         const mockFetchTransactions = arrangeMockServiceSuccess(
            transactionsService,
            "fetchTransactions",
            HTTP_STATUS.OK,
            mockTransactions
         );

         await callControllerMethod(transactionsController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockFetchTransactions,
            [TEST_USER_ID],
            HTTP_STATUS.OK,
            mockTransactions
         );
      });

      it("should return internal server error for service errors", async() => {
         const expectedError = new Error("Database connection failed");
         const mockFetchTransactions = arrangeMockServiceError(
            transactionsService,
            "fetchTransactions",
            expectedError
         );

         await callControllerMethod(transactionsController.GET, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockFetchTransactions,
            [TEST_USER_ID],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("POST /transactions", () => {
      it("should return success for valid transaction creation", async() => {
         mockReq.body = VALID_TRANSACTION;
         const mockCreateTransaction = arrangeMockServiceSuccess(
            transactionsService,
            "createTransaction",
            HTTP_STATUS.CREATED,
            { transaction_id: TEST_TRANSACTION_ID }
         );

         await callControllerMethod(transactionsController.POST, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockCreateTransaction,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.CREATED,
            { transaction_id: TEST_TRANSACTION_ID }
         );
      });

      it("should return validation errors for invalid transaction data", async() => {
         mockReq.body = { amount: -100 };
         const mockCreateTransaction = arrangeMockServiceValidationError(
            transactionsService,
            "createTransaction",
            HTTP_STATUS.BAD_REQUEST,
            { amount: "Amount must be at least $1" }
         );

         await callControllerMethod(transactionsController.POST, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockCreateTransaction,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.BAD_REQUEST,
            { amount: "Amount must be at least $1" }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.body = VALID_TRANSACTION;
         const expectedError = new Error("Database connection failed");
         const mockCreateTransaction = arrangeMockServiceError(
            transactionsService,
            "createTransaction",
            expectedError
         );

         await callControllerMethod(transactionsController.POST, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockCreateTransaction,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("PUT /transactions/:id", () => {
      beforeEach(() => {
         mockReq.params.id = TEST_TRANSACTION_ID;
      });

      it("should return success for valid transaction update", async() => {
         mockReq.body = { amount: 150.00, description: "Updated Transaction" };
         const mockUpdateTransaction = arrangeMockServiceSuccess(
            transactionsService,
            "updateTransaction",
            HTTP_STATUS.NO_CONTENT,
            undefined
         );

         await callControllerMethod(transactionsController.PUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockUpdateTransaction,
            [TEST_USER_ID, { ...mockReq.body, transaction_id: TEST_TRANSACTION_ID }],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should return validation errors for invalid transaction update", async() => {
         mockReq.body = { amount: "invalid" };
         const mockUpdateTransaction = arrangeMockServiceValidationError(
            transactionsService,
            "updateTransaction",
            HTTP_STATUS.BAD_REQUEST,
            { amount: "Expected number, received string" }
         );

         await callControllerMethod(transactionsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateTransaction,
            [TEST_USER_ID, { ...mockReq.body, transaction_id: TEST_TRANSACTION_ID }],
            HTTP_STATUS.BAD_REQUEST,
            { amount: "Expected number, received string" }
         );
      });

      it("should return not found when transaction does not exist", async() => {
         mockReq.body = { amount: 200.00 };
         const mockUpdateTransaction = arrangeMockServiceValidationError(
            transactionsService,
            "updateTransaction",
            HTTP_STATUS.NOT_FOUND,
            { transaction_id: "Transaction does not exist or does not belong to the user based on the provided ID" }
         );

         await callControllerMethod(transactionsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateTransaction,
            [TEST_USER_ID, { ...mockReq.body, transaction_id: TEST_TRANSACTION_ID }],
            HTTP_STATUS.NOT_FOUND,
            { transaction_id: "Transaction does not exist or does not belong to the user based on the provided ID" }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.body = { amount: 200.00 };
         const expectedError = new Error("Database connection failed");
         const mockUpdateTransaction = arrangeMockServiceError(
            transactionsService,
            "updateTransaction",
            expectedError
         );

         await callControllerMethod(transactionsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockUpdateTransaction,
            [TEST_USER_ID, { ...mockReq.body, transaction_id: TEST_TRANSACTION_ID }],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("DELETE /transactions/:id", () => {
      it("should return success for valid transaction deletion via params", async() => {
         mockReq.params.id = TEST_TRANSACTION_ID;
         const mockDeleteTransactions = arrangeMockServiceSuccess(
            transactionsService,
            "deleteTransactions",
            HTTP_STATUS.NO_CONTENT,
            undefined
         );

         await callControllerMethod(transactionsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockDeleteTransactions,
            [TEST_USER_ID, [TEST_TRANSACTION_ID]],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should return success for valid batch transaction deletion via body", async() => {
         mockReq.params.id = "ignored";
         mockReq.body.transactionIds = TEST_TRANSACTION_IDS;
         const mockDeleteTransactions = arrangeMockServiceSuccess(
            transactionsService,
            "deleteTransactions",
            HTTP_STATUS.NO_CONTENT,
            undefined
         );

         await callControllerMethod(transactionsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockDeleteTransactions,
            [TEST_USER_ID, TEST_TRANSACTION_IDS],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should return validation errors for missing transaction IDs", async() => {
         mockReq.params.id = "";
         const mockDeleteTransactions = arrangeMockServiceValidationError(
            transactionsService,
            "deleteTransactions",
            HTTP_STATUS.BAD_REQUEST,
            { transactionIds: "Transaction IDs are required" }
         );

         await callControllerMethod(transactionsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockDeleteTransactions,
            [TEST_USER_ID, [""]],
            HTTP_STATUS.BAD_REQUEST,
            { transactionIds: "Transaction IDs are required" }
         );
      });

      it("should return validation errors for empty transaction IDs array", async() => {
         mockReq.body.transactionIds = [];
         const mockDeleteTransactions = arrangeMockServiceValidationError(
            transactionsService,
            "deleteTransactions",
            HTTP_STATUS.BAD_REQUEST,
            { transactionIds: "Transaction IDs are required" }
         );

         await callControllerMethod(transactionsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockDeleteTransactions,
            [TEST_USER_ID, []],
            HTTP_STATUS.BAD_REQUEST,
            { transactionIds: "Transaction IDs are required" }
         );
      });

      it("should return not found when transaction does not exist", async() => {
         mockReq.params.id = TEST_TRANSACTION_ID;
         const mockDeleteTransactions = arrangeMockServiceValidationError(
            transactionsService,
            "deleteTransactions",
            HTTP_STATUS.NOT_FOUND,
            { transactionIds: "Transaction(s) do not exist or do not belong to the user based on the provided IDs" }
         );

         await callControllerMethod(transactionsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockDeleteTransactions,
            [TEST_USER_ID, [TEST_TRANSACTION_ID]],
            HTTP_STATUS.NOT_FOUND,
            { transactionIds: "Transaction(s) do not exist or do not belong to the user based on the provided IDs" }
         );
      });

      it("should return not found when transactions do not exist", async() => {
         mockReq.body.transactionIds = TEST_TRANSACTION_IDS;
         const mockDeleteTransactions = arrangeMockServiceValidationError(
            transactionsService,
            "deleteTransactions",
            HTTP_STATUS.NOT_FOUND,
            { transactionIds: "Transaction(s) do not exist or do not belong to the user based on the provided IDs" }
         );

         await callControllerMethod(transactionsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockDeleteTransactions,
            [TEST_USER_ID, TEST_TRANSACTION_IDS],
            HTTP_STATUS.NOT_FOUND,
            { transactionIds: "Transaction(s) do not exist or do not belong to the user based on the provided IDs" }
         );
      });

      it("should return internal server error for service errors for single deletion", async() => {
         mockReq.params.id = TEST_TRANSACTION_ID;
         const expectedError = new Error("Database connection failed");
         const mockDeleteTransactions = arrangeMockServiceError(
            transactionsService,
            "deleteTransactions",
            expectedError
         );

         await callControllerMethod(transactionsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockDeleteTransactions,
            [TEST_USER_ID, [TEST_TRANSACTION_ID]],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });

      it("should return internal server error for service errors in batch deletion", async() => {
         mockReq.body.transactionIds = TEST_TRANSACTION_IDS;
         const expectedError = new Error("Database connection failed");
         const mockDeleteTransactions = arrangeMockServiceError(
            transactionsService,
            "deleteTransactions",
            expectedError
         );

         await callControllerMethod(transactionsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockDeleteTransactions,
            [TEST_USER_ID, TEST_TRANSACTION_IDS],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });
});