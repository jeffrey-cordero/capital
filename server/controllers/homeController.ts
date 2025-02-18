const fs = require("fs").promises;
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
      return sendSuccess(res, 200, "Market Trends", {
         marketTrends: await fetchMarketTrends()
      });
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});

export const NEWS = asyncHandler(async(_req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("news");

      if (cache) {
         // Cache hit
         return sendSuccess(res, 200, "Financial News", {
            news: JSON.parse(cache) as News
         });
      } else {
         // Handle cache miss
         const response = await fetch(
            "https://feeds.content.dowjones.io/public/rss/mw_topstories"
         ).then(async(response) => await response.text());
         const data = await parseXML(response);

         // Cache the news result for 15 minutes
         await redisClient.setex("news", 15 * 60, JSON.stringify(data));

         return sendSuccess(res, 200, "Financial News", { news: data as News });
      }
   } catch (error: any) {
      // Use backup XML news file with no caching application
      console.error(error);

      return sendSuccess(res, 200, "Financial News", {
         news: await parseXML(await fs.readFile("resources/news.xml", "utf8")) as News
      });
   }
});