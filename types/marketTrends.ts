export type IndicatorTrend = {
   date: string;
   value: string;
};

export type StockIndicator = {
   ticker: string,
   price: string,
   change_amount: string,
   change_percentage: string,
   volume: string
};

export type StockTrends = {
   metadata: string;
   last_updated: string;
   top_gainers: StockIndicator[],
   top_losers: StockIndicator[],
   most_actively_traded: StockIndicator[]
};

export type MarketTrends = Record<string, IndicatorTrend[] | StockTrends>;