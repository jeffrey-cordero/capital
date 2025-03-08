import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MarketTrends } from "capital/marketTrends";
import type { News } from "capital/news";

const economySlice = createSlice({
   name: "economy",
   initialState: {
      news: {} as News,
      marketTrends: {} as MarketTrends
   },
   reducers: {
      setEconomy: (state, action: PayloadAction<{ news: News; marketTrends: MarketTrends }>) => {
         state.news = action.payload.news;
         state.marketTrends = action.payload.marketTrends;
      }
   }
});

export const { setEconomy } = economySlice.actions;
export default economySlice.reducer;