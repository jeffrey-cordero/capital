import type {
   Economy,
   IndicatorTrends,
   News,
   StockIndicator,
   StockTrends
} from "../economy";

/**
 * Creates mock news article data
 *
 * @param {number} [count=25] - Number of news articles to generate
 * @returns {News} Mock news response from Global Economy News API
 */
export const createMockNews = (count: number = 25): News => ({
   response: {
      restResults: 100,
      data: Array(count).fill(null).map((_, i) => ({
         id: `news-${i}`,
         site_region: "us",
         site_language: "en",
         author: "Test Author",
         domain: "test.com",
         crawled: Date.now(),
         language: "en",
         title: `Test News ${i}`,
         site_type: "news",
         text: `Test news content ${i}`,
         url: `https://test.com/news-${i}`,
         site: "test.com",
         site_country: "us",
         published: new Date().toISOString()
      })),
      totalResults: 100
   }
});

/**
 * Creates mock stock indicators for testing
 *
 * @param {number} count - Number of stock indicators to generate
 * @returns {StockIndicator[]} Array of mock stock indicators
 */
export const createMockStockIndicators = (count: number): StockIndicator[] =>
   Array(count).fill(null).map((_, i) => ({
      ticker: `TICK${i}`,
      price: 100 + i,
      change_amount: 1.5 + i,
      change_percentage: `${1.5 + i}%`,
      volume: 1000000 + i
   }));

/**
 * Creates mock stock trends data from Alpha Vantage API
 *
 * @returns {StockTrends} Mock stock trends including top gainers, losers, and most traded
 */
export const createMockStockTrends = (): StockTrends => ({
   metadata: "Top gainers, losers, and most actively traded US tickers",
   last_updated: new Date().toISOString(),
   top_gainers: createMockStockIndicators(3),
   top_losers: createMockStockIndicators(3),
   most_actively_traded: createMockStockIndicators(3)
});

/**
 * Creates mock economic indicator trends data
 *
 * @param {number} [count=10] - Number of data points to generate
 * @returns {IndicatorTrends} Array of date-value pairs for economic indicators
 */
export const createMockIndicatorTrends = (count: number = 10): IndicatorTrends =>
   Array(count).fill(null).map((_, i) => ({
      date: `2025-0${(i % 9) + 1}-01`,
      value: 100 + i
   }));

/**
 * Creates complete mock economy data matching the production structure
 *
 * @returns {Economy} Complete economy data with news and all economic trends
 */
export const createMockEconomyData = (): Economy => ({
   news: createMockNews(),
   trends: {
      "Stocks": createMockStockTrends(),
      "GDP": [createMockIndicatorTrends()],
      "Inflation": [createMockIndicatorTrends()],
      "Unemployment": [createMockIndicatorTrends()],
      "Treasury Yield": [createMockIndicatorTrends()],
      "Federal Interest Rate": [createMockIndicatorTrends()]
   }
});