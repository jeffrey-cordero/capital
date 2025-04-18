import { type Economy } from "capital/economy";
import { PoolClient } from "pg";

import { query, transaction } from "@/lib/database";

/**
 * Fetches the latest economic data from the database.
 *
 * @returns {Promise<{ time: string, data: Economy } | null>} The latest economic data
 */
export async function getEconomicData(): Promise<{ time: string, data: Economy } | null> {
   const search = `
      SELECT *
      FROM economy
      LIMIT 1;
   `;
   const result = await query(search, []);

   return result.length > 0 ? result[0] : null;
}

/**
 * Clears the existing economic data and inserts new economic data.
 *
 * @param {Date} time - The time of the economic data
 * @param {string} data - The economic data
 */
export async function updateEconomicData(time: Date, data: string): Promise<void> {
   return await transaction(async(client: PoolClient) => {
      // Clear existing cache data first
      const removal = `
         DELETE FROM economy;
      `;
      await client.query(removal);

      // Insert new external API data
      const insertion = `
         INSERT INTO economy (time, data)
         VALUES ($1, $2);
      `;
      await client.query(insertion, [time, data]);
   }) as void;
}