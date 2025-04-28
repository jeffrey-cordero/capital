import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Economy, News, Trends } from "capital/economy";
import { type WritableDraft } from "immer";

/**
 * Redux state for economy data management
 */
type EconomyState = { value: Economy };

/**
 * Economy slice for managing economic data and trends
 */
const economySlice = createSlice({
   name: "economy",
   initialState: {
      value: {
         news: {} as News,
         trends: {} as Trends
      }
   } as EconomyState,
   reducers: {
      /**
       * Sets the economy state with news and trends
       *
       * @param {WritableDraft<EconomyState>} state - Current economy state
       * @param {PayloadAction<Economy>} action - Action containing economy data
       */
      setEconomy: (state: WritableDraft<EconomyState>, action: PayloadAction<typeof state.value>) => {
         state.value = action.payload;
      }
   }
});

export const { setEconomy } = economySlice.actions;
export default economySlice.reducer;