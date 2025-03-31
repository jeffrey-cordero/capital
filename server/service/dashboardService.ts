const fs = require("fs").promises;

import { Mutex } from "async-mutex";
import type { Dashboard } from "capital/dashboard";
import { IndicatorTrend, MarketTrends, StockTrends } from "capital/markets";
import { News } from "capital/news";
import { ServerResponse } from "capital/server";
import { parseStringPromise } from "xml2js";

import { logger } from "@/lib/logger";
import { getCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse } from "@/lib/services";
import * as dashboardRepository from "@/repository/dashboardRepository";
import { fetchAccounts } from "@/service/accountsService";
import { fetchBudgets } from "@/service/budgetsService";
import { fetchTransactions } from "@/service/transactionsService";

/**
 * Mutex to ensure only one API call occurs at runtime to prevent rate limiting errors
 */
const mutex = new Mutex();

/**
 * Cache durations in seconds for market trends (24 hours)
 */
const MARKET_TRENDS_CACHE_DURATION = 24 * 60 * 60;
const MARKET_TRENDS_BACKUP_CACHE_DURATION = 5 * 60;

/**
 * Cache duration in seconds for news (15 minutes)
 */
const NEWS_CACHE_DURATION = 15 * 60;
const NEWS_BACKUP_CACHE_DURATION = 5 * 60;

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
 * Fetches stock trends (Top Gainers, Losers, Most Active) from the Alpha Vantage API
 *
 * @returns {Promise<StockTrends>} The stock trends
 * @throws {Error} If the stock API response is invalid or the API call fails
 */
async function fetchStocks(): Promise<StockTrends> {
   // Retrieve stock trends (Top Gainers, Losers, Most Active)
   const response = await fetch(getAlphaVantageUrl("TOP_GAINERS_LOSERS"), {
      method: "GET"
   }).then(response => response.json());

   if (!response["top_gainers"] || !response["top_losers"] || !response["most_actively_traded"] || !response["last_updated"] || !response["metadata"]) {
      // Potential rate limit error or new API response structure
      throw new Error(response["Information"] || "Invalid stock API response");
   }

   return response as StockTrends;
}

/**
 * Fetches economic indicators from the Alpha Vantage API
 *
 * @param {string} indicator - The indicator to fetch
 * @returns {Promise<IndicatorTrend[]>} The economic indicators
 * @throws {Error} If the indicator API response is invalid or the API call fails
*/
async function fetchEconomicIndicators(indicator: string): Promise<IndicatorTrend[]> {
   // Retrieve economic indicators (GDP, Inflation, Unemployment, etc.)
   const response = await fetch(getAlphaVantageUrl(indicator, "&interval=quarterly"), {
      method: "GET"
   }).then(response => response.json());

   if (!response["data"] || !response["data"].length) {
      // Potential rate limit error or new API response structure
      throw new Error(response["Information"] || "Failed to fetch indicator API data");
   }

   return response["data"] as IndicatorTrend[];
}

/**
 * Loads the backup market trends file.
 *
 * @returns {Promise<MarketTrends>} The market trends
 */
async function loadBackupMarketTrends(): Promise<MarketTrends> {
   return JSON.parse(await fs.readFile("resources/markets.json", "utf8")) as MarketTrends;
}

/**
 * Fetches most-recent market trends from the cache, database, or external API's.
 *
 * @returns {Promise<ServerResponse>} The market trends
 */
