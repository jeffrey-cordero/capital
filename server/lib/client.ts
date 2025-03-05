require("dotenv").config();
import { Pool } from "pg";

// Connection pool for database connections
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