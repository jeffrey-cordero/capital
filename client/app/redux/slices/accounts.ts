import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Account } from "capital/accounts";
import { type WritableDraft } from "immer";

/**
 * The state of the accounts slice.
 */
type AccountState = { value: Account[]; }

/**
 * The accounts slice for account state management.
 */
const accountsSlice = createSlice({
   name: "accounts",
   initialState: {
      value: []
   } as AccountState,
   reducers: {
      /**
       * Sets the accounts state in the Redux store.
       *
       * @param {WritableDraft<AccountState>} state - The current state of the accounts
       * @param {PayloadAction<Account[]>} action - The dispatched action containing the payload
       */
      setAccounts(state: WritableDraft<AccountState>, action: PayloadAction<Account[]>) {
         state.value = action.payload;
      },
      /**
       * Adds an account to the accounts state.
       *
       * @param {WritableDraft<AccountState>} state - The current state of the accounts
       * @param {PayloadAction<Account>} action - The dispatched action containing the payload
       */
      addAccount(state: WritableDraft<AccountState>, action: PayloadAction<Account>) {
         state.value.push(action.payload);
      },
      /**
       * Updates an account in the accounts state.
       *
       * @param {WritableDraft<AccountState>} state - The current state of the accounts
       * @param {PayloadAction<Partial<Account>>} action - The dispatched action containing the payload
       */
      updateAccount(state: WritableDraft<AccountState>, action: PayloadAction<Partial<Account>>) {
         const account = action.payload;

         state.value = state.value.map((acc) => account.account_id === acc.account_id ? { ...acc, ...account } : acc);
      },
      /**
       * Removes an account from the accounts state.
       *
       * @param {WritableDraft<AccountState>} state - The current state of the accounts
       * @param {PayloadAction<string>} action - The dispatched action containing the payload
       */
      removeAccount(state: WritableDraft<AccountState>, action: PayloadAction<string>) {
         state.value = state.value.filter(account => account.account_id !== action.payload);
      }
   }
});

export const { setAccounts, addAccount, updateAccount, removeAccount } = accountsSlice.actions;
export default accountsSlice.reducer;