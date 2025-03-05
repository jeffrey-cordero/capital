require("dotenv").config();
import { Pool, PoolClient } from "pg";

// Connection pool for database connections
const pool = new Pool({
   host: process.env.DB_HOST || "postgres",
   user: process.env.USER,
   password: process.env.PASSWORD,
   database: "capital",
   port: Number(process.env.DB_PORT) || 5432,
   max: 50,
   idleTimeoutMillis: 60000
});

export async function query(query: string, parameters: any[]): Promise<unknown> {
   // Submit the query and return the rows, if possible, otherwise throw the respective error
   try {
      const result = await pool.query(query, parameters);

      return result.rows;
   } catch (error: any) {
      throw error;
   }
}


export async function transaction(statements: (client: PoolClient) => Promise<unknown>, isolation = "READ COMMITTED"): Promise<unknown> {
   let client: PoolClient | null = null;

   try {
      // Connect to the database pool
      client = await pool.connect();

      // Begin the transaction
      await client.query("BEGIN");

      // Set the isolation level for the transaction
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolation}`);

      // Run a series of statements, 
      const result = await statements(client) as any;

      // Commit the transaction
      await client.query("COMMIT");

      // Return the potential results of the transaction
      return result;
   } catch (error: any) {
      // Rollback any change
      await client?.query("ROLLBACK");

      throw error;
   } finally {
      // Exit from the database pool
      client?.release();
   }
}
