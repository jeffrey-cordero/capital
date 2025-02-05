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
      // Execute the query and return the results
      return await asyncQuery({ sql: query, values: parameters });
   } catch (error) {
      console.error(error);
      throw error;
   } finally {
      connection.end();
   }
};

export async function runTransaction(queries: { query: string, parameters: any[] }[]): Promise<unknown> {
   // Initialize connection to database and submit queries for potential results
   const connection = mysql.createConnection({
      host: process.env.HOST,
      user: process.env.USER,
      password: process.env.PASSWORD,
      database: "capital"
   });

   const asyncQuery = util.promisify(connection.query).bind(connection);
   const asyncCommit = util.promisify(connection.commit).bind(connection);
   const asyncRollback = util.promisify(connection.rollback).bind(connection);
   const asyncBeginTransaction = util.promisify(connection.beginTransaction).bind(connection);

   try {
      // Start the transaction
      await asyncBeginTransaction();

      // Execute all queries within the transaction
      const results = [];

      for (const { query, parameters } of queries) {
         results.push(await asyncQuery({ sql: query, values: parameters }));
      }

      // Commit the transaction if all queries are successful
      await asyncCommit();

      // Return the results of all queries
      return results;
   } catch (error) {
      // Rollback the transaction in case of any error
      await asyncRollback();

      console.error("Transaction failed, rolled back:", error);
      throw error;
   } finally {
      connection.end();
   }
}

export function hash(value: string): string {
   // Simple hashing method via crypto-js
   return cryptoJS.SHA256(value).toString(cryptoJS.enc.Hex);
};