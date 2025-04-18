require("dotenv").config();

import { Pool, PoolClient } from "pg";

/**
 * Connection pool for database connections
 */
const pool = new Pool({
   host: process.env.DB_HOST || "localhost",
   user: process.env.DB_USER,
   password: process.env.DB_PASSWORD,
   database: process.env.DB_NAME,
   port: Number(process.env.DB_PORT) || 5433,
   max: 50
});

/**
 * Constant for query parameter indexing
 */
export const FIRST_PARAM = 1;

/**
 * Executes a query on the database pool
 *
 * @param {string} query - The prepared SQL query to execute
 * @param {any[]} parameters - Array of parameters for the query
 * @returns {Promise<any[]>} Resulting rows from the query
 */
export async function query(query: string, parameters: any[]): Promise<any[]> {
   return (await pool.query(query, parameters)).rows;
}

/**
 * Wraps multiple database operations in a transaction with automatic
 * `BEGIN`, `COMMIT`, and `ROLLBACK` statements.
 *
 * @param {() => Promise<any>} statements - Async function containing database operations.
 * @param {string} [isolationLevel] - The isolation level for the transaction.
 * @returns {Promise<any>} The result of the transaction statements.
 * @throws {Error} If the transaction fails or is rolled back.
 */
export async function transaction(
   statements: (client: PoolClient) => Promise<any>,
   isolationLevel: "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE" = "READ COMMITTED"
): Promise<unknown> {
   let client: PoolClient | null = null;

   try {
      // Fetch a client from the database pool
      client = await pool.connect();

      // Begin the transaction with the given isolation level
      await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel};`);

      // Run a series of SQL statements and the return the potential result
      const result = await statements(client) as unknown;

      // Commit the transaction
      await client.query("COMMIT;");

      // Return the potential results of the transaction
      return result;
   } catch (error: any) {
      // Rollback any changes made to the database
      await client?.query("ROLLBACK;");

      throw error;
   } finally {
      // Release the client back to the database pool
      client?.release();
   }
}