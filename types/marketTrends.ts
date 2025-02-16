export type IndicatorTrend = {
   date: string;
   value: string;
};

export type StockIndictor = {
   ticker: string,
   price: string,
   change_amount: string,
   change_percentage: string,
   volume: string
};

export type StockTrends = {
   metadata: string;
   last_updated: string;
   top_gainers: StockIndictor[],
   top_losers: StockIndictor[],
   most_actively_traded: StockIndictor[]
};

export type MarketTrends = Record<string, IndicatorTrend[] | StockTrends>;