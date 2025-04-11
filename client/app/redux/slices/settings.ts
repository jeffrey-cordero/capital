import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type UserDetails } from "capital/user";
import { type WritableDraft } from "immer";

/**
 * The state of the settings slice.
 */
type SettingsState = { value: UserDetails; }

/**
 * The settings slice for user details state management.
 */
const settingsSlice = createSlice({
   name: "settings",
   initialState: {
      value: {}
   } as SettingsState,
   reducers: {
      /**
       * Sets the user details state in the Redux store.
       *
       * @param {WritableDraft<SettingsState>} state - The current state of the settings
       * @param {PayloadAction<UserDetails>} action - The dispatched action containing the payload
       */
      setDetails(state: WritableDraft<SettingsState>, action: PayloadAction<UserDetails>) {
         state.value = action.payload;
      },
      /**
       * Updates user details in the settings state.
       *
       * @param {WritableDraft<SettingsState>} state - The current state of the settings
       * @param {PayloadAction<Partial<UserDetails>>} action - The dispatched action containing the payload
       */
      updateDetails(state: WritableDraft<SettingsState>, action: PayloadAction<Partial<UserDetails>>) {
         state.value = { ...state.value, ...action.payload };
      }
   }
});

export const { setDetails, updateDetails } = settingsSlice.actions;
export default settingsSlice.reducer;