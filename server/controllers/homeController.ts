const fs = require("fs").promises;
import { MarketTrends } from "capital-types/marketTrends";
import { type News } from "capital-types/news";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { parseStringPromise } from "xml2js";

import { redisClient } from "@/app";
import { sendErrors, sendSuccess } from "@/lib/api/response";
import { fetchMarketTrends } from "@/repository/marketTrendsRepository";

async function parseXML(xml: string): Promise<object> {
   return (await parseStringPromise(xml))?.rss;
}

export const MARKET_TRENDS = asyncHandler(async(_req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("marketTrends");

      if (cache) {
         return sendSuccess(res, 200, "Market Trends", { marketTrends: JSON.parse(cache) as MarketTrends });
      } else {
         const result = await fetchMarketTrends();
         await redisClient.setex("marketTrends", 24 * 60 * 60, JSON.stringify(result));

         return sendSuccess(res, 200, "Market Trends", { marketTrends: result });
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export const NEWS = asyncHandler(async(_req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("news");

      if (cache) {
         return sendSuccess(res, 200, "Financial News", { news: JSON.parse(cache) as News });
      }

      const response = await fetch(
         "https://feeds.content.dowjones.io/public/rss/mw_topstories"
      ).then(async(response) => await response.text());
      const data = await parseXML(response);

      // Cache the news result for 15 minutes
      await redisClient.setex("news", 15 * 60, JSON.stringify(data));

      return sendSuccess(res, 200, "Financial News", { news: data as News });
   } catch (error: any) {
      // Use backup XML news file, but don't cache the results
      console.error(error);

      const xmlBackup = await fs.readFile("resources/news.xml", "utf8");
      const data = await parseXML(xmlBackup);

      return sendSuccess(res, 200, "Backup Financial News", { news: data as News });
   }
});