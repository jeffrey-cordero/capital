const fs = require("fs").promises;
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendErrors, sendSuccess } from "@/lib/api/response";
import { StocksModel } from "@/models/stocksModel";
import { redisClient } from "@/app";
import { Stocks } from "capital-types/stocks";
import { parseStringPromise } from 'xml2js';

import { type Feed } from "capital-types/news";

async function parseXML(xml: string): Promise<Object> {
   try {
      return (await parseStringPromise(xml))?.rss;
   } catch (error) {
      throw error;
   }
}

export const fetchStocks = asyncHandler(async (req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("stocks");

      if (cache) {
         const result = JSON.parse(cache);

         return sendSuccess(res, 200, "Stocks", { stocks: result as Stocks });
      } else {
         const result = await StocksModel.fetchStocks() as Stocks;
         redisClient.set("stocks", JSON.stringify(result));

         return sendSuccess(res, 200, "Stocks", { stocks: result });
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export const fetchNews = asyncHandler(async (req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("news");
      
      if (cache) {
         return sendSuccess(res, 200, "Financial News", { news: JSON.parse(cache) as Feed });
      }

      const response = await fetch("https://feeds.content.dowjones.io/public/rss/mw_topstories");
      const data = await parseXML(await response.text());
      
      // Cache the results for 15 minutes
      await redisClient.setex("news", 15 * 60, JSON.stringify(data));

      return sendSuccess(res, 200, "Latest Financial News", { news: data });
   } catch (error: any) {
      // Use backup XML news file, but don't cache the results
      console.error(error);
         
      const xmlBackup = await fs.readFile("resources/home/news.xml", "utf8");
      const data = await parseXML(xmlBackup);

      return sendSuccess(res, 200, "Backup Financial News", { news: data as Feed });
   }
});