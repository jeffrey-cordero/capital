require("dotenv").config();

import { Pool, PoolClient } from "pg";

/**
 * Connection pool for database connections
 *
 * @description
 * - Creates a connection pool for the database
 * - Uses the environment variables for the database configuration (DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, DB_NAME)
 */
const pool = new Pool({
   host: process.env.DB_HOST || "postgres",
   user: process.env.DB_USER,
   password: process.env.DB_PASSWORD,
   database: process.env.DB_NAME,
   port: Number(process.env.DB_PORT) || 5432,
   max: 50
});

/**
 * Constant for query parameter indexing
 */
export const FIRST_PARAM = 1;

/**
 * Executes a query on the database pool
 *
 * @param {string} query - The SQL query to execute
 * @param {any[]} parameters - Array of parameters for the query
 * @returns {Promise<any[]>} Resulting rows from the query
 */
export async function query(query: string, parameters: any[]): Promise<any[]> {
   // Submit the query and return the resulting rows
   return (await pool.query(query, parameters)).rows;
}

/**
 * Wraps multiple database operations in a transaction
 *
 * @param {Function} statements - Async function containing database operations
 * @param {string} isolationLevel - The isolation level for the transaction
 * @returns {Promise<any>} Result of the transaction statements
 * @throws {Error} If transaction fails or is rolled back
 * @description
 * - Automatically handles BEGIN, COMMIT, and ROLLBACK statements
 * - Provides the client to the statements for executing queries
 * - Ensures proper resource cleanup after transaction completion
 */
export async function transaction(
   statements: (client: PoolClient) => Promise<any>,
   isolationLevel: "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE" = "READ COMMITTED"
): Promise<unknown> {
   let client: PoolClient | null = null;

   try {
      // Connect to the database pool
      client = await pool.connect();

      // Begin the transaction with the proper isolation level
      await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel};`);

      // Run a series of statements,
      const result = await statements(client) as unknown;

      // Commit the transaction
      await client.query("COMMIT;");

      // Return the potential results of the transaction
      return result;
   } catch (error: any) {
      // Rollback any change
      await client?.query("ROLLBACK;");

      throw error;
   } finally {
      // Release from the database pool
      client?.release();
   }
}