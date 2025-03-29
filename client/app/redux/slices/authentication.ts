import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type WritableDraft } from "immer";

/**
 * The state of the authentication slice
 */
type AuthenticationState = { value: undefined | boolean; }

/**
 * The authentication slice
 */
const authenticationSlice = createSlice({
   name: "authentication",
   initialState: {
      value: undefined
   } as AuthenticationState,
   reducers: {
      /**
       * Sets the authentication state in the Redux store.
       *
       * @param {WritableDraft<AuthenticationState>} state - The current state of the authentication.
       * @param {PayloadAction<boolean>} action - The dispatched action containing the payload
       */
      authenticate(state: WritableDraft<AuthenticationState>, action: PayloadAction<boolean>) {
         state.value = action.payload;
      }
   }
});

export const { authenticate } = authenticationSlice.actions;
export default authenticationSlice.reducer;