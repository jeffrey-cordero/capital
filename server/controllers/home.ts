import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendErrors, sendSuccess } from "@/server/lib/api/response";
import { StocksModel } from "@/server/models/stocks";
import { redisClient } from "@/server/app";
import { StoriesModel } from "@/server/models/stories";
import { Stocks } from "@/types/stocks";

export const fetchStocks = asyncHandler(async (req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("stocks");

      if (cache) {
         const stocks = JSON.parse(cache);

         return sendSuccess(res, 200, "Stocks", { stocks: stocks.data as Stocks });
      } else {
         return sendSuccess(res, 200, "Stocks", { stocks: await StocksModel.fetchStocks() as Stocks });
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export const fetchStories = asyncHandler(async (req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("stories");

      if (cache) {
         return sendSuccess(res, 200, "Stories", { stories: JSON.parse(cache) });
      } else {
         return sendSuccess(res, 200, "Stories", { stories: await StoriesModel.fetchStories() });
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});