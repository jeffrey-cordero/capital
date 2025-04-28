import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Account } from "capital/accounts";
import { type WritableDraft } from "immer";

/**
 * Redux state for accounts management
 */
type AccountState = { value: Account[]; }

/**
 * Accounts slice for state management
 */
const accountsSlice = createSlice({
   name: "accounts",
   initialState: {
      value: []
   } as AccountState,
   reducers: {
      /**
       * Sets the accounts state
       *
       * @param {WritableDraft<AccountState>} state - Current accounts state
       * @param {PayloadAction<Account[]>} action - Action containing accounts array
       */
      setAccounts(state: WritableDraft<AccountState>, action: PayloadAction<Account[]>) {
         state.value = action.payload;
      },
      /**
       * Adds a new account
       *
       * @param {WritableDraft<AccountState>} state - Current accounts state
       * @param {PayloadAction<Account>} action - Action containing the account to add
       */
      addAccount(state: WritableDraft<AccountState>, action: PayloadAction<Account>) {
         state.value.push(action.payload);
      },
      /**
       * Updates an existing account
       *
       * @param {WritableDraft<AccountState>} state - Current accounts state
       * @param {PayloadAction<Partial<Account>>} action - Action containing updated account fields
       */
      updateAccount(state: WritableDraft<AccountState>, action: PayloadAction<Partial<Account>>) {
         const account = action.payload;

         state.value = state.value.map((acc) => account.account_id === acc.account_id ? { ...acc, ...account } : acc);
      },
      /**
       * Removes an account by ID
       *
       * @param {WritableDraft<AccountState>} state - Current accounts state
       * @param {PayloadAction<string>} action - Action containing the account ID to remove
       */
      removeAccount(state: WritableDraft<AccountState>, action: PayloadAction<string>) {
         state.value = state.value.filter(account => account.account_id !== action.payload);
      }
   }
});

export const { setAccounts, addAccount, updateAccount, removeAccount } = accountsSlice.actions;
export default accountsSlice.reducer;