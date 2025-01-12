export type Prices = Record<string, {
   "1. open": string;
   "2. high": string;
   "3. low": string;
   "4. close": string;
   "5. volume": string;
}>;

export type Stocks = Record<string, Prices>;