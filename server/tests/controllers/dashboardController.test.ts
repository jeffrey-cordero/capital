import { createMockAccounts } from "capital/mocks/accounts";
import { createValidOrganizedBudgets } from "capital/mocks/budgets";
import { createMockEconomyData } from "capital/mocks/economy";
import { createMockTransactions } from "capital/mocks/transactions";
import { createMockUserWithDetails, TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS } from "capital/server";

import * as dashboardController from "@/controllers/dashboardController";
import { createMockMiddleware, MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";
import {
   arrangeMockServiceError,
   arrangeMockServiceSuccess,
   assertControllerErrorResponse,
   assertControllerSuccessResponse,
   callControllerMethod
} from "@/tests/utils/controllers";

jest.mock("@/lib/logger");
jest.mock("@/services/dashboardService");

describe("Dashboard Controller", () => {
   let mockReq: MockRequest;
   let mockRes: MockResponse;
   let mockNext: MockNextFunction;
   let dashboardService: typeof import("@/services/dashboardService");

   beforeEach(async() => {
      ({ mockReq, mockRes, mockNext } = createMockMiddleware());
      mockRes.locals = { user_id: TEST_USER_ID };
      dashboardService = await import("@/services/dashboardService");
   });

   describe("GET /dashboard", () => {
      it("should return success for valid dashboard fetch", async() => {
         const mockDashboard = {
            accounts: createMockAccounts(),
            budgets: createValidOrganizedBudgets(),
            economy: createMockEconomyData(),
            transactions: createMockTransactions(),
            settings: createMockUserWithDetails()
         };
         const mockFetchDashboard = arrangeMockServiceSuccess(
            dashboardService,
            "fetchDashboard",
            HTTP_STATUS.OK,
            mockDashboard
         );

         await callControllerMethod(dashboardController.GET, mockReq, mockRes, mockNext);

         assertControllerSuccessResponse(
            mockRes,
            mockFetchDashboard,
            [TEST_USER_ID],
            HTTP_STATUS.OK,
            mockDashboard
         );
      });

      it("should return internal server error for service errors", async() => {
         const expectedError = new Error("Database connection failed");
         const mockFetchDashboard = arrangeMockServiceError(
            dashboardService,
            "fetchDashboard",
            expectedError
         );

         await callControllerMethod(dashboardController.GET, mockReq, mockRes, mockNext);

         assertControllerErrorResponse(
            mockRes,
            expectedError,
            mockFetchDashboard,
            [TEST_USER_ID],
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            { server: "Internal Server Error" }
         );
      });
   });
});