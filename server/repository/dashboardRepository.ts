import { MarketTrends } from "capital/markets";
import { PoolClient } from "pg";

import { query, transaction } from "@/lib/database";

/**
 * Fetches the latest market trends from the database.
 *
 * @returns {Promise<{ time: string, data: MarketTrends } | null>} The latest market trends
 */
export async function getMarketTrends(): Promise<{ time: string, data: MarketTrends } | null> {
   // Retrieve the latest market trends
   const search = `
      SELECT * 
      FROM market_trends_api_data
      LIMIT 1;
   `;
   const result: { time: string, data: MarketTrends }[] = await query(search, []);

   return result.length > 0 ? result[0] : null;
}

/**
 * Clears the existing market trends data and inserts new market trends data.
 *
 * @param {Date} time - The time of the market trends
 * @param {string} data - The market trends data
 */
export async function updateMarketTrends(time: Date, data: string): Promise<void> {
   // Update the market trends content in the database through a transaction
   return await transaction(async(client: PoolClient) => {
      // Clear existing cache data first
      const removal = `
         DELETE FROM market_trends_api_data;
      `;
      await client.query(removal);

      // Insert new market trends data
      const insertion = `
         INSERT INTO market_trends_api_data (time, data) 
         VALUES ($1, $2);
      `;
      await client.query(insertion, [time, data]);
   }) as void;
}