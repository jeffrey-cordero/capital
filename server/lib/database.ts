import { config } from "dotenv";
config();

import { Pool, PoolClient } from "pg";

import { logger } from "@/lib/logger";

/**
 * Connection pool for database connections
 */
const pool = new Pool({
   host: process.env.DB_HOST || "postgres",
   user: process.env.DB_USER,
   password: process.env.DB_PASSWORD,
   database: process.env.DB_NAME,
   port: Number(process.env.DB_PORT) || 5432,
   max: 50,
   ssl: process.env.DB_HOST !== "postgres" ? { rejectUnauthorized: false } : false
});

/**
 * Error handler for database errors caught at runtime to prevent application crashes
 */
pool.on("error", (error: Error) => {
   logger.error(`pool.on("error"): ${error.message}\n\n${error.stack}`);
});

/**
 * Starting index for updating query parameters
 */
export const FIRST_PARAM = 1;

/**
 * Executes a SQL query using the database pool
 *
 * @param {string} query - SQL query string with placeholders
 * @param {any[]} parameters - Values for the query placeholders
 * @returns {Promise<any[]>} Array of result rows
 */
export async function query(query: string, parameters: any[]): Promise<any[]> {
   return (await pool.query(query, parameters)).rows;
}

/**
 * Executes multiple database operations within a transaction and automatically handles
 * `BEGIN`, `COMMIT`, and `ROLLBACK` statements for non-external database clients to avoid nested transactions.
 *
 * @param {(client: PoolClient) => Promise<T>} operations - Function containing database operations
 * @param {string} [isolationLevel] - Transaction isolation level
 * @param {PoolClient | null} [externalClient] - Optional client for ongoing transactions to avoid nested transactions
 * @returns {Promise<T>} Result of the transaction
 * @throws {Error} If transaction fails
 */
export async function transaction<T>(
   operations: (client: PoolClient) => Promise<T>,
   isolationLevel: "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE" = "READ COMMITTED",
   externalClient: PoolClient | null = null
): Promise<T> {
   let client: PoolClient | null = null;

   try {
      if (externalClient) {
         // Use provided client for ongoing transactions to just run a series of statements
         client = externalClient;
      } else {
         // Start a new internal transaction with specified isolation
         client = await pool.connect();
         await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel};`);
      }

      // Execute the series of database operations
      const result = await operations(client);

      // Commit changes
      if (!externalClient) await client.query("COMMIT;");

      return result;
   } catch (error: any) {
      // Rollback on error
      if (!externalClient) await client?.query("ROLLBACK;");
      throw error;
   } finally {
      // Return client to pool
      if (!externalClient) client?.release();
   }
}