import { runQuery } from "@/database/query";
const fs = require("fs").promises;

export class Stocks {
   time: Date;
   data: Object;

   constructor(time: Date, data: Object) {
      this.time = time;
      this.data = data;
   }

   static async fetchStocks(): Promise<Stocks | null> {
      const search = "SELECT * FROM stocks;";
      const result = await runQuery(search, []) as Stocks[];

      if (result.length === 0) {
         return null;
      } else {
         return result[0];
      }
   }

   static async insertStocks(time: Date, data: Object): Promise<void> {
      try {
         // Start a transaction to ensure data consistency
         const startTransaction = "START TRANSACTION;";
         await runQuery(startTransaction, []);
       
         // Delete all existing stock data
         const deletion = "DELETE FROM stocks;";
         await runQuery(deletion, []);
       
         // Insert new stock data
         const insert = "INSERT INTO stocks (time, data) VALUES (?, ?);";
         const parameters = [time, JSON.stringify(data)];
         await runQuery(insert, parameters);
       
         // Commit the transaction
         const commitTransaction = "COMMIT;";
         await runQuery(commitTransaction, []);
       } catch (error) {
         // Rollback in case of an error
         const rollbackTransaction = "ROLLBACK;";
         await runQuery(rollbackTransaction, []);
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
            console.log(error);
            
            const jsonBackup = await fs.readFile("resources/home/stocks.json", "utf8");
            stocks = await JSON.parse(jsonBackup);
            return;
         }
      };

      await Stocks.insertStocks(new Date(), stocks);
   }
}