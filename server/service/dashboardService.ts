const fs = require("fs").promises;

import { Mutex } from "async-mutex";
import { IndicatorTrend, MarketTrends, StockTrends } from "capital/marketTrends";
import { News } from "capital/news";
import { ServerResponse } from "capital/server";
import { parseStringPromise } from "xml2js";

import * as dashboardRepository from "@/repository/dashboardRepository";
import { logger } from "@/lib/logger";
import { getCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse } from "@/lib/services";
import { fetchAccounts } from "@/service/accountsService";

// Mutex to ensure only one API call happens at a time
const mutex = new Mutex();

// Cache duration in seconds for market trends
const MARKET_TRENDS_CACHE_DURATION = 24 * 60 * 60;

// Cache duration in seconds for news
const NEWS_CACHE_DURATION = 15 * 60;

// Helper function to generate API URL with proper key
const getAlphaVantageUrl = (function_name: string, params: string = "") => {
   return `https://www.alphavantage.co/query?function=${function_name}${params}&apikey=${process.env.XRapidAPIKey}`;
};

async function fetchStocks(): Promise<StockTrends[]> {
   // Retrieve stock trends (Top Gainers, Losers, Most Active)
   const response = await fetch(getAlphaVantageUrl("TOP_GAINERS_LOSERS"), {
      method: "GET"
   }).then(response => response.json());

   if (!response["metadata"]) {
      throw new Error(response["Information"] || "Failed to fetch stock API data");
   }

   return response;
}

async function fetchIndicators(indicator: string): Promise<IndicatorTrend[]> {
   // Retrieve economic indicators (GDP, Inflation, Unemployment, etc.)
   const response = await fetch(getAlphaVantageUrl(indicator, "&interval=quarterly"), {
      method: "GET"
   }).then(response => response.json());

   if (!response["data"]) {
      throw new Error(response["Information"] || "Failed to fetch indicator API data");
   }

   return response["data"];
}

// Helper function to load backup data when API calls fail
async function loadBackupMarketTrends(): Promise<MarketTrends> {
   return JSON.parse(await fs.readFile("resources/marketTrends.json", "utf8")) as MarketTrends;
}

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

      // Need to fetch fresh data - acquire mutex to prevent duplicate API calls
      const release = await mutex.acquire();

      try {
         // Double-check if another request already updated the data
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

         // Fetch all indicators in parallel
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

         return sendServiceResponse(200, "Market Trends", marketTrends as MarketTrends);
      } finally {
         // Always release the mutex
         release();
      }
   } catch (error: any) {
      // Log error and use backup data
      logger.error(error.stack);

      // Use the backup JSON market trends file
      const backupData = await loadBackupMarketTrends();
      return sendServiceResponse(200, "Market Trends", backupData);
   }
}

async function fetchRSSFeed(): Promise<News> {
   // Retrieve the latest financial news from the Dow Jones RSS feed
   const response = await fetch(
      "https://feeds.content.dowjones.io/public/rss/mw_topstories"
   ).then(async(response) => await response.text());
   const parsedData = await parseStringPromise(response);

   return parsedData?.rss as News;
}

// Helper function to load backup news when API calls fail
async function loadBackupNews(): Promise<News> {
   const xmlData = await fs.readFile("resources/news.xml", "utf8");
   const parsedData = await parseStringPromise(xmlData);

   return parsedData?.rss as News;
}

export async function fetchNews(): Promise<ServerResponse> {
   try {
      // Try to get news from cache first
      const cache = await getCacheValue("news");

      if (cache) {
         return sendServiceResponse(200, "Financial News", JSON.parse(cache) as News);
      }

      // Fetch fresh news data
      const data = await fetchRSSFeed();
      setCacheValue("news", NEWS_CACHE_DURATION, JSON.stringify(data));

      return sendServiceResponse(200, "Financial News", data as News);
   } catch (error: any) {
      // Log error and use backup data
      logger.error(error.stack);
      // Use the backup XML news file
      const backupData = await loadBackupNews();

      return sendServiceResponse(200, "Financial News", backupData);
   }
}

export async function fetchDashboard(user_id: string): Promise<ServerResponse> {
   // Fetch all dashboard components in parallel
   const [marketTrends, news, accounts] = await Promise.all([
      fetchMarketTrends(),
      fetchNews(),
      fetchAccounts(user_id)
   ]);

   // Combine all data into a single dashboard response
   return sendServiceResponse(200, "Dashboard", {
      accounts: accounts.data,
      trends: marketTrends.data,
      news: news.data
   });
}