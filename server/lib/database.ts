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
   ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
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
 * `BEGIN`, `COMMIT`, and `ROLLBACK` statements.
 *
 * @param {(client: PoolClient) => Promise<any>} statements - Function containing database operations
 * @param {string} [isolationLevel] - Transaction isolation level
 * @returns {Promise<unknown>} Result of the transaction
 * @throws {Error} If transaction fails
 */
export async function transaction(
   statements: (client: PoolClient) => Promise<any>,
   isolationLevel: "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE" = "READ COMMITTED"
): Promise<unknown> {
   let client: PoolClient | null = null;

   try {
      // Get a client from the pool
      client = await pool.connect();

      // Start transaction with specified isolation
      await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel};`);

      // Execute the transaction statements
      const result = await statements(client) as unknown;

      // Commit changes
      await client.query("COMMIT;");

      return result;
   } catch (error: any) {
      // Rollback on error
      await client?.query("ROLLBACK;");

      throw error;
   } finally {
      // Return client to pool
      client?.release();
   }
}