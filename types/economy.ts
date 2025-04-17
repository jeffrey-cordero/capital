import { z } from "zod";

/**
 * Robust schema for economic API response data validation, which
 * validates the response structure and content types for economic
 * news and market trends data.
 *
 * @see {@link News} - The type inferred from this schema.
 */
export const newsSchema = z.object({
   response: z.object({
      restResults: z.coerce.number(),
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
      })).min(25),
      totalResults: z.coerce.number()
   })
}).passthrough();

/**
 * Represents economic news API response data inferred from the schema
 *
 * @see {@link newsSchema} - The Zod schema defining this structure's validation rules.
 */
export type News = z.infer<typeof newsSchema>;

/**
 * Represents a single news article with metadata and content-related fields inferred from the schema
 *
 * @see {@link News} - The parent type this is extracted from.
 */
export type Article = News["response"]["data"][0];

/**
 * Robust schema for economic indicator time series data validation, which
 * validates the response structure and content types for economic indicator
 * time series data.
 *
 * @see {@link IndicatorTrends} - The type inferred from this schema.
 */
export const indicatorTrendsSchema = z.array(z.object({
   date: z.string().regex(/^\d{4,}-\d{2}-\d{2}$/),
   value: z.coerce.number()
}));

/**
 * Represents time series data for economic indicators (GDP, unemployment, etc.) inferred from the schema
 *
 * @see {@link indicatorTrendsSchema} - The Zod schema defining this structure's validation rules.
 */
export type IndicatorTrends = z.infer<typeof indicatorTrendsSchema>;

/**
 * Robust schema for individual stock market data points validation, which
 * validates the response structure and content types for individual stock
 * market data points.
 *
 * @see {@link StockIndicator} - The type inferred from this schema.
 */
export const stockIndicatorSchema = z.object({
   ticker: z.string(),
   price: z.coerce.number(),
   change_amount: z.coerce.number(),
   change_percentage: z.string(),
   volume: z.coerce.number()
});

/**
 * Represents a single stock data point with price and movement metrics inferred from the schema
 *
 * @see {@link stockIndicatorSchema} - The Zod schema defining this structure's validation rules.
 */
export type StockIndicator = z.infer<typeof stockIndicatorSchema>;

/**
 * Robust schema for aggregated stock market trends validation, which
 * validates the response structure and content types for aggregated
 * stock market trends data.
 *
 * @see {@link StockTrends} - The type inferred from this schema.
 */
export const stockTrendsSchema = z.object({
   metadata: z.string(),
   last_updated: z.string(),
   top_gainers: z.array(stockIndicatorSchema),
   top_losers: z.array(stockIndicatorSchema),
   most_actively_traded: z.array(stockIndicatorSchema)
});

/**
 * Represents aggregated stock market data including top gainers, losers and active stocks inferred from the schema
 *
 * @see {@link stockTrendsSchema} - The Zod schema defining this structure's validation rules.
 */
export type StockTrends = z.infer<typeof stockTrendsSchema>;

/**
 * Represents a collection of economic indicators and stock market data time series inferred from the schema
 *
 * @see {@link IndicatorTrends} - The type for economic indicator time series data.
 * @see {@link StockTrends} - The type for aggregated stock market trends data.
 */
export type Trends = Record<string, IndicatorTrends[] | StockTrends>;

/**
 * Comprehensive economic data for dashboard financial insights,
 * integrating news and economic trend information.
 *
 * @see {@link News} - The economic news component.
 * @see {@link Trends} - The economic trends component.
 */
export interface Economy {
   news: News;
   trends: Trends;
}