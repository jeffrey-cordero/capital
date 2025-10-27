import { z } from "zod";

/**
 * Schema for economic news API response validation
 *
 * @see {@link News} - Type inferred from this schema
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
         published: z.string()
      })).min(25),
      totalResults: z.coerce.number()
   })
}).passthrough();

/**
 * Economic news API response data
 *
 * @see {@link newsSchema} - Schema defining validation rules
 */
export type News = z.infer<typeof newsSchema>;

/**
 * Single news article with metadata and content
 *
 * @see {@link News} - Parent type this is extracted from
 */
export type Article = News["response"]["data"][0];

/**
 * Schema for economic indicator time series validation
 *
 * @see {@link IndicatorTrends} - Type inferred from this schema
 */
export const indicatorTrendsSchema = z.array(z.object({
   date: z.string().regex(/^\d{4,}-\d{2}-\d{2}$/),
   value: z.coerce.number()
}));

/**
 * Time series data for economic indicators (GDP, unemployment, etc.)
 *
 * @see {@link indicatorTrendsSchema} - Schema defining validation rules
 */
export type IndicatorTrends = z.infer<typeof indicatorTrendsSchema>;

/**
 * Schema for individual stock market data points validation
 *
 * @see {@link StockIndicator} - Type inferred from this schema
 */
export const stockIndicatorSchema = z.object({
   ticker: z.string(),
   price: z.coerce.number(),
   change_amount: z.coerce.number(),
   change_percentage: z.string(),
   volume: z.coerce.number()
});

/**
 * Single stock data point with price and movement metrics
 *
 * @see {@link stockIndicatorSchema} - Schema defining validation rules
 */
export type StockIndicator = z.infer<typeof stockIndicatorSchema>;

/**
 * Schema for aggregated stock market trends validation
 *
 * @see {@link StockTrends} - Type inferred from this schema
 */
export const stockTrendsSchema = z.object({
   metadata: z.string(),
   last_updated: z.string(),
   top_gainers: z.array(stockIndicatorSchema),
   top_losers: z.array(stockIndicatorSchema),
   most_actively_traded: z.array(stockIndicatorSchema)
});

/**
 * Aggregated stock market data (gainers, losers, active stocks)
 *
 * @see {@link stockTrendsSchema} - Schema defining validation rules
 */
export type StockTrends = z.infer<typeof stockTrendsSchema>;

/**
 * Collection of economic indicators and stock market data series
 *
 * @see {@link IndicatorTrends} - Economic indicator time series data
 * @see {@link StockTrends} - Aggregated stock market trends data
 */
export type Trends = Record<string, IndicatorTrends[] | StockTrends>;

/**
 * Economic data for dashboard financial insights
 *
 * @see {@link News} - Economic news component
 * @see {@link Trends} - Economic trends component
 */
export interface Economy {
   news: News;
   trends: Trends;
}