export async function fetchMarketTrends(): Promise<ServerResponse> {
   try {
      // Try to get market trends from cache first
      const cache = await getCacheValue("marketTrends");

      if (cache) {
         return sendServiceResponse(200, "Market Trends", JSON.parse(cache) as MarketTrends);
      }

      // Check if we have fresh data in the database
      const stored = await dashboardRepository.getMarketTrends();
      const isStale = !stored || new Date(stored.time) < new Date(new Date().getTime() - MARKET_TRENDS_CACHE_DURATION * 1000);

      if (!isStale) {
         // Return the existing non-stale database content
         return sendServiceResponse(200, "Market Trends", stored.data as MarketTrends);
      }

      // Need to fetch from external API's - acquire mutex to prevent duplicate API calls
      const release = await mutex.acquire();

      try {
         // Double-check if another request already updated the database
         const updates = await dashboardRepository.getMarketTrends();

         if (updates && new Date(updates.time) > new Date(new Date().getTime() - MARKET_TRENDS_CACHE_DURATION * 1000)) {
            return sendServiceResponse(200, "Market Trends", updates.data as MarketTrends);
         }

         // Define economic indicators / stock trends to fetch
         const indicators = [
            { key: "Stocks", fetch: fetchStocks },
            { key: "GDP", fetch: () => fetchEconomicIndicators("REAL_GDP") },
            { key: "Inflation", fetch: () => fetchEconomicIndicators("INFLATION") },
            { key: "Unemployment", fetch: () => fetchEconomicIndicators("UNEMPLOYMENT") },
            { key: "Treasury Yield", fetch: () => fetchEconomicIndicators("TREASURY_YIELD") },
            { key: "Federal Interest Rate", fetch: () => fetchEconomicIndicators("FEDERAL_FUNDS_RATE") }
         ];

         // Fetch all indicators in parallel
         const trends = await Promise.all(indicators.map(indicator => indicator.fetch()));

         // Construct market trends object for response
         const marketTrends: MarketTrends = {};
         indicators.forEach((indicator, index) => {
            marketTrends[indicator.key] = trends[index] as any;
         });

         // Store data in database and cache
         const time = new Date();
         const data = JSON.stringify(marketTrends);

         await dashboardRepository.updateMarketTrends(time, data);
         setCacheValue("marketTrends", MARKET_TRENDS_CACHE_DURATION, data);

         return sendServiceResponse(200, "Market Trends", marketTrends);
      } finally {
         // Always release the mutex to prevent deadlocks
         release();
      }
   } catch (error: any) {
      // Log error and use backup data
      logger.error(error.stack);

      // Use the backup JSON file and cache for a shorter duration
      const backupData = await loadBackupMarketTrends();
      setCacheValue("marketTrends", MARKET_TRENDS_BACKUP_CACHE_DURATION, JSON.stringify(backupData));

      return sendServiceResponse(200, "Market Trends", backupData);
   }
}

/**
 * Fetches the latest financial news from the Dow Jones RSS feed.
 *
 * @returns {Promise<News>} The latest financial news
 * @throws {Error} If the RSS feed is invalid or the API call fails
 */
export async function fetchRSSFeed(): Promise<News> {
   // Retrieve the latest financial news from the Dow Jones RSS feed
   const response = await fetch(
      "https://www.spglobal.com/spdji/en/rss/rss-details/?rssFeedName=mw_topstories"
   ).then(async(response) => await response.text());
   const data = await parseStringPromise(response);

   if (!data?.rss?.channel?.item?.length) {
      // Potential rate limit error or new API response structure
      throw new Error(data?.rss || "Invalid RSS Feed");
   }

   return data.rss as News;
}

/**
 * Loads the backup news file.
 *
 * @returns {Promise<News>} The latest financial news
 */
async function loadBackupNews(): Promise<News> {
   const xmlData = await fs.readFile("resources/news.xml", "utf8");
   const data = await parseStringPromise(xmlData);

   return data?.rss as News;
}

/**
 * Fetches the latest financial news from the cache or public Dow Jones RSS feed.
 *
 * @returns {Promise<ServerResponse>} The latest financial news
 */
export async function fetchNews(): Promise<ServerResponse> {
   try {
      // Try to get news from cache first
      const cache = await getCacheValue("news");

      if (cache) {
         return sendServiceResponse(200, "Financial News", JSON.parse(cache) as News);
      }

      // Rely on backup news file for now until RSS feed is normalized due to ongoing changes
      const data = await loadBackupNews();
      setCacheValue("news", NEWS_CACHE_DURATION, JSON.stringify(data));

      return sendServiceResponse(200, "Financial News", data);
   } catch (error: any) {
      // Log error and use backup data
      logger.error(error.stack);

      // Use the backup XML news file and cache for a shorter duration
      const backupData = await loadBackupNews();
      setCacheValue("news", NEWS_BACKUP_CACHE_DURATION, JSON.stringify(backupData));

      return sendServiceResponse(200, "Financial News", backupData);
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
   const [marketTrends, news, accounts, budgets, transactions] = await Promise.all([
      fetchMarketTrends(),
      fetchNews(),
      fetchAccounts(user_id),
      fetchBudgets(user_id),
      fetchTransactions(user_id)
   ]);

   // Combine all data into a single dashboard response
   return sendServiceResponse(200, "Dashboard", {
      accounts: accounts.data,
      budgets: budgets.data,
      trends: marketTrends.data,
      news: news.data,
      transactions: transactions.data
   } as Dashboard);
}