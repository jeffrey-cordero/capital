require("dotenv").config();
import { Pool, PoolClient } from "pg";

// Connection pool for database scalability
export const pool = new Pool({
   host: process.env.HOST,
   user: process.env.USER,
   password: process.env.PASSWORD,
   database: "capital",
   port: Number(process.env.DB_PORT) || 5432,
   max: 50,
   idleTimeoutMillis: 60000
});

// Single query execution
export async function query(query: string, parameters: any[]): Promise<unknown> {
   try {
      const result = await pool.query(query, parameters);

      return result.rows;
   } catch (error) {
      console.error(error);
      throw error;
   }
}

// Run multiple queries in a transaction
export async function runTransaction(queries: { query: string, parameters: any[] }[]): Promise<unknown> {
   let client: PoolClient | null = null;

   try {
      // Fetch a client from the pool
      client = await pool.connect();

      // Start the transaction
      await client.query("BEGIN");

      // Execute all queries within the transaction
      const results = [];
      for (const { query, parameters } of queries) {
         const result = await client.query(query, parameters);

         console.log(result.rows);
         results.push(result.rows);
      }

      // Commit the transaction if successful
      await client.query("COMMIT");

      return results;
   } catch (error) {
      // Rollback on error
      console.error(error);
      await client?.query("ROLLBACK");

      throw error;
   } finally {
      client?.release();
   }
}