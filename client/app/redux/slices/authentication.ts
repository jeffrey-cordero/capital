import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type WritableDraft } from "immer";

/**
 * The state of the authentication slice
 *
 * @description
 * - The authentication slice is used to manage the authentication state of the application
 * - Initial state is `undefined` until the server confirms the user's authentication status
 */
type AuthenticationState = { value: undefined | boolean; }

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
       * @param {PayloadAction<boolean>} action - The dispatched action containing the payload of a boolean value.
       * @description
       * - Sets the authentication state to the payload of the dispatched action
       */
      authenticate(state: WritableDraft<AuthenticationState>, action: PayloadAction<boolean>) {
         state.value = action.payload;
      }
   }
});

export const { authenticate } = authenticationSlice.actions;
export default authenticationSlice.reducer;