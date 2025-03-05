import { MarketTrends } from "capital/marketTrends";
import { PoolClient } from "pg";

import { query, transaction } from "@/lib/database";

export async function getMarketTrends(): Promise<{ time: string, data: MarketTrends }[]> {
   // Retrieve the latest market trends from the database api cache
   const search = `
      SELECT * 
      FROM market_trends_api_cache
      LIMIT 1;
   `;

   return await query(search, []) as { time: string, data: MarketTrends }[];
}

export async function updateMarketTrends(time: Date, data: string): Promise<void> {
   // Transactional insertion queries to update the database api cache
   return await transaction(async (client: PoolClient) => {
      await client.query("DELETE FROM market_trends_api_cache;");
      await client.query("INSERT INTO market_trends_api_cache (time, data) VALUES ($1, $2);", [time, data]);
   }) as void; 
}