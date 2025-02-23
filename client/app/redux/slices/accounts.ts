import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Account } from "capital-types/accounts";

const authenticationSlice = createSlice({
   name: "accounts",
   initialState: {
      value: [] as Account[]
   },
   reducers: {
      addAccount(state, action: PayloadAction<Account>) {
         state.value.push(action.payload);
      },
      updateAccount(state, action: PayloadAction<Account>) {
         state.value = state.value.map((account) => {
            return account.account_id === action.payload.account_id ? action.payload : account;
         });
      },
      removeAccount(state, action: PayloadAction<string>) {
         state.value = state.value.filter((account) => {
            return account.account_id !== action.payload;
         });
      }
   }
});

export const { addAccount, updateAccount, removeAccount } = authenticationSlice.actions;
export default authenticationSlice.reducer;