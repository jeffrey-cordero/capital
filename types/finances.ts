export type TreasuryYield = Record<string, {
   data: string, // YYYY-MM-DD
   value: string // percentage
}>;

// Treasury Yield, Federal Interest Rate, Inflation, Unemployment, Real GDP
export type EconomicIndicator = Record<string, {
   data: string, // YYYY-MM-DD
   value: string // percentage
}>;

// same for INFLATION_RATE
export type InflationRate = Record<string, {
   data: string, // YYYY-MM-DD
   value: string // percentage
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

export type Finances = Record<string, any>;

