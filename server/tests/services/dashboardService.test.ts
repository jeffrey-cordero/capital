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
	 * Arranges economy API responses with specified response and Zod validation failures, if any
	 *
	 * @param {string[]} apiFailures - API names that should fail with response errors, if any
	 * @param {string[]} zodFailures - API names that should return invalid schemas, if any
	 */
   const arrangeEconomyAPIResponses = (apiFailures: string[] = [], zodFailures: string[] = []): void => {
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
	 * Asserts all 7 external API calls were made with correct endpoints and parameters
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
	 * Asserts economy data inserted into the database was written to filesystem with the
    * correct path and content
	 *
	 * @param {Economy} data - Economy data to validate
	 */
   const assertDBBackup = (data: Economy): void => {
      const [write] = (fs.writeFileSync as jest.Mock).mock.calls;
      const [filePath, fileContent] = write;

      expect(path.isAbsolute(filePath)).toBe(true);
      // "capital/server/resources/economy.json" appears at the end of the absolute path
      expect(filePath).toMatch(/capital\/server\/resources\/economy\.json$/);
      expect(fileContent).toBe(JSON.stringify(data, null, 3));
   };

   /**
	 * Asserts Redis cache read was called with correct cache key
	 *
	 * @param {string} cacheKey - Cache key used for read operation
	 */
   const assertCacheRead = (cacheKey: string): void => {
      expect(redis.getCacheValue).toHaveBeenCalledWith(cacheKey);
   };

   /**
	 * Asserts Redis cache update was called with correct parameters
	 *
	 * @param {string} cacheKey - Cache key for update operation
	 * @param {Economy} data - Economy data to cache
	 * @param {number} duration - Cache expiration duration in seconds
	 */
   const assertCacheUpdate = (cacheKey: string, data: Economy, duration: number): void => {
      expect(redis.setCacheValue).toHaveBeenCalledWith(
         cacheKey,
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
      assertCacheRead(economyCacheKey);
      assertRepositoryCall(dashboardRepository, "getEconomicData", []);

      if (requiresExternalAPIs) {
         // Missing or stale database data, so we need to call the external APIs
         assertAllAPICalls();
         assertDBUpdated(data);
      } else {
         // Fresh database data, so we cache it and return it immediately
         assertCacheUpdate(economyCacheKey, data, ECONOMY_DATA_CACHE_DURATION);
         assertNoExternalAPICalls();
      }
   };

   /**
	 * Asserts economy data contains all required properties
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
	 * Asserts dashboard data contains all required components
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
	 * Arranges dashboard service calls with specified failures, if any
	 *
	 * @param {string[]} errorMethods - Service methods that should throw errors, if any
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
	 * Asserts logger error was called with specified criteria
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

   beforeEach(async() => {
      jest.clearAllMocks();
      global.fetch = jest.fn();

      redis = await import("@/lib/redis");
      logger = await import("@/lib/logger");
      dashboardRepository = await import("@/repository/dashboardRepository");
      // Clear the mock's call history and remove any queued resolved value results to prevent test contamination
      (dashboardRepository.getEconomicData as jest.Mock).mockReset();
      (dashboardRepository.updateEconomicData as jest.Mock).mockReset();
      accountsService = await import("@/services/accountsService");
      budgetsService = await import("@/services/budgetsService");
      transactionsService = await import("@/services/transactionsService");
      userService = await import("@/services/userService");
      fs = await import("fs");

      arrangeDefaultRedisCacheBehavior(redis);

      delete process.env.CI;
      process.env.NODE_ENV = "test";
   });

   describe("getEconomicIndicatorKey", () => {
      it("should throw error for invalid indicator", () => {
         expect(() => getEconomicIndicatorKey("INVALID_INDICATOR")).toThrow("Invalid economic indicator: INVALID_INDICATOR");
      });

      const indicatorMappings = [
         { input: "REAL_GDP", expected: "GDP" },
         { input: "INFLATION", expected: "Inflation" },
         { input: "UNEMPLOYMENT", expected: "Unemployment" },
         { input: "TREASURY_YIELD", expected: "Treasury Yield" },
         { input: "FEDERAL_FUNDS_RATE", expected: "Federal Interest Rate" }
      ];

      indicatorMappings.forEach(({ input, expected }) => {
         it(`should return correct key for ${input}`, () => {
            expect(getEconomicIndicatorKey(input)).toBe(expected);
         });
      });
   });

   describe("fetchEconomicalData", () => {
      describe("CI Environment", () => {
         it("should return backup data immediately when CI is \"true\"", async() => {
            process.env.CI = "true";

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertMethodsNotCalled([
               { module: redis, methods: ["getCacheValue", "setCacheValue"] },
               { module: dashboardRepository, methods: ["getEconomicData", "updateEconomicData"] }
            ]);
            assertNoExternalAPICalls();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });

      describe("Cache Scenarios", () => {
         it("should return cached data on cache hit", async() => {
            const cachedEconomy: Economy = createMockEconomyData();
            const cachedData: string = JSON.stringify(cachedEconomy);
            arrangeMockCacheHit(redis, cachedData);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertEconomyCacheHit();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, cachedEconomy);
         });

         it("should fetch from DB and cache when cache miss + fresh DB data", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["fresh", "stale"]);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertEconomyCacheMiss(mockEconomy, false);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, mockEconomy);
         });

         it("should fetch from APIs when cache miss + stale DB data", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["stale", "stale"]);
            arrangeEconomyAPIResponses();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertEconomyCacheMiss(result.data, true);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should fetch from APIs when cache miss + no DB data", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertEconomyCacheMiss(result.data, true);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });

      describe("Mutex Behavior", () => {
         it("should only make one API batch call for concurrent requests", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses();

            // Make concurrent calls
            const [result1, result2] = await Promise.all([
               dashboardService.fetchEconomicalData(),
               // Simulate a delay between the two calls, where the first request is cached just in time
               (async() => {
                  await new Promise(resolve => setTimeout(resolve));
                  arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
                  return await dashboardService.fetchEconomicalData();
               })()
            ]);

            // Mutex in practice prevents race conditions, where both requests complete successfully with only 7 API calls
            assertAllAPICalls();
            assertServiceSuccessResponse(result1, HTTP_STATUS.OK, result1.data);
            assertServiceSuccessResponse(result2, HTTP_STATUS.OK, result2.data);
         });

         it("should double-check DB after acquiring mutex and use fresh data if updated", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["stale", "fresh"]);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            // Should not make API calls since double-check found fresh data
            assertNoExternalAPICalls();
            assertCacheRead(economyCacheKey);
            expect(dashboardRepository.getEconomicData).toHaveBeenCalledTimes(2);
            assertCacheUpdate(economyCacheKey, result.data, ECONOMY_DATA_CACHE_DURATION);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });

      describe("API Success Scenarios", () => {
         it("should successfully fetch from all 7 APIs", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertAllAPICalls();
            assertDBUpdated(result.data);
            assertCacheUpdate(economyCacheKey, result.data, ECONOMY_DATA_CACHE_DURATION);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("API Failures", () => {
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
            it(`should use backup ${label} when ${label} API fails`, async() => {
               arrangeEmptyStateForAPIFetch();
               arrangeEconomyAPIResponses([name]);
               arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

               const result: ServerResponse = await dashboardService.fetchEconomicalData();

               assertLoggerError();
               assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            });
         });

         it("should use backup for 3 indicators when they fail", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses(["gdp", "inflation", "unemployment"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should use backup when news and stocks fail", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses(["news", "stocks"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should use backup for alternating failures", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses(["news", "gdp", "unemployment", "federalInterestRate"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should use backup when all indicators fail", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses(["gdp", "inflation", "unemployment", "treasuryYield", "federalInterestRate"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should use backup when 6 out of 7 APIs fail", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses(["news", "stocks", "gdp", "inflation", "unemployment", "treasuryYield"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should use backup when all APIs fail", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses(["news", "stocks", "gdp", "inflation", "unemployment", "treasuryYield", "federalInterestRate"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });

      describe("Database Operations", () => {
         it("should update DB successfully after API fetch", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertDBUpdated(result.data);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should handle DB update failure gracefully", async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses();
            arrangeMockRepositoryError(dashboardRepository, "updateEconomicData", "DB connection failed");

            // Should not throw - error is caught and handled
            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });

      describe("File System Operations", () => {
         it("should write economy.json in development mode", async() => {
            process.env.NODE_ENV = "development";
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertDBBackup(result.data);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should not write file in non-development mode", async() => {
            process.env.NODE_ENV = "production";
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(fs.writeFileSync).not.toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });

      describe("Error Handling", () => {
         it("should use backup data with short cache on unexpected errors", async() => {
            arrangeMockCacheMiss(redis);
            arrangeMockRepositoryError(dashboardRepository, "getEconomicData", "Unexpected error");

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError();
            assertCacheUpdate(economyCacheKey, backupEconomyData as unknown as Economy, BACKUP_ECONOMY_DATA_CACHE_DURATION);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should handle Redis errors gracefully", async() => {
            arrangeMockRepositoryError(redis, "getCacheValue", "Redis connection failed");

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            // Should still work with backup data
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should log error stack traces", async() => {
            arrangeMockCacheMiss(redis);
            arrangeMockRepositoryError(dashboardRepository, "getEconomicData", "Test error");

            await dashboardService.fetchEconomicalData();

            assertLoggerError();
         });
      });
   });

   describe("fetchDashboard", () => {
      describe("Successful Aggregation", () => {
         it("should fetch and aggregate all dashboard components successfully", async() => {
            // Arrange economy data
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));

            // Arrange other services
            arrangeDashboardServices();

            const result: ServerResponse = await dashboardService.fetchDashboard(userId);

            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertDashboardDataStructure(result.data);
         });
      });

      it("should handle fetchEconomicalData failure", async() => {
         // fetchEconomicalData never throws - it returns backup data on Redis error
         arrangeMockRepositoryError(redis, "getCacheValue", "Redis error");
         arrangeDashboardServices();

         const result: ServerResponse = await dashboardService.fetchDashboard(userId);

         // Dashboard should still succeed with backup economy data
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         assertDashboardDataStructure(result.data);
      });

      DASHBOARD_SERVICES.forEach((serviceMethod) => {
         it(`should handle ${serviceMethod} failure`, async() => {
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

      describe("Multiple Service Failures", () => {
         it("should handle multiple services failing", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeDashboardServices(["fetchAccounts", "fetchBudgets"]);

            // Promise.all fails fast, so first error is thrown
            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Accounts error"
            );
         });

         it("should handle all services failing", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeDashboardServices(["fetchAccounts", "fetchBudgets", "fetchTransactions", "fetchUserDetails"]);

            // First service failure causes Promise.all to reject
            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Accounts error"
            );
         });
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
         it(`should use backup data when ${label} API returns invalid schema`, async() => {
            arrangeEmptyStateForAPIFetch();
            arrangeEconomyAPIResponses([], [apiName]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(`Error fetching ${errorIndicator}`);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });
   });
});