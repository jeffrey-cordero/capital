import { z } from "zod";

/**
 * Represents economic indicator data for financial analysis, such as GDP, unemployment rate, etc.
 */
export type IndicatorTrends = {
   date: string;
   value: string;
};

/**
 * Represents stock indicator data for trending stocks, including price, change, volume, etc.
 */
export type StockIndicator = {
   ticker: string;
   price: string;
   change_amount: string;
   change_percentage: string;
   volume: string;
};

/**
 * Represents stock trends data for trending stocks, including price, change, volume, etc.
 */
export type StockTrends ={
   metadata: string;
   last_updated: string;
   top_gainers: StockIndicator[],
   top_losers: StockIndicator[],
   most_actively_traded: StockIndicator[]
};

/**
 * Represents market trend data essential for the dashboard page
 */
export type MarketTrends = Record<string, IndicatorTrends[] | StockTrends>;