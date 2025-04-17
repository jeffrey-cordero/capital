import { type Economy } from "capital/economy";
import { PoolClient } from "pg";

import { query, transaction } from "@/lib/database";

/**
 * Fetches the latest external economy data from the database.
 *
 * @returns {Promise<{ time: string, data: Economy } | null>} The latest external economy data
 */
export async function getExternalAPIs(): Promise<{ time: string, data: Economy } | null> {
   // Retrieve the latest external economy data
   const search = `
      SELECT *
      FROM external_api_cache
      LIMIT 1;
   `;
   const result: { time: string, data: Economy }[] = await query(search, []);

   return result.length > 0 ? result[0] : null;
}

/**
 * Clears the existing external API data and inserts new external API data.
 *
 * @param {Date} time - The time of the external API data
 * @param {string} data - The external API data
 */
export async function updateExternalAPIs(time: Date, data: string): Promise<void> {
   // Update the external API data content in the database through a transaction
   return await transaction(async(client: PoolClient) => {
      // Clear existing cache data first
      const removal = `
         DELETE FROM external_api_cache;
      `;
      await client.query(removal);

      // Insert new external API data
      const insertion = `
         INSERT INTO external_api_cache (time, data)
         VALUES ($1, $2);
      `;
      await client.query(insertion, [time, data]);
   }) as void;
}