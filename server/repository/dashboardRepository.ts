import { MarketTrends } from "capital/marketTrends";
import { PoolClient } from "pg";

import { query, transaction } from "@/lib/database";

export async function getMarketTrends(): Promise<{ time: string, data: MarketTrends } | null> {
   // Retrieve the latest market trends
   const search = `
      SELECT * 
      FROM market_trends_api_cache
      LIMIT 1;
   `;
   const result: { time: string, data: MarketTrends }[] = await query(search, []);

   return result.length > 0 ? result[0] : null;
}

export async function updateMarketTrends(time: Date, data: string): Promise<void> {
   // Update the market trends content in the database through a transaction
   return await transaction(async(client: PoolClient) => {
      const removal = `
         DELETE FROM market_trends_api_cache;
      `;
      await client.query(removal);

      const insertion = `
         INSERT INTO market_trends_api_cache (time, data) 
         VALUES ($1, $2);
      `;
      await client.query(insertion, [time, data]);
   }) as void;
}