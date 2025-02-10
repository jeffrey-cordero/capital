require("dotenv").config();
import cryptoJS from "crypto-js";
import mysql from "mysql2";
import util from "util";
import { Pool } from "mysql2/typings/mysql/lib/Pool";
import { PoolConnection } from "mysql2/typings/mysql/lib/PoolConnection";

// Connection pool for database scalability
const pool: Pool = mysql.createPool({
   host: process.env.HOST,
   user: process.env.USER,
   password: process.env.PASSWORD,
   database: "capital",
   queueLimit: 0,
   multipleStatements: false,
   connectionLimit: 50,
   waitForConnections: true,
   connectTimeout: 60 * 1000
});

// Single query execution
const asyncQuery = util.promisify(pool.query).bind(pool);

// Full control over pool connection
const getConnection = util.promisify(pool.getConnection).bind(pool);

export async function runQuery(query: string, parameters: any[]): Promise<unknown> {
   try {
      return await asyncQuery({ sql: query, values: parameters });
   } catch (error) {
      console.error(error);

      throw error;
   }
}

export async function runTransaction(queries: { query: string, parameters: any[] }[]): Promise<unknown> {
   let connection: PoolConnection | null = null;

   try {
      // Fetch a connection from the pool
      connection = await getConnection();

      // Promisify connection methods
      const asyncQuery = util.promisify(connection.query).bind(connection);
      const asyncCommit = util.promisify(connection.commit).bind(connection);
      const asyncBeginTransaction = util.promisify(connection.beginTransaction).bind(connection);

      // Start the transaction
      await asyncBeginTransaction();

      // Execute all queries within the transaction
      const results = [];

      for (const { query, parameters } of queries) {
         results.push(await asyncQuery({
            sql: query, values: parameters
         }));
      }

      // Commit the transaction for successful queries
      await asyncCommit();

      return results;
   } catch (error) {
      // Rollback the transaction for failed queries
      console.error(error);
      connection?.rollback(() => {});

      throw error;
   } finally {
      connection?.release();
   }
}

export function hash(value: string): string {
   // Hashing method via crypto-js using SHA-256
   return cryptoJS.SHA256(value).toString(cryptoJS.enc.Hex);
}