const fs = require("fs").promises;
import { runQuery } from "@/database/query";
import { redisClient } from "@/app";

export class Stocks {
   time: Date;
   data: Object;

   constructor(time: Date, data: Object) {
      this.time = time;
      this.data = data;
   }

   static async fetchStocks(): Promise<Stocks | null> {
      // Assumes stocks are not cached
      const search = "SELECT * FROM stocks;";
      const result = await runQuery(search, []) as Stocks[];

      if (result.length === 0) {
         return null;
      } else {
         redisClient.set("stocks", JSON.stringify({ time: result[0].time, data: result[0].data }));

         return result[0];
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
      let stocks: { [key: string]: any } = {};
      const symbols = ["VT", "VTI", "SPY", "QQQ", "BITW"];
   
      for (const symbol of symbols) {
         try {
            const response = await fetch(`https://alpha-vantage.p.rapidapi.com/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&datatype=json`, {
               "method": "GET",
               "headers": {
                  "x-rapidapi-host": "alpha-vantage.p.rapidapi.com",
                  "x-rapidapi-key": process.env.XRapidAPIKey || ""
               }
            });

            const result = await response.json();
   
            if (!result["Meta Data"] ) {
               throw new Error("Invalid API format");
            } else {
               stocks[symbol]= result["Time Series (Daily)"];
            }
         }  catch (error) {
            // Use backup data if API request fails
            console.error(error);
            
            const jsonBackup = await fs.readFile("resources/home/stocks.json", "utf8");
            stocks = await JSON.parse(jsonBackup);

            break;
         }
      };

      const time = new Date();
      const data = JSON.stringify(stocks);

      // Store in the database
      await Stocks.insertStocks(time, data);
      
      // Store in the Redis cache
      await redisClient.set("stocks", JSON.stringify({ time: time, data: data }));
   }
}