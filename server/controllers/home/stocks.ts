import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendErrors, sendSuccess } from "@/controllers/api/response";
import { Stocks } from "@/models/stocks";
import { redisClient } from "@/app";

const stocks = asyncHandler(async (req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("stocks");

      if (cache) {
         const stocks = JSON.parse(cache);

         return sendSuccess(res, 200, "Stocks", { stocks: new Stocks(stocks.time, stocks.data) });
      } else {
         return sendSuccess(res, 200, "Stocks", { stocks: await Stocks.fetchStocks() });
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export default stocks;

