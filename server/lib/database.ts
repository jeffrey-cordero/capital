require("dotenv").config();

import { Pool, PoolClient } from "pg";

// Connection pool for database connections
const pool = new Pool({
   host: process.env.DB_HOST || "postgres",
   user: process.env.USER,
   password: process.env.PASSWORD,
   database: "capital",
   port: Number(process.env.DB_PORT) || 5432,
   max: 50
});

export async function query(query: string, parameters: any[]): Promise<any[]> {
   // Submit the query and return the resulting rows
   return (await pool.query(query, parameters)).rows;
}

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