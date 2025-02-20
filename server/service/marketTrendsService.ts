const fs = require("fs").promises;
import { IndicatorTrend, MarketTrends, StockTrends } from "capital-types/marketTrends";

import { redisClient } from "@/app";
import { ServiceResponse } from "@/lib/api/response";
import { getMarketTrends, updateMarketTrends } from "@/repository/marketTrendsRepository";

async function fetchStocks(): Promise<StockTrends[]> {
   // Retrieve stock trends from the API (Top Gainers, Losers, and Most Active)
   const response =  await fetch(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${process.env.XRapidAPIKey}`, {
         method: "GET"
      }
   ).then(response => response.json());

   if (!response["metadata"]) {
      // Rate limit exceeded or invalid API key
      throw new Error(response["Information"] ?? "Failed to fetch stock trends");
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
      throw new Error(response["Information"] ?? `Failed to fetch indicator trends for ${indicator}`);
   } else {
      return response["data"];
   }
}

export async function fetchMarketTrends(): Promise<ServiceResponse> {
   // Fetch market trends from the cache, database, or worst-case scenario, the API to update the cache
   const cache = await redisClient.get("marketTrends");

   try {
      if (cache) {
         return {
            code: 200,
            message: "Cached market trends data",
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

            await updateMarketTrends(time, data);
            await redisClient.setex("marketTrends", 24 * 60 * 60, data);
            await fs.writeFile("resources/marketTrends.json", JSON.stringify(marketTrends, null, 3));

            return {
               code: 200,
               message: "Successfully updated market trends API cache",
               data: marketTrends
            };

         } else {
            // Return existing database cache
            return {
               code: 200,
               message: "Stored market trends data",
               data: stored[0]?.data as MarketTrends
            };
         }
      }
   } catch (error) {
      console.error(error);

      return {
         code: 500,
         message: "Failed to update market trends API cache",
         errors: { system: "Internal Server Error" }
      };
   }
}