import { type Economy } from "capital/economy";
import { PoolClient } from "pg";

import { query, transaction } from "@/lib/database";

/**
 * Fetches latest economic data
 *
 * @returns {Promise<{ time: string, data: Economy } | null>} Economic data or null if not found
 */
export async function getEconomicData(): Promise<{ time: string, data: Economy } | null> {
   // Fetch the latest economic data, where an empty table can imply initial application setup
   const search = `
      SELECT *
      FROM economy
      LIMIT 1;
   `;
   const result = await query(search, []);

   return result.length > 0 ? result[0] : null;
}

/**
 * Updates economic data
 *
 * @param {Date} time - Timestamp of data update
 * @param {string} data - Economic data in JSON format
 */
export async function updateEconomicData(time: Date, data: string): Promise<void> {
   return await transaction(async(client: PoolClient) => {
      // Clear existing economic data
      const removal = `
         DELETE FROM economy;
      `;
      await client.query(removal);

      // Insert new API economic data
      const insertion = `
         INSERT INTO economy (time, data)
         VALUES ($1, $2);
      `;
      await client.query(insertion, [time, data]);
   }) as void;
}