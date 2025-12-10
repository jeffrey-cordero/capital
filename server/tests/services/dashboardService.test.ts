import { Dashboard } from "capital/dashboard";
import { Economy } from "capital/economy";
import { createMockAccounts } from "capital/mocks/accounts";
import { createValidOrganizedBudgets } from "capital/mocks/budgets";
import { createMockEconomyData, createMockIndicatorTrends } from "capital/mocks/economy";
import { createMockTransactions } from "capital/mocks/transactions";
import { createMockUserWithDetails, TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import path from "path";

import * as dashboardService from "@/services/dashboardService";
import { BACKUP_ECONOMY_DATA_CACHE_DURATION, backupEconomyData, ECONOMY_DATA_CACHE_DURATION, getEconomicIndicatorKey } from "@/services/dashboardService";
import {
   arrangeDefaultRedisCacheBehavior,
   arrangeMockCacheHit,
   arrangeMockCacheMiss,
   arrangeMockRepositoryError,
   arrangeMockRepositorySuccess,
   assertCacheHitBehavior,
   assertMethodsNotCalled,
   assertRepositoryCall,
   assertServiceSuccessResponse,
   assertServiceThrows
} from "@/tests/utils/services";

jest.mock("fs");
jest.mock("argon2", () => ({
   hash: jest.fn(),
   verify: jest.fn()
}));
jest.mock("@/lib/redis");
jest.mock("@/lib/logger");
jest.mock("@/services/userService");
jest.mock("@/services/budgetsService");
jest.mock("@/services/accountsService");
jest.mock("@/services/transactionsService");
jest.mock("@/repository/dashboardRepository");

describe("Dashboard Service", () => {
   const userId: string = TEST_USER_ID;
   const economyCacheKey: string = "economy";
   const mockEconomy: Economy = createMockEconomyData();
   const DASHBOARD_SERVICES = ["fetchAccounts", "fetchBudgets", "fetchTransactions", "fetchUserDetails"] as const;

   let fs: typeof import("fs");
   let redis: typeof import("@/lib/redis");
   let logger: typeof import("@/lib/logger");
   let dashboardRepository: typeof import("@/repository/dashboardRepository");
   let accountsService: typeof import("@/services/accountsService");
   let budgetsService: typeof import("@/services/budgetsService");
   let transactionsService: typeof import("@/services/transactionsService");
   let userService: typeof import("@/services/userService");

   /**
	 * Mocks successful API fetch response with provided JSON data
	 *
	 * @param {Record<string, any>} data - JSON data to return from fetch
	 */
   const arrangeAPISuccess = (data: Record<string, any>): void => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
         json: jest.fn().mockResolvedValue(data)
      });
   };

   /**
	 * Mocks failed API fetch response with network error
	 */
   const arrangeFetchFailure = (): void => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
   };

   /**
	 * Arranges economy API responses with specified response and Zod validation failures
	 *
	 * @param {string[]} apiFailures - API names that should fail with response errors
	 * @param {string[]} zodFailures - API names that should return invalid schemas
	 */
   const arrangeExternalAPIs = (apiFailures: string[] = [], zodFailures: string[] = []): void => {
      const apiOrder: Array<{ name: string; data: Record<string, any> }> = [
         { name: "news", data: createMockEconomyData().news },
         { name: "stocks", data: createMockEconomyData().trends.Stocks },
         { name: "gdp", data: { data: createMockIndicatorTrends() } },
         { name: "inflation", data: { data: createMockIndicatorTrends() } },
         { name: "unemployment", data: { data: createMockIndicatorTrends() } },
         { name: "treasuryYield", data: { data: createMockIndicatorTrends() } },
         { name: "federalInterestRate", data: { data: createMockIndicatorTrends() } }
      ];

      apiOrder.forEach(api => {
         if (apiFailures.includes(api.name)) {
            arrangeFetchFailure();
         } else if (zodFailures.includes(api.name)) {
            arrangeAPISuccess({ invalid: "schema" });
         } else {
            arrangeAPISuccess(api.data);
         }
      });
   };

   /**
	 * Arranges cache miss with empty database for API fetch scenarios
	 */
   const arrangeEmptyStateForAPIFetch = (): void => {
      arrangeMockCacheMiss(redis);
      arrangeDBChecks(["none", "none"]);
   };

   /**
	 * Asserts no external API calls were made
	 */
   const assertNoExternalAPICalls = (): void => {
      expect(global.fetch).not.toHaveBeenCalled();
   };

   /**
	 * Asserts all 7 external API calls were made with the correct parameters
	 */
   const assertAllAPICalls = (): void => {
      expect(global.fetch).toHaveBeenCalledTimes(7);

      expect(global.fetch).toHaveBeenCalledWith(
         expect.stringContaining("global-economy-news"),
         expect.objectContaining({ method: "GET" })
      );

      expect(global.fetch).toHaveBeenCalledWith(
         expect.stringContaining("TOP_GAINERS_LOSERS"),
         expect.objectContaining({ method: "GET" })
      );

      const indicators = ["REAL_GDP", "INFLATION", "UNEMPLOYMENT", "TREASURY_YIELD", "FEDERAL_FUNDS_RATE"];
      indicators.forEach(indicator => {
         expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(`${indicator}&interval=quarterly`),
            expect.objectContaining({ method: "GET" })
         );
      });
   };

   /**
	 * Arranges multiple sequential database checks for economy data
	 *
	 * @param {Array<'fresh' | 'stale' | 'none'>} checks - Database check types in sequential order
	 */
   const arrangeDBChecks = (checks: Array<"fresh" | "stale" | "none">): void => {
      const mockFunction = dashboardRepository.getEconomicData as jest.Mock;

      checks.forEach(checkType => {
         switch (checkType) {
            case "fresh": {
               const freshTime: Date = new Date();
               mockFunction.mockResolvedValueOnce({ time: freshTime.toISOString(), data: mockEconomy });
               break;
            }
            case "stale": {
               const staleTime: Date = new Date(Date.now() - 25 * 60 * 60 * 1000);
               mockFunction.mockResolvedValueOnce({ time: staleTime.toISOString(), data: mockEconomy });
               break;
            }
            case "none":
               mockFunction.mockResolvedValueOnce(null);
               break;
         }
      });
   };

   /**
	 * Asserts database was updated with economy data
	 *
	 * @param {Economy} data - Economy data to validate
	 */
   const assertDBUpdated = (data: Economy): void => {
      const [[timestamp, jsonData]] = (dashboardRepository.updateEconomicData as jest.Mock).mock.calls;
      expect(timestamp).toBeInstanceOf(Date);
      expect(!isNaN(new Date(timestamp).getTime())).toBe(true);
      expect(jsonData).toEqual(JSON.stringify(data));
   };

   /**
	 * Asserts the economy data inserted into the database was written to filesystem with the
    * correct path and content
	 *
	 * @param {Economy} data - Economy data to validate
	 */
   const assertDBBackup = (data: Economy): void => {
      const [write] = (fs.writeFileSync as jest.Mock).mock.calls;
      const [filePath, fileContent] = write;

      expect(path.isAbsolute(filePath)).toBe(true);
      // Ensure that "capital/server/resources/economy.json" is the final part of the absolute path
      expect(filePath).toMatch(/capital\/server\/resources\/economy\.json$/);

      // Validate path structure: base path from import.meta.url -> resources -> economy.json
      const pathParts: string[] = filePath.split(path.sep);
      expect(pathParts[pathParts.length - 2]).toBe("resources");
      expect(pathParts[pathParts.length - 1]).toBe("economy.json");

      expect(fileContent).toBe(JSON.stringify(data, null, 3));
   };

   /**
	 * Asserts that the economy data was cached with the correct duration
	 *
	 * @param {Economy} data - Economy data to cache
	 * @param {number} duration - Cache duration in seconds
	 */
   const assertCacheUpdate = (data: Economy, duration: number): void => {
      expect(redis.setCacheValue).toHaveBeenCalledWith(
         economyCacheKey,
         duration,
         JSON.stringify(data)
      );
   };

   /**
	 * Asserts cache hit behavior for economy data
	 */
   const assertEconomyCacheHit = (): void => {
      assertCacheHitBehavior(redis, dashboardRepository, "getEconomicData", economyCacheKey);
      assertNoExternalAPICalls();
   };

   /**
	 * Asserts cache miss behavior for economy data
	 *
	 * @param {Economy} data - Economy data retrieved
	 * @param {boolean} requiresExternalAPIs - Whether external APIs were called for data
	 */
   const assertEconomyCacheMiss = (data: Economy, requiresExternalAPIs: boolean): void => {
      expect(redis.getCacheValue).toHaveBeenCalledWith(economyCacheKey);
      assertRepositoryCall(dashboardRepository, "getEconomicData", []);

      if (requiresExternalAPIs) {
         assertAllAPICalls();
         assertDBUpdated(data);
      } else {
         assertNoExternalAPICalls();
      }

      assertCacheUpdate(data, ECONOMY_DATA_CACHE_DURATION);
   };

   /**
	 * Asserts that the economy data contains all required properties
	 *
	 * @param {Economy} data - Economy data to validate
	 */
   const assertEconomyDataStructure = (data: Economy): void => {
      expect(data).toHaveProperty("news");
      expect(data).toHaveProperty("trends");

      const trendKeys = ["Stocks", "GDP", "Inflation", "Unemployment", "Treasury Yield", "Federal Interest Rate"];
      trendKeys.forEach((trend: string) => {
         expect(data.trends).toHaveProperty(trend);
      });
   };

   /**
	 * Asserts that the dashboard data contains all required components
	 *
	 * @param {Dashboard} data - Dashboard data to validate
	 */
   const assertDashboardDataStructure = (data: Dashboard): void => {
      const requiredFields = ["accounts", "budgets", "economy", "transactions", "settings"];
      requiredFields.forEach(field => {
         expect(data).toHaveProperty(field);
      });
      assertEconomyDataStructure(data.economy);
   };

   /**
	 * Arranges the dashboard service calls with specified failures
	 *
	 * @param {string[]} errorMethods - Service methods that should throw errors
	 */
   const arrangeDashboardServices = (errorMethods: string[] = []): void => {
      const statusCode: number = HTTP_STATUS.OK;
      const serviceModules: Record<string, jest.Mocked<any>> = {
         fetchAccounts: accountsService,
         fetchBudgets: budgetsService,
         fetchTransactions: transactionsService,
         fetchUserDetails: userService
      };
      const defaultServiceResponses: Record<string, unknown> = {
         fetchAccounts: { statusCode, data: createMockAccounts() },
         fetchBudgets: { statusCode, data: createValidOrganizedBudgets() },
         fetchTransactions: { statusCode, data: createMockTransactions() },
         fetchUserDetails: { statusCode, data: createMockUserWithDetails() }
      };

      DASHBOARD_SERVICES.forEach((method) => {
         const service = serviceModules[method];

         if (errorMethods.includes(method)) {
            const errorMessage: string = `${method.replace("fetch", "")} error`;
            arrangeMockRepositoryError(service, method, errorMessage);
         } else {
            arrangeMockRepositorySuccess(service, method, defaultServiceResponses[method]);
         }
      });
   };

   /**
	 * Asserts that the logger error was called with specified criteria
	 *
	 * @param {string | number} [criteria] - Validation criteria (message, count, or undefined for any call)
	 */
   const assertLoggerError = (criteria?: string | number): void => {
      if (typeof criteria === "string") {
         expect(logger.logger.error).toHaveBeenCalledWith(criteria);
      } else if (typeof criteria === "number") {
         expect(logger.logger.error).toHaveBeenCalledTimes(criteria);
      } else {
         expect(logger.logger.error).toHaveBeenCalled();
      }
   };

   /**
	 * Asserts API failure behavior with backup data usage
	 *
	 * @param {ServerResponse} result - Service response to validate
	 */
   const assertAPIFailureWithBackup = (result: ServerResponse) : void => {
      assertLoggerError(1);
      assertCacheUpdate(backupEconomyData as unknown as Economy, BACKUP_ECONOMY_DATA_CACHE_DURATION);
      assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
   };

   beforeEach(async() => {
      delete process.env.CI;
      process.env.NODE_ENV = "test";

      jest.clearAllMocks();
      global.fetch = jest.fn();

      redis = await import("@/lib/redis");
      logger = await import("@/lib/logger");
      dashboardRepository = await import("@/repository/dashboardRepository");
      // Clear the mock's call history to prevent test contamination due to queued resolved value results
      (dashboardRepository.getEconomicData as jest.Mock).mockReset();
      (dashboardRepository.updateEconomicData as jest.Mock).mockReset();
      accountsService = await import("@/services/accountsService");
      budgetsService = await import("@/services/budgetsService");
      transactionsService = await import("@/services/transactionsService");
      userService = await import("@/services/userService");
      fs = await import("fs");

      arrangeDefaultRedisCacheBehavior(redis);
   });

   describe("getEconomicIndicatorKey", () => {
      it("should throw an error when given an invalid economic indicator", () => {
         expect(() => getEconomicIndicatorKey("INVALID_INDICATOR"))
            .toThrow("Invalid economic indicator: INVALID_INDICATOR");
      });

      const indicatorMappings = [
         { input: "REAL_GDP", expected: "GDP" },
         { input: "INFLATION", expected: "Inflation" },
         { input: "UNEMPLOYMENT", expected: "Unemployment" },
         { input: "TREASURY_YIELD", expected: "Treasury Yield" },
         { input: "FEDERAL_FUNDS_RATE", expected: "Federal Interest Rate" }
      ];

      indicatorMappings.forEach(({ input, expected }) => {
         it(`should map ${input} to "${expected}"`, () => {
            expect(getEconomicIndicatorKey(input)).toBe(expected);
         });
      });
   });

   describe("fetchEconomicalData", () => {
      describe("CI Environment", () => {
         it("should return backup economy data immediately in CI environment", async() => {
            process.env.CI = "true";

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertNoExternalAPICalls();
            assertMethodsNotCalled([
               { module: redis, methods: ["getCacheValue", "setCacheValue"] },
               { module: dashboardRepository, methods: ["getEconomicData", "updateEconomicData"] }
            ]);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });

      describe("Cache Scenarios", () => {
         it("should return cached economy data when found in Redis", async() => {
            const cachedEconomy: Economy = createMockEconomyData();
            const cachedData: string = JSON.stringify(cachedEconomy);
            arrangeMockCacheHit(redis, cachedData);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertEconomyCacheHit();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, cachedEconomy);
         });

         it("should fetch fresh economy data from database and cache it when Redis cache misses", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["fresh"]);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertEconomyCacheMiss(mockEconomy, false);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, mockEconomy);
         });

         it("should fetch from external APIs when Redis cache misses and database data is stale", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["stale", "stale"]);
            arrangeExternalAPIs();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertEconomyCacheMiss(result.data, true);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should fetch from external APIs when Redis cache misses and database is empty", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeExternalAPIs();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertEconomyCacheMiss(result.data, true);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });

      describe("Mutex Behavior", () => {
         it("should prevent duplicate API calls when handling concurrent requests with mutex", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeExternalAPIs();

            const [result1, result2] = await Promise.all([
               dashboardService.fetchEconomicalData(),
               (async() => {
                  // Simulate a delay between the two requests with an intermediate cache hit
                  await new Promise(resolve => setTimeout(resolve));
                  arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
                  return await dashboardService.fetchEconomicalData();
               })()
            ]);

            assertEconomyCacheMiss(result1.data, true);
            assertServiceSuccessResponse(result1, HTTP_STATUS.OK, result1.data);
            assertServiceSuccessResponse(result2, HTTP_STATUS.OK, result2.data);
         });

         it("should recheck the database after acquiring the mutex lock and use fresh data if available", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["stale", "fresh"]);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertEconomyCacheMiss(result.data, false);
         });
      });

      describe("API Success Scenarios", () => {
         it("should successfully fetch and aggregate data from all seven external APIs", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeExternalAPIs();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertEconomyCacheMiss(result.data, true);
            assertEconomyDataStructure(result.data);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });

      describe("API Failure Scenarios", () => {
         const individualAPIs = [
            { name: "news", label: "news" },
            { name: "stocks", label: "stocks" },
            { name: "gdp", label: "GDP" },
            { name: "inflation", label: "inflation" },
            { name: "unemployment", label: "unemployment" },
            { name: "treasuryYield", label: "treasury yield" },
            { name: "federalInterestRate", label: "federal rate" }
         ];

         individualAPIs.forEach(({ name, label }) => {
            it(`should gracefully fall back to backup data when ${label} API fails`, async() => {
               arrangeEmptyStateForAPIFetch();
               arrangeExternalAPIs([name]);
               arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

               const result: ServerResponse = await dashboardService.fetchEconomicalData();

               assertAPIFailureWithBackup(result);
            });
         });

         it("should use backup data when multiple economic indicators fail", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeExternalAPIs(["gdp", "inflation", "unemployment"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertAPIFailureWithBackup(result);
         });

         it("should use backup data when some APIs fail intermittently", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeExternalAPIs(["news", "gdp", "unemployment", "federalInterestRate"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertAPIFailureWithBackup(result);
         });

         it("should use backup data when all external APIs fail", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeExternalAPIs(["news", "stocks", "gdp", "inflation", "unemployment", "treasuryYield", "federalInterestRate"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertAPIFailureWithBackup(result);
         });

         it("should use backup data when Redis retrieval fails", async() => {
            arrangeMockRepositoryError(redis, "getCacheValue", "Redis connection failed");

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertNoExternalAPICalls();
            assertAPIFailureWithBackup(result);
         });

         it("should use backup data when database retrieval fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeMockRepositoryError(dashboardRepository, "getEconomicData", "Database retrieval failed");

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertNoExternalAPICalls();
            assertAPIFailureWithBackup(result);
         });

         it("should use backup data when database update fails", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeExternalAPIs();
            arrangeMockRepositoryError(dashboardRepository, "updateEconomicData", "Database update failed");

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertAllAPICalls();
            assertAPIFailureWithBackup(result);
         });
      });

      describe("File System Operations", () => {
         it("should write economy data to filesystem in development environment", async() => {
            process.env.NODE_ENV = "development";
            arrangeEmptyStateForAPIFetch();
            arrangeExternalAPIs();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertDBBackup(result.data);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should skip filesystem backup in production environment", async() => {
            process.env.NODE_ENV = "production";
            arrangeEmptyStateForAPIFetch();
            arrangeExternalAPIs();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(fs.writeFileSync).not.toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });
   });

   describe("fetchDashboard", () => {
      describe("Successful Aggregation", () => {
         it("should successfully fetch and combine all dashboard data components", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));

            arrangeDashboardServices();

            const result: ServerResponse = await dashboardService.fetchDashboard(userId);

            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertDashboardDataStructure(result.data);
         });
      });

      it("should continue loading dashboard when economy data fetch encounters errors", async() => {
         arrangeMockRepositoryError(redis, "getCacheValue", "Redis error");
         arrangeDashboardServices();

         const result: ServerResponse = await dashboardService.fetchDashboard(userId);

         assertLoggerError();
         expect(result.data.economy).toEqual(backupEconomyData);
         assertDashboardDataStructure(result.data);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
      });

      DASHBOARD_SERVICES.forEach((serviceMethod) => {
         it(`should throw error when ${serviceMethod} fails`, async() => {
            const mockEconomy: Economy = createMockEconomyData();
            const errorMessage = `${serviceMethod.replace("fetch", "")} error`;

            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeDashboardServices([serviceMethod]);

            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               errorMessage
            );
         });
      });

      it("should throw first error when multiple dashboard services fail simultaneously", async() => {
         const mockEconomy: Economy = createMockEconomyData();
         arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
         arrangeDashboardServices(["fetchAccounts", "fetchBudgets"]);

         await assertServiceThrows(
            () => dashboardService.fetchDashboard(userId),
            "Accounts error"
         );
      });

      it("should throw any error when any dashboard service fails", async() => {
         const mockEconomy: Economy = createMockEconomyData();
         arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
         arrangeDashboardServices(["fetchAccounts", "fetchBudgets", "fetchTransactions", "fetchUserDetails"]);
         // Simulate the accounts service taking longer to throw an error than the budgets service
         (accountsService.fetchAccounts as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve)));

         await assertServiceThrows(
            () => dashboardService.fetchDashboard(userId),
            "Budgets error"
         );

      });
   });

   describe("Zod Validation Failures", () => {
      const zodValidationTests = [
         { apiName: "news", label: "news", errorIndicator: "news" },
         { apiName: "stocks", label: "stocks", errorIndicator: "stock trends" },
         { apiName: "gdp", label: "GDP indicator", errorIndicator: "real gdp" },
         { apiName: "inflation", label: "inflation indicator", errorIndicator: "inflation" },
         { apiName: "unemployment", label: "unemployment indicator", errorIndicator: "unemployment" },
         { apiName: "treasuryYield", label: "treasury yield indicator", errorIndicator: "treasury yield" },
         { apiName: "federalInterestRate", label: "federal interest rate indicator", errorIndicator: "federal funds rate" }
      ];

      zodValidationTests.forEach(({ apiName, label, errorIndicator }) => {
         it(`should gracefully handle invalid ${label} response data with backup`, async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeExternalAPIs([], [apiName]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(`Error fetching ${errorIndicator}`);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });
   });
});