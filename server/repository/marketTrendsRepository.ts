import { MarketTrends } from "capital-types/marketTrends";
import { PoolClient } from "pg";

import { pool, query } from "@/lib/database/client";

export async function getMarketTrends(): Promise<{ time: string, data: MarketTrends }[]> {
   const search = `
      SELECT * 
      FROM market_trends_api_cache;
   `;

   return await query(search, []) as { time: string, data: MarketTrends }[];
}

export async function updateMarketTrends(time: Date, data: string): Promise<void> {
   const client: PoolClient | null = await pool.connect();

   try {
      // Transactional insertion queries to update the cache
      await client.query("BEGIN");

      await client.query("DELETE FROM market_trends_api_cache;");
      await client.query("INSERT INTO market_trends_api_cache (time, data) VALUES ($1, $2);", [time, data]);

      await client.query("COMMIT");
   } catch (error) {
      // Handle transactional rollback on error
      console.error(error);

      await client?.query("ROLLBACK");
   } finally {
      client?.release();
   }
}