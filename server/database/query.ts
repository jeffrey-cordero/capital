require("dotenv").config();
import mysql from "mysql2";
import util from "util";
import cryptoJS from "crypto-js";

export async function runQuery(query: string, parameters: any[]): Promise<unknown> {
   // Initialize connection to database and submit query for potential results
   const connection = mysql.createConnection({
      host: process.env.HOST,
      user: process.env.USER,
      password: process.env.PASSWORD,
      database: "capital"
   });

   const asyncQuery = util.promisify(connection.query).bind(connection);

   try {
      return await asyncQuery({ sql: query, values: parameters });
   } catch (error) {
      console.error(error);
      throw error;
   } finally {
      connection.end();
   }
};

export function hash(value: string): string {
   // Simple hashing method via crypto-js
   return cryptoJS.SHA256(value).toString(cryptoJS.enc.Hex);
};