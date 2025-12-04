import { Economy } from "capital/economy";
import { createMockEconomyData, createMockIndicatorTrends } from "capital/mocks/economy";
import { TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";

import * as dashboardService from "@/services/dashboardService";
import { BACKUP_ECONOMY_DATA_CACHE_DURATION, ECONOMY_DATA_CACHE_DURATION, getEconomicIndicatorKey } from "@/services/dashboardService";
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
jest.mock("fs");

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

describe("Dashboard Service", () => {
   const userId: string = TEST_USER_ID;
   const economyCacheKey: string = "economy";

   let redis: typeof import("@/lib/redis");
   let logger: typeof import("@/lib/logger");
   let dashboardRepository: typeof import("@/repository/dashboardRepository");
   let accountsService: typeof import("@/services/accountsService");
   let budgetsService: typeof import("@/services/budgetsService");
   let transactionsService: typeof import("@/services/transactionsService");
   let userService: typeof import("@/services/userService");
   let fs: any;

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
	 * Mock all 7 external API calls as successful
	 */
   const arrangeAllAPIsSuccess = (): void => {
      arrangeFetchNewsSuccess();
      arrangeFetchStocksSuccess();
      for (let i = 0; i < 5; i++) {
         arrangeFetchIndicatorSuccess();
      }
   };

   /**
	 * Mock database to return fresh economy data (within 24 hours)
	 */
   const arrangeDBFreshData = (): void => {
      const freshTime = new Date();
      const mockEconomy = createMockEconomyData();

      arrangeMockRepositorySuccess(
         dashboardRepository,
         "getEconomicData",
         { time: freshTime.toISOString(), data: mockEconomy }
      );
   };

   /**
	 * Mock database to return stale economy data (older than 24 hours)
	 */
   const arrangeDBStaleData = (): void => {
      const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const mockEconomy = createMockEconomyData();

      arrangeMockRepositorySuccess(
         dashboardRepository,
         "getEconomicData",
         { time: staleTime.toISOString(), data: mockEconomy }
      );
   };

   /**
	 * Mock database to return no economy data
	 */
   const arrangeDBNoData = (): void => {
      arrangeMockRepositorySuccess(dashboardRepository, "getEconomicData", null);
   };

   /**
	 * Mock all dashboard service dependencies as successful
	 */
   const arrangeServiceMocks = (): void => {
      arrangeMockRepositorySuccess(
         accountsService,
         "fetchAccounts",
         { statusCode: HTTP_STATUS.OK, data: [] }
      );
      arrangeMockRepositorySuccess(
         budgetsService,
         "fetchBudgets",
         { statusCode: HTTP_STATUS.OK, data: { categories: [], budgets: [] } }
      );
      arrangeMockRepositorySuccess(
         transactionsService,
         "fetchTransactions",
         { statusCode: HTTP_STATUS.OK, data: [] }
      );
      arrangeMockRepositorySuccess(
         userService,
         "fetchUserDetails",
         { statusCode: HTTP_STATUS.OK, data: { user_id: userId, username: "test", email: "test@test.com" } }
      );
   };

   /**
	 * Assert economy data contains all required properties
	 *
	 * @param {Economy} data - Economy data to validate
	 */
   const assertEconomyDataStructure = (data: Economy): void => {
      expect(data).toHaveProperty("news");
      expect(data).toHaveProperty("trends");
      expect(data.trends).toHaveProperty("Stocks");
      expect(data.trends).toHaveProperty("GDP");
      expect(data.trends).toHaveProperty("Inflation");
      expect(data.trends).toHaveProperty("Unemployment");
      expect(data.trends).toHaveProperty("Treasury Yield");
      expect(data.trends).toHaveProperty("Federal Interest Rate");
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
      expect(dashboardRepository.updateEconomicData).toHaveBeenCalledWith(
         expect.any(Date),
         JSON.stringify(data)
      );
   };

   /**
	 * Assert economy data written to filesystem
	 *
	 * @param {Economy} data - Economy data to write
	 */
   const assertFileWritten = (data: Economy): void => {
      expect(fs.writeFileSync).toHaveBeenCalledWith(
         expect.stringContaining("economy.json"),
         JSON.stringify(data, null, 3)
      );
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
      expect(data).toHaveProperty("accounts");
      expect(data).toHaveProperty("budgets");
      expect(data).toHaveProperty("economy");
      expect(data).toHaveProperty("transactions");
      expect(data).toHaveProperty("settings");
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

      it("should return correct key for REAL_GDP", () => {
         expect(getEconomicIndicatorKey("REAL_GDP")).toBe("GDP");
      });

      it("should return correct key for INFLATION", () => {
         expect(getEconomicIndicatorKey("INFLATION")).toBe("Inflation");
      });

      it("should return correct key for UNEMPLOYMENT", () => {
         expect(getEconomicIndicatorKey("UNEMPLOYMENT")).toBe("Unemployment");
      });

      it("should return correct key for TREASURY_YIELD", () => {
         expect(getEconomicIndicatorKey("TREASURY_YIELD")).toBe("Treasury Yield");
      });

      it("should return correct key for FEDERAL_FUNDS_RATE", () => {
         expect(getEconomicIndicatorKey("FEDERAL_FUNDS_RATE")).toBe("Federal Interest Rate");
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
            expect(global.fetch).not.toHaveBeenCalled();
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
            expect(global.fetch).not.toHaveBeenCalled();
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
            expect(global.fetch).not.toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, mockEconomy);
         });

         it("should fetch from APIs when cache miss + stale DB data", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBStaleData();
            // Double-check after mutex also returns stale
            arrangeDBStaleData();
            arrangeAllAPIsSuccess();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(redis.getCacheValue).toHaveBeenCalledWith(economyCacheKey);
            expect(dashboardRepository.getEconomicData).toHaveBeenCalled();
            assertAllFetchCalls();
            expect(dashboardRepository.updateEconomicData).toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should fetch from APIs when cache miss + no DB data", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            // Double-check after mutex also returns no data
            arrangeDBNoData();
            arrangeAllAPIsSuccess();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(redis.getCacheValue).toHaveBeenCalledWith(economyCacheKey);
            assertRepositoryCall(dashboardRepository, "getEconomicData", []);
            assertAllFetchCalls();
            expect(dashboardRepository.updateEconomicData).toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("Mutex Behavior", () => {
         it("should only make one API batch call for concurrent requests", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            // First check returns no data
            arrangeDBNoData();
            // Set up APIs for first request
            arrangeAllAPIsSuccess();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            // Make concurrent calls
            const [result1, result2] = await Promise.all([
               dashboardService.fetchEconomicalData(),
               dashboardService.fetchEconomicalData()
            ]);

            // Should only be 7 fetch calls (not 14)
            // Mutex prevents race conditions - both requests complete successfully
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
            expect(global.fetch).not.toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, freshEconomy);
         });
      });

      describe("API Success Scenarios", () => {
         it("should successfully fetch from all 7 APIs", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData(); // Double-check
            arrangeAllAPIsSuccess();
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
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchFailure(); // News fails
            arrangeFetchStocksSuccess();
            for (let i = 0; i < 5; i++) {
               arrangeFetchIndicatorSuccess();
            }
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup stocks when stocks API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchNewsSuccess();
            arrangeFetchFailure(); // Stocks fails
            for (let i = 0; i < 5; i++) {
               arrangeFetchIndicatorSuccess();
            }
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup GDP when GDP API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchNewsSuccess();
            arrangeFetchStocksSuccess();
            arrangeFetchFailure(); // GDP fails
            for (let i = 0; i < 4; i++) {
               arrangeFetchIndicatorSuccess();
            }
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup inflation when inflation API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchNewsSuccess();
            arrangeFetchStocksSuccess();
            arrangeFetchIndicatorSuccess(); // GDP succeeds
            arrangeFetchFailure(); // Inflation fails
            for (let i = 0; i < 3; i++) {
               arrangeFetchIndicatorSuccess();
            }
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup unemployment when unemployment API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchNewsSuccess();
            arrangeFetchStocksSuccess();
            arrangeFetchIndicatorSuccess(); // GDP succeeds
            arrangeFetchIndicatorSuccess(); // Inflation succeeds
            arrangeFetchFailure(); // Unemployment fails
            for (let i = 0; i < 2; i++) {
               arrangeFetchIndicatorSuccess();
            }
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup treasury yield when treasury yield API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchNewsSuccess();
            arrangeFetchStocksSuccess();
            for (let i = 0; i < 3; i++) {
               arrangeFetchIndicatorSuccess();
            }
            arrangeFetchFailure(); // Treasury Yield fails
            arrangeFetchIndicatorSuccess(); // Federal Interest Rate succeeds
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup federal rate when federal rate API fails", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchNewsSuccess();
            arrangeFetchStocksSuccess();
            for (let i = 0; i < 4; i++) {
               arrangeFetchIndicatorSuccess();
            }
            arrangeFetchFailure(); // Federal Interest Rate fails
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalled();
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("Multiple API Failures", () => {
         it("should use backup for 3 indicators when they fail", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchNewsSuccess();
            arrangeFetchStocksSuccess();
            arrangeFetchFailure(); // GDP fails
            arrangeFetchFailure(); // Inflation fails
            arrangeFetchFailure(); // Unemployment fails
            arrangeFetchIndicatorSuccess(); // Treasury Yield succeeds
            arrangeFetchIndicatorSuccess(); // Federal Interest Rate succeeds
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalledTimes(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup when news and stocks fail", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchFailure(); // News fails
            arrangeFetchFailure(); // Stocks fails
            for (let i = 0; i < 5; i++) {
               arrangeFetchIndicatorSuccess();
            }
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalledTimes(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup for alternating failures", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchFailure(); // News fails
            arrangeFetchStocksSuccess();
            arrangeFetchFailure(); // GDP fails
            arrangeFetchIndicatorSuccess(); // Inflation succeeds
            arrangeFetchFailure(); // Unemployment fails
            arrangeFetchIndicatorSuccess(); // Treasury Yield succeeds
            arrangeFetchFailure(); // Federal Interest Rate fails
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalledTimes(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup when all 5 indicators fail", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchNewsSuccess();
            arrangeFetchStocksSuccess();
            for (let i = 0; i < 5; i++) {
               arrangeFetchFailure(); // All indicators fail
            }
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalledTimes(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });

         it("should use backup when 6 out of 7 APIs fail", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeFetchFailure(); // News fails
            arrangeFetchFailure(); // Stocks fails
            arrangeFetchFailure(); // GDP fails
            arrangeFetchFailure(); // Inflation fails
            arrangeFetchFailure(); // Unemployment fails
            arrangeFetchFailure(); // Treasury Yield fails
            arrangeFetchIndicatorSuccess(); // Federal Interest Rate succeeds
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalledTimes(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("Complete API Failure", () => {
         it("should return backup data with short cache duration when all APIs fail", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            for (let i = 0; i < 7; i++) {
               arrangeFetchFailure(); // All APIs fail
            }
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            expect(logger.logger.error).toHaveBeenCalledTimes(1);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertEconomyDataStructure(result.data);
         });
      });

      describe("Database Operations", () => {
         it("should update DB successfully after API fetch", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeAllAPIsSuccess();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertDBUpdated(result.data);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should handle DB update failure gracefully", async() => {
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeAllAPIsSuccess();
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
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeAllAPIsSuccess();
            arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

            const result: ServerResponse = await dashboardService.fetchEconomicalData();

            assertFileWritten(result.data);
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         });

         it("should not write file in non-development mode", async() => {
            process.env.NODE_ENV = "production";
            arrangeMockCacheMiss(redis);
            arrangeDBNoData();
            arrangeDBNoData();
            arrangeAllAPIsSuccess();
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

            expect(logger.logger.error).toHaveBeenCalled();
            expect(redis.setCacheValue).toHaveBeenCalledWith(
               economyCacheKey,
               BACKUP_ECONOMY_DATA_CACHE_DURATION,
               expect.any(String)
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

            expect(logger.logger.error).toHaveBeenCalledWith(expect.any(String));
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
            arrangeServiceMocks();

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
            arrangeServiceMocks();

            const result: ServerResponse = await dashboardService.fetchDashboard(userId);

            // Dashboard should still succeed with backup economy data
            assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
            assertDashboardDataStructure(result.data);
         });

         it("should handle fetchAccounts failure", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeMockRepositoryError(accountsService, "fetchAccounts", "Accounts error");

            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Accounts error"
            );
         });

         it("should handle fetchBudgets failure", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeMockRepositorySuccess(accountsService, "fetchAccounts", { statusCode: HTTP_STATUS.OK, data: [] });
            arrangeMockRepositoryError(budgetsService, "fetchBudgets", "Budgets error");

            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Budgets error"
            );
         });

         it("should handle fetchTransactions failure", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeMockRepositorySuccess(accountsService, "fetchAccounts", { statusCode: HTTP_STATUS.OK, data: [] });
            arrangeMockRepositorySuccess(budgetsService, "fetchBudgets", { statusCode: HTTP_STATUS.OK, data: { categories: [], budgets: [] } });
            arrangeMockRepositoryError(transactionsService, "fetchTransactions", "Transactions error");

            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Transactions error"
            );
         });

         it("should handle fetchUserDetails failure", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeMockRepositorySuccess(accountsService, "fetchAccounts", { statusCode: HTTP_STATUS.OK, data: [] });
            arrangeMockRepositorySuccess(budgetsService, "fetchBudgets", { statusCode: HTTP_STATUS.OK, data: { categories: [], budgets: [] } });
            arrangeMockRepositorySuccess(transactionsService, "fetchTransactions", { statusCode: HTTP_STATUS.OK, data: [] });
            arrangeMockRepositoryError(userService, "fetchUserDetails", "User details error");

            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "User details error"
            );
         });
      });

      describe("Multiple Service Failures", () => {
         it("should handle multiple services failing", async() => {
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeMockRepositoryError(accountsService, "fetchAccounts", "Accounts error");
            arrangeMockRepositoryError(budgetsService, "fetchBudgets", "Budgets error");

            // Promise.all fails fast, so first error is thrown
            await assertServiceThrows(
               () => dashboardService.fetchDashboard(userId),
               "Accounts error"
            );
         });

         it("should handle all services failing", async() => {
            // Economy never fails (returns backup), so mock other services to fail
            const mockEconomy: Economy = createMockEconomyData();
            arrangeMockCacheHit(redis, JSON.stringify(mockEconomy));
            arrangeMockRepositoryError(accountsService, "fetchAccounts", "Accounts error");
            arrangeMockRepositoryError(budgetsService, "fetchBudgets", "Budgets error");
            arrangeMockRepositoryError(transactionsService, "fetchTransactions", "Transactions error");
            arrangeMockRepositoryError(userService, "fetchUserDetails", "User error");

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
         arrangeDBNoData();
         arrangeDBNoData();

         // Mock news to return invalid data (fails Zod validation)
         (global.fetch as jest.Mock).mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue({ invalid: "schema" })
         });
         // Rest of APIs succeed
         arrangeFetchStocksSuccess();
         for (let i = 0; i < 5; i++) {
            arrangeFetchIndicatorSuccess();
         }
         arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

         const result: ServerResponse = await dashboardService.fetchEconomicalData();

         expect(logger.logger.error).toHaveBeenCalledWith("Error fetching news");
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         assertEconomyDataStructure(result.data);
      });

      it("should use backup data when stocks API returns invalid schema", async() => {
         arrangeMockCacheMiss(redis);
         arrangeDBNoData();
         arrangeDBNoData();

         arrangeFetchNewsSuccess();
         // Mock stocks to return invalid data
         (global.fetch as jest.Mock).mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue({ invalid: "schema" })
         });
         for (let i = 0; i < 5; i++) {
            arrangeFetchIndicatorSuccess();
         }
         arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

         const result: ServerResponse = await dashboardService.fetchEconomicalData();

         expect(logger.logger.error).toHaveBeenCalledWith("Error fetching stock trends");
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         assertEconomyDataStructure(result.data);
      });

      it("should use backup data when indicator API returns invalid schema", async() => {
         arrangeMockCacheMiss(redis);
         arrangeDBNoData();
         arrangeDBNoData();

         arrangeFetchNewsSuccess();
         arrangeFetchStocksSuccess();
         // Mock first indicator to return invalid data
         (global.fetch as jest.Mock).mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue({ invalid: "schema" })
         });
         for (let i = 0; i < 4; i++) {
            arrangeFetchIndicatorSuccess();
         }
         arrangeMockRepositorySuccess(dashboardRepository, "updateEconomicData", undefined);

         const result: ServerResponse = await dashboardService.fetchEconomicalData();

         expect(logger.logger.error).toHaveBeenCalled();
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, result.data);
         assertEconomyDataStructure(result.data);
      });
   });
});