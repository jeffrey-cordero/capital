import { Economy } from "capital/economy";
import { createMockEconomyData, createMockIndicatorTrends } from "capital/mocks/economy";
import { TEST_USER_ID } from "capital/mocks/user";
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
   assertMethodNotCalled,
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
jest.mock("@/repository/dashboardRepository");
jest.mock("@/services/accountsService");
jest.mock("@/services/budgetsService");
jest.mock("@/services/transactionsService");
jest.mock("@/services/userService");

describe("Dashboard Service", () => {
   global.fetch = jest.fn() as jest.Mock;

   const userId: string = TEST_USER_ID;
   const economyCacheKey: string = "economy";

   let fs: typeof import("fs");
   let redis: typeof import("@/lib/redis");
   let logger: typeof import("@/lib/logger");
   let dashboardRepository: typeof import("@/repository/dashboardRepository");
   let accountsService: typeof import("@/services/accountsService");
   let budgetsService: typeof import("@/services/budgetsService");
   let transactionsService: typeof import("@/services/transactionsService");
   let userService: typeof import("@/services/userService");

   /**
	 * Mock successful news API fetch response
	 */
   const arrangeFetchNewsSuccess = (): void => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
         json: jest.fn().mockResolvedValue(createMockEconomyData().news)
      });
   };

   /**
	 * Mock successful stocks API fetch response
	 */
   const arrangeFetchStocksSuccess = (): void => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
         json: jest.fn().mockResolvedValue(createMockEconomyData().trends.Stocks)
      });
   };

   /**
	 * Mock successful economic indicator API fetch response
	 */
   const arrangeFetchIndicatorSuccess = (): void => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
         json: jest.fn().mockResolvedValue({ data: createMockIndicatorTrends() })
      });
   };

   /**
	 * Mock failed API fetch response
	 */
   const arrangeFetchFailure = (): void => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
   };

   /**
	 * Arrange economy API errors with specified network failures and Zod validation failures
	 *
	 * This helper provides a clean, modular approach to arranging API mock responses
	 * by accepting arrays of API names that should fail with network errors or return
	 * invalid schemas for Zod validation testing.
	 *
	 * @param {string[]} [failureAPIs=[]] - Array of API names that should fail with network errors.
	 *                                      Valid values: "news", "stocks", "gdp", "inflation",
	 *                                      "unemployment", "treasuryYield", "federalInterestRate"
	 * @param {string[]} [zodFailures=[]] - Array of API names that should return invalid schemas.
	 *                                      Valid values: same as failureAPIs
	 *
	 * @example
	 * arrangeEconomyAPIErrors(["news", "gdp"]); // News and GDP fail with network errors, rest succeed
	 *
	 * @example
	 * arrangeEconomyAPIErrors(); // All succeed
	 *
	 * @example
	 * arrangeEconomyAPIErrors([], ["news"]); // News returns invalid schema, rest succeed
	 *
	 * @example
	 * arrangeEconomyAPIErrors(["news"], ["stocks"]); // News fails network, stocks returns invalid schema, rest succeed
	 *
	 * @example
	 * arrangeEconomyAPIErrors(["news", "stocks", "gdp", "inflation", "unemployment", "treasuryYield", "federalInterestRate"]); // All fail with network errors
	 */
   const arrangeEconomyAPIErrors = (failureAPIs: string[] = [], zodFailures: string[] = []): void => {
      const apiOrder: Array<{ name: string; arrange: () => void }> = [
         { name: "news", arrange: arrangeFetchNewsSuccess },
         { name: "stocks", arrange: arrangeFetchStocksSuccess },
         { name: "gdp", arrange: arrangeFetchIndicatorSuccess },
         { name: "inflation", arrange: arrangeFetchIndicatorSuccess },
         { name: "unemployment", arrange: arrangeFetchIndicatorSuccess },
         { name: "treasuryYield", arrange: arrangeFetchIndicatorSuccess },
         { name: "federalInterestRate", arrange: arrangeFetchIndicatorSuccess }
      ];

      apiOrder.forEach(api => {
         if (failureAPIs.includes(api.name)) {
            arrangeFetchFailure();
         } else if (zodFailures.includes(api.name)) {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
               json: jest.fn().mockResolvedValue({ invalid: "schema" })
            });
         } else {
            api.arrange();
         }
      });
   };

   /**
	 * Mock database to return fresh economy data within 24 hours
	 */
   const arrangeDBFreshData = (): void => {
      const freshTime: Date = new Date();
      const mockEconomy: Economy = createMockEconomyData();

      arrangeMockRepositorySuccess(
         dashboardRepository,
         "getEconomicData",
         { time: freshTime.toISOString(), data: mockEconomy }
      );
   };

   /**
	 * Mock database to return stale economy data older than 24 hours
	 */
   const arrangeDBStaleData = (): void => {
      const staleTime: Date = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const mockEconomy: Economy = createMockEconomyData();

      arrangeMockRepositorySuccess(
         dashboardRepository,
         "getEconomicData",
         { time: staleTime.toISOString(), data: mockEconomy }
      );
   };

   /**
	 * Mock database to return no economy data to imply the initial external API data insertion
	 */
   const arrangeEmptyDatabase = (): void => {
      arrangeMockRepositorySuccess(dashboardRepository, "getEconomicData", null);
   };

   /**
	 * Arrange multiple sequential database checks for economy data
	 *
	 * @param {Array<'fresh' | 'stale' | 'none'>} checks - Array of check types in order (initial check, mutex double-check, etc.)
	 */
   const arrangeDBChecks = (checks: Array<"fresh" | "stale" | "none">): void => {
      checks.forEach(checkType => {
         switch (checkType) {
            case "fresh":
               arrangeDBFreshData();
               break;
            case "stale":
               arrangeDBStaleData();
               break;
            case "none":
               arrangeEmptyDatabase();
               break;
         }
      });
   };

   /**
	 * Arrange dashboard service calls with specified failures
	 *
	 * @param {string[]} [errorMethods] - Service methods that should throw errors (defaults to empty array)
	 *                                    Valid values: "fetchAccounts", "fetchBudgets", "fetchTransactions", "fetchUserDetails"
	 */
   const arrangeDashboardFailures = (errorMethods: string[] = []): void => {
      const services: Record<string, jest.Mocked<any>> = {
         fetchAccounts: accountsService,
         fetchBudgets: budgetsService,
         fetchTransactions: transactionsService,
         fetchUserDetails: userService
      };
      const defaultServiceResponses: Record<string, unknown> = {
         fetchAccounts: { statusCode: HTTP_STATUS.OK, data: [] },
         fetchBudgets: { statusCode: HTTP_STATUS.OK, data: { categories: [], budgets: [] } },
         fetchTransactions: { statusCode: HTTP_STATUS.OK, data: [] },
         fetchUserDetails: { statusCode: HTTP_STATUS.OK, data: { user_id: userId, username: "test", email: "test@test.com" } }
      };

      Object.entries(services).forEach(([method, service]) => {
         if (errorMethods.includes(method)) {
            const errorMessage: string = `${method.replace("fetch", "")} error`;
            arrangeMockRepositoryError(service, method, errorMessage);
         } else {
            arrangeMockRepositorySuccess(service, method, defaultServiceResponses[method]);
         }
      });
   };

   /**
	 * Assert economy data contains all required properties
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
	 * Assert Redis cache set with correct parameters
	 *
	 * @param {string} cacheKey - Cache key
	 * @param {Economy} data - Economy data cached
	 * @param {number} duration - Cache expiration duration in seconds
	 */
   const assertCacheSet = (cacheKey: string, data: Economy, duration: number): void => {
      expect(redis.setCacheValue).toHaveBeenCalledWith(
         cacheKey,
         duration,
         JSON.stringify(data)
      );
   };

   /**
	 * Assert database updated with economy data
	 *
	 * @param {Economy} data - Economy data to update
	 */
   const assertDBUpdated = (data: Economy): void => {
      const [[timestamp, jsonData]] = (dashboardRepository.updateEconomicData as jest.Mock).mock.calls;
      expect(timestamp).toBeInstanceOf(Date);
      expect(jsonData).toBe(JSON.stringify(data));
   };

   /**
	 * Assert economy data written to filesystem with correct path resolution
	 *
	 * @param {Economy} data - Economy data to write
	 */
   const assertFileWritten = (data: Economy): void => {
      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      const filePath = writeCall[0];

      // "capital/server/resources/economy.json" should be at the end of the absolute path
      expect(filePath).toMatch(/capital\/server\/resources\/economy\.json$/);
      expect(path.isAbsolute(filePath)).toBe(true);
      expect(writeCall[1]).toBe(JSON.stringify(data, null, 3));
   };

   /**
	 * Assert all 7 external API calls made with correct endpoints
	 */
   const assertAllFetchCalls = (): void => {
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
            expect.stringContaining(indicator),
            expect.objectContaining({ method: "GET" })
         );
      });
   };

   /**
	 * Assert dashboard data contains all required components
	 *
	 * @param {unknown} data - Dashboard data to validate
	 */
   const assertDashboardDataStructure = (data: unknown): void => {
      const requiredFields = ["accounts", "budgets", "economy", "transactions", "settings"];
      requiredFields.forEach(field => {
         expect(data).toHaveProperty(field);
      });
   };

   /**
	 * Assert no external API calls were made
	 */
   const assertNoExternalAPICalls = (): void => {
      expect(global.fetch).not.toHaveBeenCalled();
   };

   /**
	 * Assert logger error was called with specified criteria
	 *
	 * @param {string | number} [criteria] - Validation criteria:
	 *                                       - string: Assert logger was called with this specific message
	 *                                       - number: Assert logger was called this many times
	 *                                       - undefined: Assert logger was called at least once
	 *
	 * @example
	 * assertLoggerError(); // Assert logger was called at least once
	 *
	 * @example
	 * assertLoggerError(3); // Assert logger was called exactly 3 times
	 *
	 * @example
	 * assertLoggerError("Error fetching news"); // Assert logger was called with specific message
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

      redis = await import("@/lib/redis");
      logger = await import("@/lib/logger");
      dashboardRepository = await import("@/repository/dashboardRepository");
      accountsService = await import("@/services/accountsService");
      budgetsService = await import("@/services/budgetsService");
      transactionsService = await import("@/services/transactionsService");
      userService = await import("@/services/userService");
      fs = await import("fs");

      arrangeDefaultRedisCacheBehavior(redis);
      (global.fetch as jest.Mock).mockReset();

      // Reset environment variables
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
         it("should return backup data immediately when CI=true", async() => {
            process.env.CI = "true";

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertMethodsNotCalled([
               { module: redis, methods: ["getCacheValue", "setCacheValue"] },
               { module: dashboardRepository, methods: ["getEconomicData", "updateEconomicData"] }
            ]);
            assertNoExternalAPICalls();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("Cache Scenarios", () => {
         it("should return cached data on cache hit", async() => {
            const cachedEconomy: Economy = createMockEconomyData();
            const cachedData: string = JSON.stringify(cachedEconomy);
            arrangeMockCacheHit(redis, cachedData);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(redis.getCacheValue).toHaveBeenCalledWith(economyCacheKey);
            assertMethodNotCalled(dashboardRepository, "getEconomicData");
            assertMethodNotCalled(redis, "setCacheValue");
            assertNoExternalAPICalls();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, cachedEconomy);
         });

         it("should fetch from DB and cache when cache miss + fresh DB data", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheMiss(redis);
            arrangeDBFreshData();

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(redis.getCacheValue).toHaveBeenCalledWith(economyCacheKey);
            assertRepositoryCall(dashboardRepository, "getEconomicData", []);
            assertCacheSet(economyCacheKey, mockEconomy, ECONOMY_DATA_CACHE_DURATION);
            assertNoExternalAPICalls();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, mockEconomy);
         });

         it("should fetch from APIs when cache miss + stale DB data", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["stale", "stale"]);
            arrangeEconomyAPIErrors();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(redis.getCacheValue).toHaveBeenCalledWith(economyCacheKey);
            assertRepositoryCall(dashboardRepository, "getEconomicData", []);
            assertAllFetchCalls();
            assertDBUpdated(result.data);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should fetch from APIs when cache miss + no DB data", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(redis.getCacheValue).toHaveBeenCalledWith(economyCacheKey);
            assertRepositoryCall(dashboardRepository, "getEconomicData", []);
            assertAllFetchCalls();
            assertDBUpdated(result.data);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("Mutex Behavior", () => {
         it("should only make one API batch call for concurrent requests", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            // Make concurrent calls
            const [result1, result2] = await Promise.all([
               dashboardService.fetchEconomicalData(),
               dashboardService.fetchEconomicalData()
            ]);

            // Mutex prevents race conditions, both requests complete successfully with only 7 API calls (not 14)
            assertServiceSuccessResponse(result1, HTTP_STATUS.OK, result1.data);
            assertServiceSuccessResponse(result2, HTTP_STATUS.OK, result2.data);
         });

         it("should double-check DB after acquiring mutex and use fresh data if updated", async() => {
            const freshEconomy: Economy = createMockEconomyData();
            const freshTime = new Date();
            const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
            const mockEconomy = createMockEconomyData();

            arrangeMockCacheMiss(redis);
            // First check returns stale data, second check returns fresh data
            (dashboardRepository.getEconomicData as jest.Mock)
               .mockResolvedValueOnce({ time: staleTime.toISOString(), data: mockEconomy })
               .mockResolvedValueOnce({ time: freshTime.toISOString(), data: freshEconomy });

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            // Should not make API calls since double-check found fresh data
            assertNoExternalAPICalls();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, freshEconomy);
         });
      });

      describe("API Success Scenarios", () => {
         it("should successfully fetch from all 7 APIs", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertAllFetchCalls();
            assertDBUpdated(result.data);
            assertCacheSet(economyCacheKey, result.data, ECONOMY_DATA_CACHE_DURATION);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("Individual API Failures", () => {
         it("should use backup news when news API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["news"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup stocks when stocks API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["stocks"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup GDP when GDP API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["gdp"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup inflation when inflation API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["inflation"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup unemployment when unemployment API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["unemployment"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup treasury yield when treasury yield API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["treasuryYield"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup federal rate when federal rate API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["federalInterestRate"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("Multiple API Failures", () => {
         it("should use backup for 3 indicators when they fail", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["gdp", "inflation", "unemployment"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup when news and stocks fail", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["news", "stocks"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup for alternating failures", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["news", "gdp", "unemployment", "federalInterestRate"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup when all indicators fail", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["gdp", "inflation", "unemployment", "treasuryYield", "federalInterestRate"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup when 6 out of 7 APIs fail", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["news", "stocks", "gdp", "inflation", "unemployment", "treasuryYield"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("Complete API Failure", () => {
         it("should return backup data with short cache duration when all APIs fail", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors(["news", "stocks", "gdp", "inflation", "unemployment", "treasuryYield", "federalInterestRate"]);
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertLoggerError(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("Database Operations", () => {
         it("should update DB successfully after API fetch", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertDBUpdated(result.data);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should handle DB update failure gracefully", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors();
            arrangeMockRepositoryError(dashboardRepository, "updateEconomicData", "DB connection failed");

            // Should not throw - error is caught and handled
            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });
      });

      describe("File System Operations", () => {
         it("should write economy.json in development mode", async() => {
            process.env.NODE_ENV = "development";
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertFileWritten(result.data);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should not write file in non-development mode", async() => {
            process.env.NODE_ENV = "production";
            arrangeMockCacheMiss(redis);
            arrangeDBChecks(["none", "none"]);
            arrangeEconomyAPIErrors();
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
            expect(redis.setCacheValue).toHaveBeenCalledWith(
               economyCacheKey,
               BACKUP_ECONOMY_DATA_CACHE_DURATION,
               JSON.stringify(backupEconomyData)
            );
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should handle Redis errors gracefully", async() => {
            arrangeMockRepositoryError(redis, "getCacheValue", "Redis connection failed");

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            // Should still work with backup data
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
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
            arrangeDashboardFailures();

            const result: ServerResponse = await dashboardService.fetchDashboard(userId);

            expect(accountsService.fetchAccounts).toHaveBeenCalledWith(userId);
            expect(budgetsService.fetchBudgets).toHaveBeenCalledWith(userId);
            expect(transactionsService.fetchTransactions).toHaveBeenCalledWith(userId);
            expect(userService.fetchUserDetails).toHaveBeenCalledWith(userId);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertDashboardDataStructure(result.data);
         });
      });

      describe("Individual Service Failures", () => {
         it("should handle fetchEconomicalData failure", async() => {
            // fetchEconomicalData never throws - it returns backup data on Redis error
            arrangeMockRepositoryError(redis, "getCacheValue", "Redis error");
            arrangeDashboardFailures();

            const result: ServerResponse = await dashboardService.fetchDashboard(userId);

            // Dashboard should still succeed with backup economy data
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertDashboardDataStructure(result.data);
         });

         it("should handle fetchAccounts failure", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeDashboardFailures(["fetchAccounts"]);

            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Accounts error"
            );
         });

         it("should handle fetchBudgets failure", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeDashboardFailures(["fetchBudgets"]);

            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Budgets error"
            );
         });

         it("should handle fetchTransactions failure", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeDashboardFailures(["fetchTransactions"]);

            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Transactions error"
            );
         });

         it("should handle fetchUserDetails failure", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeDashboardFailures(["fetchUserDetails"]);

            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "UserDetails error"
            );
         });
      });

      describe("Multiple Service Failures", () => {
         it("should handle multiple services failing", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeDashboardFailures(["fetchAccounts", "fetchBudgets"]);

            // Promise.all fails fast, so first error is thrown
            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Accounts error"
            );
         });

         it("should handle all services failing", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeDashboardFailures(["fetchAccounts", "fetchBudgets", "fetchTransactions", "fetchUserDetails"]);

            // First service failure causes Promise.all to reject
            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Accounts error"
            );
         });
      });
   });

   describe("Zod Validation Failures", () => {
      it("should use backup data when news API returns invalid schema", async() => {
         arrangeMockCacheMiss(redis);
         arrangeDBChecks(["none", "none"]);
         arrangeEconomyAPIErrors([], ["news"]);
         arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

         const result: ServerResponse = await dashboardService.fetchEconomicalData();

         assertLoggerError("Error fetching news");
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         assertEconomyDataStructure(result.data);
      });

      it("should use backup data when stocks API returns invalid schema", async() => {
         arrangeMockCacheMiss(redis);
         arrangeDBChecks(["none", "none"]);
         arrangeEconomyAPIErrors([], ["stocks"]);
         arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

         const result: ServerResponse = await dashboardService.fetchEconomicalData();

         assertLoggerError("Error fetching stock trends");
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         assertEconomyDataStructure(result.data);
      });

      it("should use backup data when indicator API returns invalid schema", async() => {
         arrangeMockCacheMiss(redis);
         arrangeDBChecks(["none", "none"]);
         arrangeEconomyAPIErrors([], ["gdp"]);
         arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

         const result: ServerResponse = await dashboardService.fetchEconomicalData();

         assertLoggerError();
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         assertEconomyDataStructure(result.data);
      });
   });
});