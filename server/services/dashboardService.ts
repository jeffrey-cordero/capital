import { Mutex } from "async-mutex";
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
import fs from "fs";
import path from "path";

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
 * Backup economy data for fallback during data fetching failures
 */
const backupEconomyData = {
   news: economy.news,
   trends: {
      "Stocks": economy.trends.Stocks,
      "GDP": economy.trends.GDP,
      "Inflation": economy.trends.Inflation,
      "Unemployment": economy.trends.Unemployment,
      "Treasury Yield": economy.trends["Treasury Yield"],
      "Federal Interest Rate": economy.trends["Federal Interest Rate"]
   }
};

/**
 * Cache durations for economy data (24 hours or 5 minutes backup duration)
 */
const ECONOMY_DATA_CACHE_DURATION = 24 * 60 * 60;
const BACKUP_ECONOMY_DATA_CACHE_DURATION = 5 * 60;

/**
 * Generates Alpha Vantage API URL with function name and parameters
 *
 * @param {string} name - The function name to fetch
 * @param {string} [params] - The parameters to fetch from the function
 * @returns {string} Formatted Alpha Vantage API URL
 */
const getAlphaVantageUrl = (name: string, params: string = ""): string => {
   return `https://www.alphavantage.co/query?function=${name}${params}&apikey=${process.env.XRapidAPIKey}`;
};

/**
 * Gets the key for the economy trends data from indicator name
 *
 * @param {string} indicator - The indicator to fetch
 * @returns {keyof typeof economy.trends} Key for the economy trends data
 */
