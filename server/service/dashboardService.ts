const fs = require("fs").promises;

import { Mutex } from "async-mutex";
import { IndicatorTrend, MarketTrends, StockTrends } from "capital/marketTrends";
import { News } from "capital/news";
import { ServerResponse } from "capital/server";
import { parseStringPromise } from "xml2js";

import { logger } from "@/lib/logger";
import { getCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse } from "@/lib/services";
import * as dashboardRepository from "@/repository/dashboardRepository";
import { fetchAccounts } from "@/service/accountsService";
import { fetchBudgets } from "@/service/budgetsService";

/**
 * Mutex to ensure only one API call happens at a time as concurrent API calls can cause rate limiting issues
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
 * Helper function to generate Alpha Vantage API URL with proper key
 *
 * @param {string} name - The function name to fetch
 * @param {string} params - The parameters to fetch from the function
 * @returns {string} The formatted Alpha Vantage API URL
 * @description
 * - Generates a formatted Alpha Vantage API URL with the provided function name and parameters
 * - Appends the API key to the URL
 * - Requires the XRapidAPIKey environment variable to be set
 */
const getAlphaVantageUrl = (name: string, params: string = ""): string => {
   return `https://www.alphavantage.co/query?function=${name}${params}&apikey=${process.env.XRapidAPIKey}`;
};

/**
 * Fetches stock trends from the Alpha Vantage API
 *
 * @returns {Promise<StockTrends>} The stock trends
 * @description
 * - Retrieves stock trends (Top Gainers, Losers, Most Active)
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
 * @description
 * - Retrieves economic indicators (GDP, Inflation, Unemployment, etc.)
*/
async function fetchIndicators(indicator: string): Promise<IndicatorTrend[]> {
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
 * Loads the backup market trends file
 *
 * @returns {Promise<MarketTrends>} The market trends
 * @description
 * - Loads the backup market trends file
 */
async function loadBackupMarketTrends(): Promise<MarketTrends> {
   return JSON.parse(await fs.readFile("resources/marketTrends.json", "utf8")) as MarketTrends;
}

/**
 * Fetches market trends from the database or API
 *
 * @returns {Promise<ServerResponse>} The market trends
 * @description
 * - Retrieves market trends (Stocks, GDP, Inflation, Unemployment, etc.)
 * - Caches the market trends for 24 hours or 5 minutes if the API call fails
 * - Uses the backup market trends file if the API call fails
 */
export async function fetchMarketTrends(): Promise<ServerResponse> {
   try {
      // Try to get market trends from cache first for better performance
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

      // Need to fetch fresh data - acquire mutex to prevent duplicate API calls
      const release = await mutex.acquire();

      try {
         // Double-check if another request already updated the data while we were waiting
         const updates = await dashboardRepository.getMarketTrends();

         if (updates && new Date(updates.time) > new Date(new Date().getTime() - MARKET_TRENDS_CACHE_DURATION * 1000)) {
            return sendServiceResponse(200, "Market Trends", updates.data as MarketTrends);
         }

         // Define indicators to fetch
         const indicators = [
            { key: "Stocks", fetch: fetchStocks },
            { key: "GDP", fetch: () => fetchIndicators("REAL_GDP") },
            { key: "Inflation", fetch: () => fetchIndicators("INFLATION") },
            { key: "Unemployment", fetch: () => fetchIndicators("UNEMPLOYMENT") },
            { key: "Treasury Yield", fetch: () => fetchIndicators("TREASURY_YIELD") },
            { key: "Federal Interest Rate", fetch: () => fetchIndicators("FEDERAL_FUNDS_RATE") }
         ];

         // Fetch all indicators in parallel for better performance
         const trends = await Promise.all(indicators.map(indicator => indicator.fetch()));

         // Construct market trends object
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

      // Use the backup JSON market trends file with a 5 minute cache duration
      const backupData = await loadBackupMarketTrends();
      setCacheValue("marketTrends", MARKET_TRENDS_BACKUP_CACHE_DURATION, JSON.stringify(backupData));

      return sendServiceResponse(200, "Market Trends", backupData);
   }
}

/**
 * Fetches the latest financial news from the Dow Jones RSS feed
 *
 * @returns {Promise<News>} The latest financial news
 * @description
 * - Retrieves the latest financial news from the Dow Jones RSS feed
 */
export async function fetchRSSFeed(): Promise<News> {
   // Retrieve the latest financial news from the Dow Jones RSS feed
   const response = await fetch(
      "https://www.spglobal.com/spdji/en/rss/rss-details/?rssFeedName=mw_topstories"
   ).then(async(response) => await response.text());
   const parsedData = await parseStringPromise(response);

   if (!parsedData?.rss || !parsedData?.rss?.channel || !parsedData?.rss?.channel?.item?.length) {
      // Potential rate limit error or new API response structure
      throw new Error(parsedData?.rss || "Invalid RSS feed response");
   }

   return parsedData.rss as News;
}

/**
 * Loads the backup news file
 *
 * @returns {Promise<News>} The latest financial news
 * @description
 * - Loads the backup news file
 */
async function loadBackupNews(): Promise<News> {
   const xmlData = await fs.readFile("resources/news.xml", "utf8");
   const parsedData = await parseStringPromise(xmlData);

   return parsedData?.rss as News;
}

/**
 * Fetches the latest financial news from the Dow Jones RSS feed
 *
 * @returns {Promise<ServerResponse>} The latest financial news
 * @description
 * - Retrieves the latest financial news from the Dow Jones RSS feed
 * - Caches the news for 15 minutes or 5 minutes if the API call fails
 * - Uses the backup news file if the API call fails
 */
export async function fetchNews(): Promise<ServerResponse> {
   try {
      // Try to get news from cache first for better performance
      const cache = await getCacheValue("news");

      if (cache) {
         return sendServiceResponse(200, "Financial News", JSON.parse(cache) as News);
      }

      // Rely on backup news file for now until RSS feed is normalized due to ongoing RSS feed changes
      const data = await loadBackupNews();
      setCacheValue("news", NEWS_CACHE_DURATION, JSON.stringify(data));

      return sendServiceResponse(200, "Financial News", data);
   } catch (error: any) {
      // Log error and use backup data
      logger.error(error.stack);

      // Use the backup XML news file with a 5 minute cache duration
      const backupData = await loadBackupNews();
      setCacheValue("news", NEWS_BACKUP_CACHE_DURATION, JSON.stringify(backupData));

      return sendServiceResponse(200, "Financial News", backupData);
   }
}

/**
 * Fetches the dashboard data for the user
 *
 * @param {string} user_id - The user ID
 * @returns {Promise<ServerResponse>} The dashboard data
 * @description
 * - Retrieves the dashboard data for the user
 * - Combines all data into a single dashboard response (Trends, News, Accounts, Budgets, etc.)
 */
export async function fetchDashboard(user_id: string): Promise<ServerResponse> {
   // Fetch all dashboard components in parallel for better performance
   const [marketTrends, news, accounts, budgets] = await Promise.all([
      fetchMarketTrends(),
      fetchNews(),
      fetchAccounts(user_id),
      fetchBudgets(user_id)
   ]);

   // Combine all data into a single dashboard response
   return sendServiceResponse(200, "Dashboard", {
      accounts: accounts.data,
      budgets: budgets.data,
      trends: marketTrends.data,
      news: news.data
   });
}