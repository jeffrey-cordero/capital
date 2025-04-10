/**
 * Represents news data for the dashboard page
 */

import { z } from "zod";

/**
 * Represents the schema for the news data
 */
export const newsSchema = z.object({
   response: z.object({
      next_initial: z.string(),
      restResults: z.coerce.number(),
      next_country: z.string(),
      totalResults: z.coerce.number(),
      next_final: z.string(),
      next_category: z.string(),
      data: z.array(z.object({
         id: z.string(),
         site_region: z.string(),
         site_language: z.string(),
         author: z.string(),
         domain: z.string(),
         crawled: z.coerce.number(),
         language: z.string(),
         title: z.string(),
         site_type: z.string(),
         text: z.string(),
         url: z.string(),
         site: z.string(),
         site_country: z.string(),
         published: z.string(),
      })).min(50),
      next_query: z.string()
   })
});

/**
 * Represents the type for the news data
 */
export type News = z.infer<typeof newsSchema>;

/**
 * Represents the type for the news article data
 */
export type NewsArticle = News["response"]["data"][0];