const getEconomicIndicatorKey = (indicator: string): keyof typeof economy.trends => {
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
 * Fetches stock trends from Alpha Vantage API
 *
 * @requires {process.env.XRapidAPIKey} - RapidAPI key for Alpha Vantage API
 * @returns {Promise<StockTrends>} Stock trends data (top gainers, losers, most active)
 */
async function fetchStocks(): Promise<StockTrends> {
   // Fetch top gainers, losers and most active stocks in a single API call
   const response = await fetch(getAlphaVantageUrl("TOP_GAINERS_LOSERS"), {
      method: "GET"
   }).then(response => response.json());

   // Validate the API response matches our expected schema
   const fields = stockTrendsSchema.safeParse(response);

   if (!fields.success) {
      // Potential rate limit error or unexpected changes in the API structure
      console.error(response);
      logger.error("Error fetching stock trends");

      // Return backup data from our local storage
      return stockTrendsSchema.safeParse(economy.trends.Stocks).data as StockTrends;
   }

   return fields.data;
}

/**
 * Fetches economic indicators from Alpha Vantage API
 *
 * @requires {process.env.XRapidAPIKey} - RapidAPI key for Alpha Vantage API
 * @param {string} indicator - The indicator to fetch
 * @returns {Promise<IndicatorTrends[]>} Economic indicator trends
 */
async function fetchEconomicIndicators(indicator: string): Promise<IndicatorTrends[]> {
   // Fetch economic indicator data with quarterly interval
   const response = await fetch(getAlphaVantageUrl(indicator, "&interval=quarterly"), {
      method: "GET"
   }).then(response => response.json());

   // Parse the data field from the response
   const fields = indicatorTrendsSchema.safeParse(response["data"]);

   if (!fields.success) {
      // Potential rate limit error or changes in the API structure
      logger.error("Error fetching economic indicators", response);

      // Use our local backup data for this specific indicator
      return indicatorTrendsSchema.safeParse(
         economy.trends[getEconomicIndicatorKey(indicator)]
      ).data as unknown as IndicatorTrends[];
   }

   return fields.data as unknown as IndicatorTrends[];
}

/**
 * Fetches financial news from Global Economy News API
 *
 * @requires {process.env.XRapidAPIKey} - RapidAPI key for Global Economy News API
 * @returns {Promise<News>} Latest economic news
 */
export async function fetchNews(): Promise<News> {
   // Calculate yesterday's midnight timestamp to fetch recent news
   const midnightYesterday = new Date();
   midnightYesterday.setDate(midnightYesterday.getDate() - 1);
   midnightYesterday.setHours(0, 0, 0, 0);

   // Fetch news for US economy since yesterday (convert Date to Unix timestamp)
   const response = await fetch(`https://global-economy-news.p.rapidapi.com/?initial=${midnightYesterday.getTime()}&category=economy&country=us`, {
      method: "GET",
      headers: {
         "x-rapidapi-host": "global-economy-news.p.rapidapi.com",
         "x-rapidapi-key": process.env.XRapidAPIKey || ""
      }
   }).then(response => response.json());

   // Validate response with our news schema
   const fields = newsSchema.safeParse(response);

   if (!fields.success) {
      // Potential rate limit error or changes in the API structure
      console.error(response);
      logger.error("Error fetching news");

      // Return our local backup news data
      return newsSchema.safeParse(economy.news).data as News;
   }

   return fields.data;
}

/**
 * Fetches economy data from cache, database, or external APIs
 *
 * @requires {process.env.XRapidAPIKey} - RapidAPI key for Alpha Vantage API
 * @returns {Promise<ServerResponse>} A server response of `200` with economy data
 */
export async function fetchEconomicalData(): Promise<ServerResponse> {
   try {
      // First check if we have fresh data in Redis cache
      const cache = await getCacheValue("economy");

      if (cache) {
         return sendServiceResponse(200, JSON.parse(cache));
      }

      // No cache hit - check if we have fresh data in the database
      const stored = await dashboardRepository.getEconomicData();

      // Check if the stored data is stale (older than our cache duration)
      const isStale = !stored || new Date(stored.time) < new Date(new Date().getTime() - ECONOMY_DATA_CACHE_DURATION * 1000);

      if (!isStale) {
         // We have fresh data in the database - cache it and return
         setCacheValue("economy", ECONOMY_DATA_CACHE_DURATION, JSON.stringify(stored.data));
         return sendServiceResponse(200, stored.data);
      }

      // Need to fetch from external APIs - acquire mutex to avoid duplicate calls
      // This prevents multiple API requests if several users hit the endpoint simultaneously
      const release = await mutex.acquire();

      try {
         // Double-check if another request handler has already updated the database
         const updates = await dashboardRepository.getEconomicData();

         if (updates && new Date(updates.time) > new Date(new Date().getTime() - ECONOMY_DATA_CACHE_DURATION * 1000)) {
            return sendServiceResponse(200, updates.data);
         }

         // Define all the API data we need to fetch
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

         // Save the data to database and cache
         const time = new Date();
         const data = JSON.stringify(economy);

         await dashboardRepository.updateEconomicData(time, data);
         setCacheValue("economy", ECONOMY_DATA_CACHE_DURATION, data);

         // Backup the data to a file
         if (process.env.NODE_ENV === "development") {
            const resourcesPath = path.join(__dirname, "..", "resources", "economy.json");
            fs.writeFileSync(resourcesPath, JSON.stringify(economy, null, 3));
         }

         return sendServiceResponse(200, economy);
      } finally {
         // Always release the mutex regardless of success or failure
         release();
      }
   } catch (error: any) {
      // Log any unexpected errors
      logger.error(error.stack);

      // Use backup data with a shorter cache duration to eventually retry the API call
      setCacheValue("economy", BACKUP_ECONOMY_DATA_CACHE_DURATION, JSON.stringify(backupEconomyData));

      return sendServiceResponse(200, backupEconomyData);
   }
}

/**
 * Fetches the dashboard data for the user
 *
 * @param {string} user_id - User identifier
 * @returns {Promise<ServerResponse>} A server response of `200` with dashboard data
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

   // Combine all the components into a single dashboard response
   return sendServiceResponse(200, {
      accounts: accounts.data,
      budgets: budgets.data,
      economy: economy.data,
      transactions: transactions.data,
      settings: settings.data
   });
}