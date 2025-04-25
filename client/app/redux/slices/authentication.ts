import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type WritableDraft } from "immer";

/**
 * Redux state for authentication management
 */
type AuthenticationState = { value: undefined | boolean; }

/**
 * Authentication slice for state management
 */
const authenticationSlice = createSlice({
   name: "authentication",
   initialState: {
      value: undefined
   } as AuthenticationState,
   reducers: {
      /**
       * Sets the authentication state
       *
       * @param {WritableDraft<AuthenticationState>} state - Current authentication state
       * @param {PayloadAction<boolean>} action - Action containing authentication value
       */
      authenticate(state: WritableDraft<AuthenticationState>, action: PayloadAction<boolean>) {
         state.value = action.payload;
      }
   }
});

export const { authenticate } = authenticationSlice.actions;
export default authenticationSlice.reducer;