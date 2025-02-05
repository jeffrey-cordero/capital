const fs = require("fs").promises;
import { runQuery, runTransaction } from "@/lib/database/query";
import { redisClient } from "@/app";
import { Finances } from "capital-types/finances";
import { ServiceResponse } from "@/lib/api/response";

export async function fetchFinances(): Promise<Finances | null> {
   const search = "SELECT * FROM finances;";
   const result = await runQuery(search, []) as { data: string }[];

   if (result.length === 0) {
      return null;
   } else {
      return JSON.parse(result[0]?.data) as Finances;
   }
}

async function insertFinances(time: Date, data: string): Promise<ServiceResponse> {
   try {
      // Transaction to update the finance data
      await runTransaction([
         {
            query: "DELETE FROM finances;",
            parameters: [],
         },
         {
            query: "INSERT INTO finances (time, data) VALUES (?, ?);",
            parameters: [time, data],
         },
      ]);

      return {
         code: 200,
         message: "Successfully inserted financial data",
         data: null,
      };
   } catch (error) {
      console.error(error);

      return {
         code: 500,
         message: "Failed to insert financial data",
         errors: { system: "Internal server error" },
      };
   }
}

export async function updateFinances(): Promise<ServiceResponse> {
   const indicators = [
      "REAL_GDP",
      "TREASURY_YIELD",
      "FEDERAL_FUNDS_RATE",
      "INFLATION",
      "UNEMPLOYMENT",
   ];

   let finances: Record<string, any> = {};

   try {
      for (const indicator of indicators) {
         const response = await fetch(
            `https://www.alphavantage.co/query?function=${indicator}&interval=quarterly&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
            { method: "GET" }
         ).then(async (response) => await response.json());

         if (!response["data"]) {
            throw new Error(`Invalid API format for ${indicator}`);
         } else {
            finances[indicator] = response["data"];
         }
      }
   } catch (error) {
      // Use backup data if API request fails
      console.error(error);

      return {
         code: 200,
         message: "Backup financial data retrieved",
         data: JSON.parse(await fs.readFile("resources/finances.json", "utf8")),
      }
   }

   const time = new Date();
   const data = JSON.stringify(finances);

   try {
      // Store in the database
      await insertFinances(time, data);

      // Store in the Redis cache for 24 hours
      await redisClient.setex("finances", 24 * 60 * 60, data);

      return {
         code: 200,
         message: "Successfully updated financial data",
         data: finances,
      };
   } catch (error) {
      console.error(error);

      return {
         code: 500,
         message: "Failed to update financial data",
         errors: { system: "Internal server error" },
      };
   }
}