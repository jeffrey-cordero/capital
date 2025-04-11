import { z } from "zod";

/**
 * Represents the schema for the indicator trends data
 */
export const indicatorTrendsSchema = z.array(z.object({
   date: z.string().regex(/^\d{4,}-\d{2}-\d{2}$/),
   value: z.coerce.number()
}));

/**
 * Represents economic indicator data for financial analysis, such as GDP, unemployment rate, etc.
 */
export type IndicatorTrends = z.infer<typeof indicatorTrendsSchema>;

/**
 * Represents the schema for the stock indicator data
 */
export const stockIndicatorSchema = z.object({
   ticker: z.string(),
   price: z.coerce.number(),
   change_amount: z.coerce.number(),
   change_percentage: z.string(),
   volume: z.coerce.number()
});

/**
 * Represents stock indicator data for trending stocks, including price, change, volume, etc.
 */
export type StockIndicator = z.infer<typeof stockIndicatorSchema>;

/**
 * Represents stock trends data for trending stocks, including price, change, volume, etc.
 */
export const stockTrendsSchema = z.object({
   metadata: z.string(),
   last_updated: z.string(),
   top_gainers: z.array(stockIndicatorSchema),
   top_losers: z.array(stockIndicatorSchema),
   most_actively_traded: z.array(stockIndicatorSchema)
});

/**
 * Represents stock trends, including top gainers, top losers, and most actively traded stocks
 */
export type StockTrends = z.infer<typeof stockTrendsSchema>;

/**
 * Represents market trend data essential for the dashboard page
 */
export type MarketTrends = Record<string, IndicatorTrends[] | StockTrends>;