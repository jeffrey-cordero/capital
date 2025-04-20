import { Mutex } from "async-mutex";
import type { Dashboard } from "capital/dashboard";
import {
   Economy,
   IndicatorTrends,
   indicatorTrendsSchema,
   News,
   newsSchema,
   StockTrends,
   stockTrendsSchema,
   Trends
} from "capital/economy";
import { ServerResponse } from "capital/server";

import { logger } from "@/lib/logger";
import { getCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse } from "@/lib/services";
import * as dashboardRepository from "@/repository/dashboardRepository";
import economy from "@/resources/economy.json";
import { fetchAccounts } from "@/services/accountsService";
import { fetchBudgets } from "@/services/budgetsService";
import { fetchTransactions } from "@/services/transactionsService";
import { fetchUserDetails } from "@/services/userService";

/**
 * Mutex to ensure only one external API batch call is processed at a time
 */
const mutex = new Mutex();

/**
 * Backup economy data to use in case of failure during data fetching
 */
const backupEconomyData = {
   news: economy.News,
   trends: {
      "Stocks": economy.Stocks,
      "GDP": economy.GDP,
      "Inflation": economy.Inflation,
      "Unemployment": economy.Unemployment,
      "Treasury Yield": economy["Treasury Yield"],
      "Federal Interest Rate": economy["Federal Interest Rate"]
   }
};

/**
 * Cache durations in seconds for the economy data - `24` hours or `5` minutes
 */
const ECONOMY_DATA_CACHE_DURATION = 24 * 60 * 60;
const BACKUP_ECONOMY_DATA_CACHE_DURATION = 5 * 60;

/**
 * Helper function to generate Alpha Vantage API URL with the provided function name and parameters,
 * requiring the `XRapidAPIKey` environment variable to be set
 *
 * @param {string} name - The function name to fetch
 * @param {string} params - The parameters to fetch from the function
 * @returns {string} The formatted Alpha Vantage API URL
 */
const getAlphaVantageUrl = (name: string, params: string = ""): string => {
   return `https://www.alphavantage.co/query?function=${name}${params}&apikey=${process.env.XRapidAPIKey}`;
};

/**
 * Helper function to get the key for the economy data
 *
 * @param {string} indicator - The indicator to fetch
 * @returns {keyof typeof economy} The key for the economy data
 */
const getEconomicIndicatorKey = (indicator: string): keyof typeof economy => {
   switch (indicator) {
      case "REAL_GDP":
         return "GDP";
      case "INFLATION":
         return "Inflation";
      case "UNEMPLOYMENT":
         return "Unemployment";
      case "TREASURY_YIELD":
         return "Treasury Yield";
      case "FEDERAL_FUNDS_RATE":
         return "Federal Interest Rate";
      default:
         throw new Error(`Invalid economic indicator: ${indicator}`);
   }
};

/**
 * Fetches stock trends (Top Gainers, Losers, Most Active) from the Alpha Vantage API
 *
 * @returns {Promise<StockTrends>} The stock trends
 */
async function fetchStocks(): Promise<StockTrends> {
   // Retrieve stock trends (Top Gainers, Losers, Most Active)
   const response = await fetch(getAlphaVantageUrl("TOP_GAINERS_LOSERS"), {
      method: "GET"
   }).then(response => response.json());
   const fields = stockTrendsSchema.safeParse(response);

   if (!fields.success) {
      // Potential rate limit error or unexpected changes in the API structure
      logger.error("Error fetching stock trends", JSON.stringify(response));

      return stockTrendsSchema.safeParse(economy.Stocks).data as StockTrends;
   }

   return fields.data;
}

/**
 * Fetches economic indicators from the Alpha Vantage API
 *
 * @param {string} indicator - The indicator to fetch
 * @returns {Promise<IndicatorTrends[]>} The economic indicators
 * @throws {Error} If the indicator API response is invalid or the API call fails
*/
async function fetchEconomicIndicators(indicator: string): Promise<IndicatorTrends[]> {
   // Retrieve economic indicators (GDP, Inflation, Unemployment, etc.)
   const response = await fetch(getAlphaVantageUrl(indicator, "&interval=quarterly"), {
      method: "GET"
   }).then(response => response.json());
   const fields = indicatorTrendsSchema.safeParse(response["data"]);

   if (!fields.success) {
      // Potential rate limit error or changes in the API structure
      logger.error("Error fetching economic indicators", JSON.stringify(response));

      return indicatorTrendsSchema.safeParse(
         economy[getEconomicIndicatorKey(indicator)]
      ).data as unknown as IndicatorTrends[];
   }

   return fields.data as unknown as IndicatorTrends[];
}

/**
 * Fetches the latest financial news from the Global Economy News API (TrawlingWeb)
 *
 * @returns {Promise<News>} The latest economic news
 */
