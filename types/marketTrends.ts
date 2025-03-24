// Economic indicator data for financial analysis, such as GDP, unemployment rate, etc.
export type IndicatorTrend = {
   date: string;
   value: string;
};

// Stock indicator data for trending stocks, including price, change, volume, etc.
export type StockIndicator = {
   ticker: string;
   price: string;
   change_amount: string;
   change_percentage: string;
   volume: string;
};

export type StockTrends ={
   metadata: string;
   last_updated: string;
   top_gainers: StockIndicator[],
   top_losers: StockIndicator[],
   most_actively_traded: StockIndicator[]
};

// Represents market trend data for financial analysis
export type MarketTrends = Record<string, IndicatorTrend[] | StockTrends>;