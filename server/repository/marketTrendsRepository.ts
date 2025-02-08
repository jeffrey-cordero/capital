const fs = require("fs").promises;
import { IndicatorTrends, MarketTrends, StockTrends } from "capital-types/marketTrends";

import { redisClient } from "@/app";
import { ServiceResponse } from "@/lib/api/response";
import { runQuery, runTransaction } from "@/lib/database/client";

export async function fetchMarketTrends(): Promise<MarketTrends> {
   try {
      // Handle Redis cache hit or miss
      const cache = await redisClient.get("marketTrends");

      if (cache) {
         return JSON.parse(cache) as MarketTrends;
      } else {
         const search = "SELECT * FROM market_trends_api_cache;";
         const result = await runQuery(search, []) as { time: string, data: MarketTrends }[];

         if (result.length === 0 || new Date(result[0].time) < new Date(new Date().getTime() - 24 * 60 * 60 * 1000)) {
            // Handle missing or expired database cache
            return (await updateMarketTrends()).data as MarketTrends;
         } else {
            // Return existing database cache
            return result[0]?.data as MarketTrends;
         }
      }
   } catch (error) {
      console.error(error);

      return JSON.parse(await fs.readFile("resources/marketTrends.json", "utf8")) as MarketTrends;
   }
}

async function insertMarketTrends(time: Date, data: string): Promise<ServiceResponse> {
   try {
      // Transaction to update the market trends API cache
      await runTransaction([
         {
            query: "DELETE FROM market_trends_api_cache;",
            parameters: []
         },
         {
            query: "INSERT INTO market_trends_api_cache (time, data) VALUES (?, ?);",
            parameters: [time, data]
         }
      ]);

      return {
         code: 200,
         message: "Successfully updated market trends API cache",
         data: null
      };
   } catch (error) {
      console.error(error);

      return {
         code: 500,
         message: "Failed to update market trends API cache",
         errors: { system: "Internal server error" }
      };
   }
}

async function fetchStockTrends(): Promise<StockTrends[]> {
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

async function fetchIndicatorTrends(indicator: string): Promise<IndicatorTrends[]> {
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

async function updateMarketTrends(): Promise<ServiceResponse> {
   let marketTrends: MarketTrends = {};

   console.log(process.env.XRapidAPIKey)

   try {
      const trends = await Promise.all([
         fetchStockTrends(),
         fetchIndicatorTrends("REAL_GDP"),
         fetchIndicatorTrends("INFLATION"),
         fetchIndicatorTrends("UNEMPLOYMENT"),
         fetchIndicatorTrends("TREASURY_YIELD"),
         fetchIndicatorTrends("FEDERAL_FUNDS_RATE"),
      ]);

      marketTrends["Stocks"] = trends[0];
      marketTrends["GDP"] = trends[1];
      marketTrends["Inflation"] = trends[2];
      marketTrends["Unemployment"] = trends[3];
      marketTrends["Treasury Yield"] = trends[4];
      marketTrends["Federal Interest Rate"] = trends[5];
   } catch (error) {
      console.error(error);
      marketTrends = JSON.parse(await fs.readFile("resources/marketTrends.json", "utf8"));
   }
      
   console.log(marketTrends)

   const time = new Date();
   const data = JSON.stringify(marketTrends);

   try {
      // Store in the database
      await insertMarketTrends(time, data);

      // Store in the Redis cache for 24 hours
      await redisClient.setex("marketTrends", 24 * 60 * 60, data);

      return {
         code: 200,
         message: "Successfully updated market trends API cache",
         data: marketTrends
      };
   } catch (error) {
      console.error(error);

      return {
         code: 500,
         message: "Failed to update market trends API cache",
         errors: { system: "Internal server error" }
      };
   }
}