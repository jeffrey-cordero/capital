const fs = require("fs").promises;

import { IndicatorTrend, MarketTrends, StockTrends } from "capital-types/marketTrends";
import { News } from "capital-types/news";
import { ServerResponse } from "capital-types/server";
import { parseStringPromise } from "xml2js";

import { redisClient } from "@/app";
import { getMarketTrends, updateMarketTrends } from "@/repository/dashboardRepository";

async function fetchStocks(): Promise<StockTrends[]> {
   // Retrieve stock trends from the API (Top Gainers, Losers, and Most Active)
   const response =  await fetch(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${process.env.XRapidAPIKey}`, {
         method: "GET"
      }
   ).then(response => response.json());

   if (!response["metadata"]) {
      // Rate limit exceeded or invalid API key
      throw new Error(response["Information"] ?? "Failed to fetch stocks");
   } else {
      return response;
   }
}

async function fetchIndicators(indicator: string): Promise<IndicatorTrend[]> {
   // Retrieve economic indicators from the API (GDP, Inflation, Unemployment, Treasury Yield, and Federal Interest)
   const response = await fetch(
      `https://www.alphavantage.co/query?function=${indicator}&interval=quarterly&apikey=${process.env.XRapidAPIKey}`, {
         method: "GET"
      }
   ).then(response => response.json());

   if (!response["data"]) {
      // Rate limit exceeded or invalid API key
      throw new Error(response["Information"] ?? "Failed to fetch indicators");
   } else {
      return response["data"];
   }
}

export async function fetchMarketTrends(): Promise<ServerResponse> {
   // Fetch market trends from the cache, database, or worst-case scenario, the API to update the cache
   const cache = await redisClient.get("marketTrends");

   try {
      if (cache) {
         return {
            status: 200,
            message: "Cached Market Trends",
            data: JSON.parse(cache) as MarketTrends
         };
      } else {
         const stored = await getMarketTrends();

         if (stored.length === 0 || new Date(stored[0].time) < new Date(new Date().getTime() - 24 * 60 * 60 * 1000)) {
            // Handle missing or expired market trends data
            const marketTrends: MarketTrends = {};

            // Fetch API data
            const indicators = [
               { key: "Stocks", fetch: fetchStocks },
               { key: "GDP", fetch: () => fetchIndicators("REAL_GDP") },
               { key: "Inflation", fetch: () => fetchIndicators("INFLATION") },
               { key: "Unemployment", fetch: () => fetchIndicators("UNEMPLOYMENT") },
               { key: "Treasury Yield", fetch: () => fetchIndicators("TREASURY_YIELD") },
               { key: "Federal Interest Rate", fetch: () => fetchIndicators("FEDERAL_FUNDS_RATE") }
            ];

            const trends = await Promise.all(indicators.map(indicator => indicator.fetch()));

            indicators.forEach((indicator, index) => {
               marketTrends[indicator.key] = trends[index] as any;
            });

            // Store in the cache, database, and local backup file
            const time = new Date();
            const data = JSON.stringify(marketTrends);

            await redisClient.setex("marketTrends", 24 * 60 * 60, data);
            await fs.writeFile("resources/marketTrends.json", JSON.stringify(marketTrends, null, 3));
            await updateMarketTrends(time, data);

            return {
               status: 200,
               message: "Latest Market Trends",
               data: marketTrends
            };
         } else {
            // Return existing database cache as it is still valid in terms of time
            return {
               status: 200,
               message: "Stored Market Trends",
               data: stored[0]?.data as MarketTrends
            };
         }
      }
   } catch (error: any) {
      // Non-rate limit error
      const backup = JSON.parse(await fs.readFile("resources/marketTrends.json", "utf8")) as MarketTrends;

      if (!String(error?.message).startsWith("Thank you for using Alpha Vantage!")) {
         console.error(error);
      }

      if (await redisClient.get("marketTrends") === null) {
         // Update cache with backup data in case of API failure for 15 minutes
         await redisClient.setex("marketTrends", 15 * 60, JSON.stringify(backup));
      }

      return {
         status: 200,
         message: "Backup Market Trends",
         data: backup
      };
   }
}

async function fetchNews(): Promise<News> {
   // Retrieve the latest financial news from the Dow Jones RSS feed
   const response = await fetch(
      "https://feeds.content.dowjones.io/public/rss/mw_topstories"
   ).then(async(response) => await response.text());

   return await (await parseStringPromise(response))?.rss as News;
}

export async function fetchFinancialNews(): Promise<ServerResponse> {
   try {
      const cache = await redisClient.get("news");

      if (cache) {
         // Cache hit
         return {
            status: 200,
            message: "Cached Financial News",
            data: JSON.parse(cache) as News
         };
      } else {
         // Handle cache miss
         const data = await fetchNews();

         // Cache the news result for 15 minutes
         await redisClient.setex("news", 15 * 60, JSON.stringify(data));

         return {
            status: 200,
            message: "Latest Financial News",
            data: data as News
         };
      }
   } catch (error: any) {
      // Use backup XML news file
      console.error(error);

      const backup = (await parseStringPromise(await fs.readFile("resources/news.xml", "utf8")))?.rss as News;

      if (await redisClient.get("news") === null) {
         // Update cache with backup news in case of API failure for 5 minutes
         await redisClient.setex("news", 5 * 60, JSON.stringify(backup));
      }

      return {
         status: 200,
         message: "Backup Financial News",
         data: backup
      };
   }
}