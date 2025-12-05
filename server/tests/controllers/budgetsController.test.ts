import {
   createValidBudgetCategory,
   createValidOrganizedBudgets,
   TEST_BUDGET_CATEGORY_ID,
   TEST_BUDGET_CATEGORY_IDS,
   VALID_BUDGET,
   VALID_BUDGET_CATEGORY
} from "capital/mocks/budgets";
import { TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";

import * as budgetsController from "@/controllers/budgetsController";
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
jest.mock("@/services/budgetsService");

describe("Budgets Controller", () => {
   const budgetCategoryId = TEST_BUDGET_CATEGORY_ID;

   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: MockNextFunction;
   let budgetsService: typeof import("@/services/budgetsService");

   beforeEach(async() => {
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      mockRes.locals = { user_id: TEST_USER_ID };
      budgetsService = await import("@/services/budgetsService");
   });

   describe("GET /budgets", () => {
      it("should return success for valid budgets fetch", async() => {
         const mockBudgets = createValidOrganizedBudgets();
         const mockFetchBudgets = arrangeMockServiceSuccess(
            budgetsService,
            "fetchBudgets",
            HTTP_STATUS.OK,
            mockBudgets
         );

         await callControllerMethod(budgetsController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockFetchBudgets,
            [TEST_USER_ID],
            HTTP_STATUS.OK,
            mockBudgets
         );
      });

      it("should return internal server error for service errors", async() => {
         const expectedError = new Error("Database connection failed");
         const mockFetchBudgets = arrangeMockServiceError(budgetsService, "fetchBudgets", expectedError);

         await callControllerMethod(budgetsController.GET, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockFetchBudgets,
            [TEST_USER_ID],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("POST /budgets/category", () => {
      beforeEach(() => {
         mockReq.path = "/budgets/category";
      });

      it("should return success for valid budget category creation", async() => {
         mockReq.body = VALID_BUDGET_CATEGORY;
         const mockCreateBudgetCategory = arrangeMockServiceSuccess(
            budgetsService,
            "createBudgetCategory",
            HTTP_STATUS.CREATED,
            { budget_category_id: budgetCategoryId }
         );

         await callControllerMethod(budgetsController.POST, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockCreateBudgetCategory,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.CREATED,
            { budget_category_id: budgetCategoryId }
         );
      });

      it("should return validation errors for invalid budget category data", async() => {
         mockReq.body = { ...VALID_BUDGET_CATEGORY, name: "" };
         const mockCreateBudgetCategory = arrangeMockServiceValidationError(
            budgetsService,
            "createBudgetCategory",
            HTTP_STATUS.BAD_REQUEST,
            { name: "Name must be at least 1 character" }
         );

         await callControllerMethod(budgetsController.POST, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockCreateBudgetCategory,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.BAD_REQUEST,
            { name: "Name must be at least 1 character" }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.body = VALID_BUDGET_CATEGORY;
         const expectedError = new Error("Database connection failed");
         const mockCreateBudgetCategory = arrangeMockServiceError(budgetsService, "createBudgetCategory", expectedError);

         await callControllerMethod(budgetsController.POST, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockCreateBudgetCategory,
            [TEST_USER_ID, mockReq.body],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("POST /budgets/:id", () => {
      beforeEach(() => {
         mockReq.path = `/budgets/${budgetCategoryId}`;
         mockReq.params.id = budgetCategoryId;
      });

      it("should return success for valid budget creation", async() => {
         mockReq.body = VALID_BUDGET;
         const mockCreateBudget = arrangeMockServiceSuccess(
            budgetsService,
            "createBudget",
            HTTP_STATUS.CREATED,
            undefined
         );

         await callControllerMethod(budgetsController.POST, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockCreateBudget,
            [TEST_USER_ID, { ...mockReq.body, budget_category_id: budgetCategoryId }],
            HTTP_STATUS.CREATED,
            undefined
         );
      });

      it("should return validation errors for invalid budget data", async() => {
         mockReq.body = { ...VALID_BUDGET, amount: -100 };
         const mockCreateBudget = arrangeMockServiceValidationError(
            budgetsService,
            "createBudget",
            HTTP_STATUS.BAD_REQUEST,
            { amount: "Amount must be positive" }
         );

         await callControllerMethod(budgetsController.POST, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockCreateBudget,
            [TEST_USER_ID, { ...mockReq.body, budget_category_id: budgetCategoryId }],
            HTTP_STATUS.BAD_REQUEST,
            { amount: "Amount must be positive" }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.body = VALID_BUDGET;
         const expectedError = new Error("Database connection failed");
         const mockCreateBudget = arrangeMockServiceError(budgetsService, "createBudget", expectedError);

         await callControllerMethod(budgetsController.POST, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockCreateBudget,
            [TEST_USER_ID, { ...mockReq.body, budget_category_id: budgetCategoryId }],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("PUT /budgets/ordering", () => {
      beforeEach(() => {
         mockReq.params.id = "ordering";
      });

      it("should return success for valid category ordering update", async() => {
         mockReq.body.categoryIds = TEST_BUDGET_CATEGORY_IDS;
         const mockUpdateCategoryOrdering = arrangeMockServiceSuccess(
            budgetsService,
            "updateCategoryOrdering",
            HTTP_STATUS.NO_CONTENT,
            undefined
         );

         await callControllerMethod(budgetsController.PUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockUpdateCategoryOrdering,
            [TEST_USER_ID, mockReq.body.categoryIds],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should return validation errors for invalid category ordering", async() => {
         mockReq.body.categoryIds = "";
         const mockUpdateCategoryOrdering = arrangeMockServiceValidationError(
            budgetsService,
            "updateCategoryOrdering",
            HTTP_STATUS.BAD_REQUEST,
            { categories: "Category ID's array must be a valid array representation" }
         );

         await callControllerMethod(budgetsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateCategoryOrdering,
            [TEST_USER_ID, mockReq.body.categoryIds],
            HTTP_STATUS.BAD_REQUEST,
            { categories: "Category ID's array must be a valid array representation" }
         );
      });

      it("should return not found when categories do not exist", async() => {
         mockReq.body.categoryIds = TEST_BUDGET_CATEGORY_IDS;
         const mockUpdateCategoryOrdering = arrangeMockServiceValidationError(
            budgetsService,
            "updateCategoryOrdering",
            HTTP_STATUS.NOT_FOUND,
            { categories: "Category(s) do not exist or do not belong to the user" }
         );

         await callControllerMethod(budgetsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateCategoryOrdering,
            [TEST_USER_ID, mockReq.body.categoryIds],
            HTTP_STATUS.NOT_FOUND,
            { categories: "Category(s) do not exist or do not belong to the user" }
         );
      });

      it("should return internal server error for service errors", async() => {
         mockReq.body.categoryIds = TEST_BUDGET_CATEGORY_IDS;
         const expectedError = new Error("Database connection failed");
         const mockUpdateCategoryOrdering = arrangeMockServiceError(budgetsService, "updateCategoryOrdering", expectedError);

         await callControllerMethod(budgetsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockUpdateCategoryOrdering,
            [TEST_USER_ID, mockReq.body.categoryIds],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("PUT /budgets/budget/:id", () => {
      beforeEach(() => {
         mockReq.path = `/budgets/budget/${budgetCategoryId}`;
         mockReq.params.id = budgetCategoryId;
         mockReq.body = VALID_BUDGET;
      });

      it("should return success for valid budget update", async() => {
         const mockUpdateBudget = arrangeMockServiceSuccess(
            budgetsService,
            "updateBudget",
            HTTP_STATUS.NO_CONTENT,
            undefined
         );

         await callControllerMethod(budgetsController.PUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockUpdateBudget,
            [TEST_USER_ID, { ...mockReq.body, budget_category_id: budgetCategoryId }],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should return not found when budget does not exist", async() => {
         const mockUpdateBudget = arrangeMockServiceValidationError(
            budgetsService,
            "updateBudget",
            HTTP_STATUS.NOT_FOUND,
            { budget_id: "Budget does not exist" }
         );

         await callControllerMethod(budgetsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateBudget,
            [TEST_USER_ID, { ...mockReq.body, budget_category_id: budgetCategoryId }],
            HTTP_STATUS.NOT_FOUND,
            { budget_id: "Budget does not exist" }
         );
      });

      it("should return internal server error for service errors", async() => {
         const expectedError = new Error("Database connection failed");
         const mockUpdateBudget = arrangeMockServiceError(budgetsService, "updateBudget", expectedError);

         await callControllerMethod(budgetsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockUpdateBudget,
            [TEST_USER_ID, { ...mockReq.body, budget_category_id: budgetCategoryId }],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("PUT /budgets/:id", () => {
      beforeEach(() => {
         mockReq.path = `/budgets/${budgetCategoryId}`;
         mockReq.params.id = budgetCategoryId;
         mockReq.body = createValidBudgetCategory();
      });

      it("should return success for valid category update", async() => {
         const mockUpdateCategory = arrangeMockServiceSuccess(
            budgetsService,
            "updateCategory",
            HTTP_STATUS.NO_CONTENT,
            undefined
         );

         await callControllerMethod(budgetsController.PUT, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockUpdateCategory,
            [TEST_USER_ID, { ...mockReq.body, budget_category_id: budgetCategoryId }],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should return not found when category does not exist", async() => {
         const mockUpdateCategory = arrangeMockServiceValidationError(
            budgetsService,
            "updateCategory",
            HTTP_STATUS.NOT_FOUND,
            { budget_category_id: "Category does not exist" }
         );

         await callControllerMethod(budgetsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockUpdateCategory,
            [TEST_USER_ID, { ...mockReq.body, budget_category_id: budgetCategoryId }],
            HTTP_STATUS.NOT_FOUND,
            { budget_category_id: "Category does not exist" }
         );
      });

      it("should return internal server error for service errors", async() => {
         const expectedError = new Error("Database connection failed");
         const mockUpdateCategory = arrangeMockServiceError(budgetsService, "updateCategory", expectedError);

         await callControllerMethod(budgetsController.PUT, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockUpdateCategory,
            [TEST_USER_ID, { ...mockReq.body, budget_category_id: budgetCategoryId }],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });

   describe("DELETE /budgets/:id", () => {
      beforeEach(() => {
         mockReq.params.id = budgetCategoryId;
      });

      it("should return success for valid category deletion", async() => {
         const mockDeleteCategory = arrangeMockServiceSuccess(
            budgetsService,
            "deleteCategory",
            HTTP_STATUS.NO_CONTENT,
            undefined
         );

         await callControllerMethod(budgetsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockDeleteCategory,
            [TEST_USER_ID, mockReq.params.id],
            HTTP_STATUS.NO_CONTENT,
            undefined
         );
      });

      it("should return not found when category does not exist", async() => {
         const mockDeleteCategory = arrangeMockServiceValidationError(
            budgetsService,
            "deleteCategory",
            HTTP_STATUS.NOT_FOUND,
            { budget_category_id: "Category does not exist" }
         );

         await callControllerMethod(budgetsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            undefined,
            mockDeleteCategory,
            [TEST_USER_ID, mockReq.params.id],
            HTTP_STATUS.NOT_FOUND,
            { budget_category_id: "Category does not exist" }
         );
      });

      it("should return internal server error for service errors", async() => {
         const expectedError = new Error("Database connection failed");
         const mockDeleteCategory = arrangeMockServiceError(budgetsService, "deleteCategory", expectedError);

         await callControllerMethod(budgetsController.DELETE, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockDeleteCategory,
            [TEST_USER_ID, mockReq.params.id],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });
});