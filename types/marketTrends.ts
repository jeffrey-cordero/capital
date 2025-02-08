export type IndicatorTrends = Record<string, {
   date: string;
   value: string;
}>;

export type StockTrends = {
   metadata: string;
   last_updated: string;
   top_gainers: {
      ticker: string,
      price: string,
      change_amount: string,
      change_percentage: string,
      volume: string
   }[],
   top_losers: {
      ticker: string,
      price: string,
      change_amount: string,
      change_percentage: string,
      volume: string
   }[],
   most_actively_traded: {
      ticker: string,
      price: string,
      change_amount: string,
      change_percentage: string,
      volume: string
   }[]
};

export type MarketTrends = Record<string, IndicatorTrends[] | StockTrends[]>;