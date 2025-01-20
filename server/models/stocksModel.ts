const fs = require("fs").promises;
import { runQuery } from "@/lib/database/query";
import { redisClient } from "@/app";

import { Stocks } from "capital-types/stocks";

export class StocksModel {
   time: Date;
   data: Object;

   constructor(time: Date, data: Object) {
      this.time = time;
      this.data = data;
   }

   static async fetchStocks(): Promise<Stocks | null> {
      // Assumes stocks are not cached
      const search = "SELECT * FROM stocks;";
      const result = await runQuery(search, []) as StocksModel[];

      if (result.length === 0) {
         return null;
      } else {
         return result[0].data as Stocks;
      }
   }

   static async insertStocks(time: Date, data: Object): Promise<void> {
      try {
         // Start transaction
         await runQuery("START TRANSACTION;", []);

         // Delete existing stocks
         await runQuery("DELETE FROM stocks;", []);

         // Insert new stock data
         const insertQuery = "INSERT INTO stocks (time, data) VALUES (?, ?);";
         const parameters = [time, JSON.stringify(data)];
         await runQuery(insertQuery, parameters);

         // Commit the transaction
         await runQuery("COMMIT;", []);
       } catch (error) {
         // Rollback in case of an error
         try {
            // Attempt rollback if the transaction has started
            await runQuery("ROLLBACK;", []);
         } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError);
         }

         console.error("Transaction failed:", error);
      }
   }

   static async updateStocks(): Promise<void> {
      // API request to fetch stock data
      const symbols = ["VT", "VTI", "SPY", "QQQ", "BITW"];
      let stocks: Stocks = {};
   
      for (const symbol of symbols) {
         try {
            const response = await fetch(`https://alpha-vantage.p.rapidapi.com/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&datatype=json`, {
               "method": "GET",
               "headers": {
                  "x-rapidapi-host": "alpha-vantage.p.rapidapi.com",
                  "x-rapidapi-key": process.env.XRapidAPIKey || ""
               }
            }).then(async (response) => await response.json());

            if (!response["Meta Data"] ) {
               throw new Error("Invalid API format");
            } else {
               stocks[symbol]= response["Time Series (Daily)"];
            }
         }  catch (error) {
            // Use backup data if API request fails
            console.error(error);
            
            const jsonBackup = await fs.readFile("resources/stocks.json", "utf8");
            stocks = await JSON.parse(jsonBackup);

            break;
         }
      };

      const time = new Date();
      const data = JSON.stringify(stocks);

      // Store in the database
      await StocksModel.insertStocks(time, data);
      
      // Store in the Redis cache
      await redisClient.set("stocks", JSON.stringify(data));
   }
}