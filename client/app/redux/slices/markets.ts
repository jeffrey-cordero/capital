import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MarketTrends } from "capital/markets";
import type { News } from "capital/news";

const marketSlice = createSlice({
   name: "economy",
   initialState: {
      news: {} as News,
      trends: {} as MarketTrends
   },
   reducers: {
      setMarkets: (state, action: PayloadAction<{ news: News; trends: MarketTrends }>) => {
         state.news = action.payload.news;
         state.trends = action.payload.trends;
      }
   }
});

export const { setMarkets } = marketSlice.actions;
export default marketSlice.reducer;