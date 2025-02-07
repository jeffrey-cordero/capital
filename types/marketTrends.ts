export type Trend = Record<string, {
   date: string;
   value: string;
}>;

export type TopGainersLosers = {
   last_update: string,
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

export type MarketTrends = Record<string, Trend[] | TopGainersLosers[]>;