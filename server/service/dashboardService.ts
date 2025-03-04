const fs = require("fs").promises;

import { IndicatorTrend, MarketTrends, StockTrends } from "capital/marketTrends";
import { News } from "capital/news";
import { ServerResponse } from "capital/server";
import { parseStringPromise } from "xml2js";

import { redisClient } from "@/app";
import { sendServerResponse } from "@/lib/api/service";
import { getMarketTrends, updateMarketTrends } from "@/repository/dashboardRepository";
import { fetchAccounts } from "@/service/accountsService";

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
         return sendServerResponse(200, "Market Trends", JSON.parse(cache) as MarketTrends);
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

            return sendServerResponse(200, "Market Trends", marketTrends as MarketTrends);
         } else {
            // Return existing database cache that is still valid
            return sendServerResponse(200, "Market Trends", stored[0].data as MarketTrends);
         }
      }
   } catch (error: any) {
      // Non-rate limit error
      const backup = JSON.parse(await fs.readFile("resources/marketTrends.json", "utf8"));

      if (!String(error?.message).startsWith("Thank you for using Alpha Vantage!")) {
         console.error(error);
      }

      if (await redisClient.get("marketTrends") === null) {
         // Update cache with backup data in case of API failure for 15 minutes
         await redisClient.setex("marketTrends", 15 * 60, JSON.stringify(backup));
      }

      return sendServerResponse(200, "Market Trends", backup as MarketTrends);
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
         return sendServerResponse(200, "Financial News", JSON.parse(cache) as News);
      } else {
         // Handle cache miss
         const data = await fetchNews();

         // Cache the news result for 15 minutes
         await redisClient.setex("news", 15 * 60, JSON.stringify(data));

         return sendServerResponse(200, "Financial News", data as News);
      }
   } catch (error: any) {
      // Use backup XML news file
      console.error(error);

      const backup = (await parseStringPromise(await fs.readFile("resources/news.xml", "utf8")))?.rss as News;

      if (await redisClient.get("news") === null) {
         // Update cache with backup news in case of API failure for 5 minutes
         await redisClient.setex("news", 5 * 60, JSON.stringify(backup));
      }

      return sendServerResponse(200, "Financial News", backup);
   }
}

export async function fetchDashboard(user_id: string): Promise<ServerResponse> {
   try {
      const [marketTrends, financialNews, accounts] = await Promise.all([
         fetchMarketTrends(),
         fetchFinancialNews(),
         fetchAccounts(user_id)
      ]);

      return sendServerResponse(200, "Dashboard", {
         marketTrends: marketTrends.data,
         financialNews: financialNews.data,
         accounts: accounts.data
      });
   } catch (error: any) {
      console.error(error);

      return sendServerResponse(500, "Internal Server Error", undefined, { System: error.message });
   }
}