const fs = require("fs").promises;

import { Mutex } from "async-mutex";
import { IndicatorTrend, MarketTrends, StockTrends } from "capital/marketTrends";
import { News } from "capital/news";
import { ServerResponse } from "capital/server";
import { parseStringPromise } from "xml2js";

import { logger } from "@/lib/logger";
import { getCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse } from "@/lib/services";
import { getMarketTrends, updateMarketTrends } from "@/repository/dashboardRepository";
import { fetchAccounts } from "@/service/accountsService";

// Mutual exclusion to ensure at most one invocation of the external API
const mutex = new Mutex();

async function fetchStocks(): Promise<StockTrends[]> {
   // Retrieve stock trends (Top Gainers, Losers, Most Active)
   const response =  await fetch(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${process.env.XRapidAPIKey}`, {
         method: "GET"
      }
   ).then(response => response.json());

   if (!response["metadata"]) {
      throw new Error(response["Information"] || "Failed to fetch stock API data");
   } else {
      return response;
   }
}

async function fetchIndicators(indicator: string): Promise<IndicatorTrend[]> {
   // Retrieve economic indicators (GDP, Inflation, Unemployment, Treasury Yield, Federal Interest)
   const response = await fetch(
      `https://www.alphavantage.co/query?function=${indicator}&interval=quarterly&apikey=${process.env.XRapidAPIKey}`, {
         method: "GET"
      }
   ).then(response => response.json());

   if (!response["data"]) {
      throw new Error(response["Information"] || "Failed to fetch indicator API data");
   } else {
      return response["data"];
   }
}

export async function fetchMarketTrends(): Promise<ServerResponse> {
   const cache = await getCacheValue("marketTrends");

   try {
      if (cache) {
         return sendServiceResponse(200, "Market Trends", JSON.parse(cache) as MarketTrends);
      } else {
         // Fetch from the database, where if the data is stale, update the content using the external API
         const stored: { time: string, data: MarketTrends } | null = await getMarketTrends();
         const isStale: boolean = !stored || new Date(stored.time) < new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

         if (isStale) {
            // Acquire the mutex
            await mutex.acquire();

            // Check if any valid updates have been made since being potentially blocked
            const updates: { time: string; data: MarketTrends; } | null = await getMarketTrends();

            if (updates) {
               // API processing has already been handled by another request handler
               return sendServiceResponse(200, "Market Trends",
                  JSON.stringify(updates.data as MarketTrends)
               );
            } else {
               // Fetch the API data
               const marketTrends: MarketTrends = {};

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

               // Store in the data in the database, local backup file, and cache
               const time = new Date();
               const data = JSON.stringify(marketTrends);

               await updateMarketTrends(time, data);
               await fs.writeFile("resources/marketTrends.json", JSON.stringify(marketTrends, null, 3));
               setCacheValue("marketTrends", 24 * 60 * 60, data);

               return sendServiceResponse(200, "Market Trends", marketTrends as MarketTrends);
            }
         } else {
            // Return the existing non-stale database content
            return sendServiceResponse(200, "Market Trends", stored?.data as MarketTrends);
         }
      }
   } catch (error: any) {
      // Use the backup JSON market trends file
      logger.error(error.stack);

      return sendServiceResponse(200, "Market Trends",
         JSON.parse(await fs.readFile("resources/marketTrends.json", "utf8")) as MarketTrends
      );
   } finally {
      // Release the mutex for further invocations
      mutex.release();
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
      const cache = await getCacheValue("news");

      if (cache) {
         return sendServiceResponse(200, "Financial News", JSON.parse(cache) as News);
      } else {
         const data = await fetchNews();
         setCacheValue("news", 15 * 60, JSON.stringify(data));

         return sendServiceResponse(200, "Financial News", data as News);
      }
   } catch (error: any) {
      // Use the backup XML news file
      logger.error(error.stack);

      return sendServiceResponse(200, "Financial News",
         (await parseStringPromise(await fs.readFile("resources/news.xml", "utf8")))?.rss as News
      );
   }
}

export async function fetchDashboard(user_id: string): Promise<ServerResponse> {
   const [marketTrends, financialNews, accounts] = await Promise.all([
      fetchMarketTrends(),
      fetchFinancialNews(),
      fetchAccounts(user_id)
   ]);

   return sendServiceResponse(200, "Dashboard", {
      accounts: accounts.data,
      marketTrends: marketTrends.data,
      financialNews: financialNews.data
   });
}