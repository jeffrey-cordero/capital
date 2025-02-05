const fs = require("fs").promises;
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendErrors, sendSuccess } from "@/lib/api/response";
import { redisClient } from "@/app";
import { parseStringPromise } from 'xml2js';

import { type Feed } from "capital-types/news";
import { Finances } from "capital-types/finances";
import { fetchFinances } from "@/repository/financesRepository";

async function parseXML(xml: string): Promise<Object> {
   try {
      return (await parseStringPromise(xml))?.rss;
   } catch (error) {
      throw error;
   }
}

export const FINANCES = asyncHandler(async (_req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("finances");

      if (cache) {
         const result = JSON.parse(cache);

         return sendSuccess(res, 200, "Finances", { finances: result as Finances });
      } else {
         const result = await fetchFinances();
         redisClient.set("finances", JSON.stringify(result));

         return sendSuccess(res, 200, "Finances", { finances: result });
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export const NEWS = asyncHandler(async (_req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("news");
      
      if (cache) {
         return sendSuccess(res, 200, "Financial News", { news: JSON.parse(cache) as Feed });
      }

      const response = await fetch("https://feeds.content.dowjones.io/public/rss/mw_topstories").then(async (response) => await response.text());
      const data = await parseXML(response);
      
      // Cache the results for 15 minutes
      await redisClient.setex("news", 15 * 60, JSON.stringify(data));

      return sendSuccess(res, 200, "Latest Financial News", { news: data as Feed });
   } catch (error: any) {
      // Use backup XML news file, but don't cache the results
      console.error(error);
         
      const xmlBackup = await fs.readFile("resources/news.xml", "utf8");
      const data = await parseXML(xmlBackup);

      return sendSuccess(res, 200, "Backup Financial News", { news: data as Feed });
   }
});