import { Mutex } from "async-mutex";
import type { Dashboard, ExternalAPIs } from "capital/dashboard";
import { IndicatorTrends, indicatorTrendsSchema, MarketTrends, StockTrends, stockTrendsSchema } from "capital/markets";
import { News, newsSchema } from "capital/news";
import { ServerResponse } from "capital/server";

import { logger } from "@/lib/logger";
import { getCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse } from "@/lib/services";
import * as dashboardRepository from "@/repository/dashboardRepository";
import external from "@/resources/external.json";
import { fetchAccounts } from "@/service/accountsService";
import { fetchBudgets } from "@/service/budgetsService";
import { fetchTransactions } from "@/service/transactionsService";

/**
 * Mutex to ensure only one API call occurs at runtime to prevent rate limiting errors
 */
const mutex = new Mutex();

/**
 * Cache durations in seconds the external API's (24 hours)
 */
const EXTERNAL_API_CACHE_DURATION = 24 * 60 * 60;
const EXTERNAL_API_BACKUP_CACHE_DURATION = 5 * 60;

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
 * Helper function to get the key for the external API data
 *
 * @param {string} indicator - The indicator to fetch
 * @returns {keyof typeof external} The key for the external API data
 */
const getEconomicIndicatorKey = (indicator: string): keyof typeof external => {
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
      // Potential rate limit error or unexpected API response structure
      logger.error("Error fetching stock trends", response);

      return stockTrendsSchema.safeParse(external.Stocks).data as StockTrends;
   }

   return fields.data as StockTrends;
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
      // Potential rate limit error or new API response structure
      logger.error("Error fetching economic indicators", response);

      return indicatorTrendsSchema.safeParse(
         external[getEconomicIndicatorKey(indicator)
      ]).data as unknown as IndicatorTrends[];
   }

   return fields.data as unknown as IndicatorTrends[];
}

/**
 * Fetches the latest financial news from the Global Economy News API (TrawlingWeb)
 *
 * @returns {Promise<News>} The latest economic news
 */
export async function fetchNews(): Promise<News> {
   const response = await fetch("https://global-economy-news.p.rapidapi.com/?category=economy&country=us", {
      method: "GET",
      headers: {
         "x-rapidapi-host": "global-economy-news.p.rapidapi.com",
         "x-rapidapi-key": process.env.XRapidAPIKey || ""
      }
   }).then(response => response.json());
   const fields = newsSchema.safeParse(response);

   if (!fields.success) {
      logger.error("Error fetching news", response);

      return newsSchema.safeParse(external.News).data as News;
   }

   return fields.data as News;
}

/**
 * Fetches most-recent external API data from the cache, database, or external API's.
 *
 * @returns {Promise<ServerResponse>} The external API data
 */
export async function fetchExternalAPIs(): Promise<ServerResponse> {
   try {
      // Try to get external APIs from cache first
      const cache = await getCacheValue("externalAPIs");

      if (cache) {
         return sendServiceResponse(200, "External APIs", JSON.parse(cache) as ExternalAPIs);
      }

      // Check if we have fresh data in the database
      const stored = await dashboardRepository.getExternalAPIs();
      const isStale = !stored || new Date(stored.time) < new Date(new Date().getTime() - EXTERNAL_API_CACHE_DURATION * 1000);

      if (!isStale) {
         // Return the existing non-stale database content
         return sendServiceResponse(200, "External APIs", stored.data as ExternalAPIs);
      }

      // Need to fetch from external API's - acquire mutex to prevent duplicate API calls
      const release = await mutex.acquire();

      try {
         // Double-check if another request already updated the database
         const updates = await dashboardRepository.getExternalAPIs();

         if (updates && new Date(updates.time) > new Date(new Date().getTime() - EXTERNAL_API_CACHE_DURATION * 1000)) {
            return sendServiceResponse(200, "External APIs", updates.data as ExternalAPIs);
         }

         // Define external APIs to fetch
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

         // Construct external APIs object for response
         const externalAPIs: ExternalAPIs = {
            news: results[0] as News,
            trends: results.slice(1).reduce((acc, record, index) => {
               acc[methods[index + 1].key] = record as StockTrends | IndicatorTrends[];

               return acc;
            }, {} as MarketTrends)
         };

         // Store data in database and cache
         const time = new Date();
         const data = JSON.stringify(externalAPIs);

         await dashboardRepository.updateExternalAPIs(time, data);
         setCacheValue("externalAPIs", EXTERNAL_API_CACHE_DURATION, data);

         return sendServiceResponse(200, "External APIs", externalAPIs);
      } finally {
         // Always release the mutex to prevent deadlocks
         release();
      }
   } catch (error: any) {
      // Log error and use backup data
      logger.error(error.stack);

      // Use the external API data and cache for a shorter duration
      setCacheValue("externalAPIs", EXTERNAL_API_BACKUP_CACHE_DURATION, JSON.stringify(external));

      return sendServiceResponse(200, "External APIs", external);
   }
}

/**
 * Fetches the dashboard data for the user.
 *
 * @param {string} user_id - The user ID
 * @returns {Promise<ServerResponse>} A server response of `200` (`Dashboard`)
 */
export async function fetchDashboard(user_id: string): Promise<ServerResponse> {
   // Fetch all dashboard components in parallel
   const [externalAPIs, accounts, budgets, transactions] = await Promise.all([
      fetchExternalAPIs(),
      fetchAccounts(user_id),
      fetchBudgets(user_id),
      fetchTransactions(user_id)
   ]);

   // Combine all data into a single dashboard response
   return sendServiceResponse(200, "Dashboard", {
      accounts: accounts.data,
      budgets: budgets.data,
      externalAPIs: externalAPIs.data,
      transactions: transactions.data
   } as Dashboard);
}