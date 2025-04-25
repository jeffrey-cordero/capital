import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type UserDetails } from "capital/user";
import { type WritableDraft } from "immer";

/**
 * Redux state for user settings management
 */
type SettingsState = { value: UserDetails; }

/**
 * Settings slice for managing user profile details
 */
const settingsSlice = createSlice({
   name: "settings",
   initialState: {
      value: {}
   } as SettingsState,
   reducers: {
      /**
       * Sets the complete user details
       *
       * @param {WritableDraft<SettingsState>} state - Current settings state
       * @param {PayloadAction<UserDetails>} action - Action containing user details
       */
      setDetails(state: WritableDraft<SettingsState>, action: PayloadAction<UserDetails>) {
         state.value = action.payload;
      },
      /**
       * Updates partial user details
       *
       * @param {WritableDraft<SettingsState>} state - Current settings state
       * @param {PayloadAction<Partial<UserDetails>>} action - Action containing updated user detail fields
       */
      updateDetails(state: WritableDraft<SettingsState>, action: PayloadAction<Partial<UserDetails>>) {
         state.value = { ...state.value, ...action.payload };
      }
   }
});

export const { setDetails, updateDetails } = settingsSlice.actions;
export default settingsSlice.reducer;