export async function fetchNews(): Promise<News> {
   // Fetch news based on yesterday's date
   const midnightYesterday = new Date();
   midnightYesterday.setDate(midnightYesterday.getDate() - 1);
   midnightYesterday.setHours(0, 0, 0, 0);

   const response = await fetch(`https://global-economy-news.p.rapidapi.com/?initial=${midnightYesterday}&category=economy&country=us`, {
      method: "GET",
      headers: {
         "x-rapidapi-host": "global-economy-news.p.rapidapi.com",
         "x-rapidapi-key": process.env.XRapidAPIKey || ""
      }
   }).then(response => response.json());
   const fields = newsSchema.safeParse(response);

   if (!fields.success) {
      // Potential rate limit error or changes in the API structure
      logger.error("Error fetching news", response);

      return newsSchema.safeParse(economy.News).data as News;
   }

   return fields.data;
}

/**
 * Fetches most-recent economy data from the cache, database, or external API's.
 *
 * @returns {Promise<ServerResponse>} The economical data
 */
export async function fetchEconomicalData(): Promise<ServerResponse> {
   try {
      // Try to get external APIs from the cache first
      const cache = await getCacheValue("economy");

      if (cache) {
         return sendServiceResponse(200, JSON.parse(cache));
      }

      // Check if we have fresh data in the database
      const stored = await dashboardRepository.getEconomicData();
      const isStale = !stored || new Date(stored.time) < new Date(new Date().getTime() - ECONOMY_DATA_CACHE_DURATION * 1000);

      if (!isStale) {
         // Return the existing non-stale database content
         setCacheValue("economy", ECONOMY_DATA_CACHE_DURATION, JSON.stringify(stored.data));
         return sendServiceResponse(200, stored.data);
      }

      // Need to fetch from external API's, thus we acquire mutex to prevent duplicate API batch calls
      const release = await mutex.acquire();

      try {
         // Double-check if another request handler has already updated the database
         const updates = await dashboardRepository.getEconomicData();

         if (updates && new Date(updates.time) > new Date(new Date().getTime() - ECONOMY_DATA_CACHE_DURATION * 1000)) {
            return sendServiceResponse(200, updates.data);
         }

         // Define the external APIs to fetch
         const methods = [
            { key: "News", fetch: fetchNews },
            { key: "Stocks", fetch: fetchStocks },
            { key: "GDP", fetch: () => fetchEconomicIndicators("REAL_GDP") },
            { key: "Inflation", fetch: () => fetchEconomicIndicators("INFLATION") },
            { key: "Unemployment", fetch: () => fetchEconomicIndicators("UNEMPLOYMENT") },
            { key: "Treasury Yield", fetch: () => fetchEconomicIndicators("TREASURY_YIELD") },
            { key: "Federal Interest Rate", fetch: () => fetchEconomicIndicators("FEDERAL_FUNDS_RATE") }
         ];

         // Fetch all external APIs in parallel
         const results = await Promise.all(methods.map(method => method.fetch()));

         // Construct the external APIs object for the response
         const economy: Economy = {
            news: results[0] as News,
            trends: results.slice(1).reduce((acc, record, index) => {
               acc[methods[index + 1].key] = record as StockTrends | IndicatorTrends[];

               return acc;
            }, {} as Trends)
         };

         // Store the data in the database and cache
         const time = new Date();
         const data = JSON.stringify(economy);

         await dashboardRepository.updateEconomicData(time, data);
         setCacheValue("economy", ECONOMY_DATA_CACHE_DURATION, data);

         return sendServiceResponse(200, economy);
      } finally {
         // Always release the mutex to prevent deadlocks
         release();
      }
   } catch (error: any) {
      // Log the unexpected error and use the backup data
      logger.error(error.stack);
      // Use the backup economy data and cache for a shorter duration
      setCacheValue("economy", BACKUP_ECONOMY_DATA_CACHE_DURATION, JSON.stringify(backupEconomyData));

      return sendServiceResponse(200, backupEconomyData);
   }
}

/**
 * Fetches the dashboard data for the user.
 *
 * @param {string} user_id - The user ID
 * @returns {Promise<ServerResponse>} A server response of `200` (`Dashboard`)
 */
export async function fetchDashboard(user_id: string): Promise<ServerResponse> {
   // Fetch all the essential dashboard components in parallel
   const [economy, accounts, budgets, transactions, settings] = await Promise.all([
      fetchEconomicalData(),
      fetchAccounts(user_id),
      fetchBudgets(user_id),
      fetchTransactions(user_id),
      fetchUserDetails(user_id)
   ]);

   // Combine all the essential dashboard components into a single response
   return sendServiceResponse(200, {
      accounts: accounts.data,
      budgets: budgets.data,
      economy: economy.data,
      transactions: transactions.data,
      settings: settings.data
   });
}