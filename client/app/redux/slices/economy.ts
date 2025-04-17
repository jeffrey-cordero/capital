import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Economy, News, Trends } from "capital/economy";
import { type WritableDraft } from "immer";

/**
 * The state of the economy slice
 */
type EconomyState = { value: Economy };

/**
 * The economy slice
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
       * Sets the economy state in the Redux store.
       *
       * @param {EconomyState} state - The current state of the economy
       * @param {PayloadAction<EconomyState>} action - The dispatched action containing the payload
       */
      setEconomy: (state: WritableDraft<EconomyState>, action: PayloadAction<typeof state.value>) => {
         state.value = action.payload;
      }
   }
});

export const { setEconomy } = economySlice.actions;
export default economySlice.reducer;