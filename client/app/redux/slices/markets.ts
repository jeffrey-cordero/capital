import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MarketTrends } from "capital/markets";
import type { News } from "capital/news";
import { type WritableDraft } from "immer";

/**
 * The state of the markets slice
 */
type MarketState = { value: { news: News, trends: MarketTrends } };

/**
 * The markets slice
 */
const marketSlice = createSlice({
   name: "economy",
   initialState: {
      value: {
         news: {} as News,
         trends: {} as MarketTrends
      }
   } as MarketState,
   reducers: {
      /**
       * Sets the markets state in the Redux store.
       *
       * @param {MarketState} state - The current state of the markets
       * @param {PayloadAction<MarketState>} action - The dispatched action containing the payload
       */
      setMarkets: (state: WritableDraft<MarketState>, action: PayloadAction<typeof state.value>) => {
         state.value = action.payload;
      }
   }
});

export const { setMarkets } = marketSlice.actions;
export default marketSlice.reducer;