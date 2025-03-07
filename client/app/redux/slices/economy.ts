import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MarketTrends } from "capital/marketTrends";
import type { News } from "capital/news";

const economySlice = createSlice({
   name: "economy",
   initialState: {
      financialNews: {} as News,
      marketTrends: {} as MarketTrends
   },
   reducers: {
      setEconomy: (state, action: PayloadAction<{ financialNews: News; marketTrends: MarketTrends }>) => {
         state.financialNews = action.payload.financialNews;
         state.marketTrends = action.payload.marketTrends;
      }
   }
});

export const { setEconomy } = economySlice.actions;
export default economySlice.reducer;