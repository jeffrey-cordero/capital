const fs = require("fs").promises;
import { MarketTrends } from "capital-types/marketTrends";

import { redisClient } from "@/app";
import { ServiceResponse } from "@/lib/api/response";
import { runQuery, runTransaction } from "@/lib/database/query";

export async function fetchMarketTrends(): Promise<MarketTrends | null> {
   const search = "SELECT * FROM market_trends_api_cache;";
   const result = await runQuery(search, []) as { time: string, data: MarketTrends }[];

   if (result.length === 0) {
      return null;
   } else {
      return result[0]?.data as MarketTrends;
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

export async function updateMarketTrends(): Promise<ServiceResponse> {
   const indicators = [
      "REAL_GDP",
      "TREASURY_YIELD",
      "FEDERAL_FUNDS_RATE",
      "INFLATION",
      "UNEMPLOYMENT"
   ];

   const marketTrends: Record<string, any> = {};

   try {
      for (const indicator of indicators) {
         const response = await fetch(
            `https://www.alphavantage.co/query?function=${indicator}&interval=quarterly&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
            { method: "GET" }
         ).then(async(response) => await response.json());

         if (!response["data"]) {
            throw new Error(`Invalid API format for ${indicator}`);
         } else {
            marketTrends[indicator] = response["data"];
         }
      }
   } catch (error) {
      // Use backup data if API request fails
      console.error(error);

      return {
         code: 200,
         message: "Backup market trends data retrieved",
         data: JSON.parse(await fs.readFile("resources/marketTrends.json", "utf8"))
      };
   }

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