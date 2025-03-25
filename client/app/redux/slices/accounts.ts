import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Account, type AccountHistory } from "capital/accounts";
import { type WritableDraft } from "immer";

import { normalizeDate } from "@/lib/dates";

/**
 * The state of the accounts slice
 *
 * @see {@link Account}
 * @see {@link AccountHistory}
 */
type AccountState = { value: Account[]; }

/**
 * The accounts slice for the accounts page
 *
 * @see {@link Account}
 * @see {@link AccountHistory}
 * @description
 * - The accounts slice is used to manage the accounts state
 * - Handles the addition, updating, and removal of accounts
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
       * @param {WritableDraft<AccountState>} state - The current state of the accounts.
       * @param {PayloadAction<Account[]>} action - The dispatched action containing the payload
       * @see {@link Account}
       * @description
       * - Sets the accounts state to the payload of the dispatched action
       */
      setAccounts(state: WritableDraft<AccountState>, action: PayloadAction<Account[]>) {
         state.value = action.payload;
      },
      /**
       * Adds an account to the accounts state.
       *
       * @param {WritableDraft<AccountState>} state - The current state of the accounts.
       * @param {PayloadAction<Account>} action - The dispatched action containing the payload
       * @see {@link Account}
       * @description
       * - Adds an account to the accounts state
       */
      addAccount(state: WritableDraft<AccountState>, action: PayloadAction<Account>) {
         state.value.push(action.payload);
      },
      /**
       * Updates an account in the accounts state.
       *
       * @param {WritableDraft<AccountState>} state - The current state of the accounts.
       * @param {PayloadAction<{ account: Account, history?: AccountHistory }>} action - The dispatched action containing the payload
       * @see {@link Account}
       * @see {@link AccountHistory}
       * @description
       * - Updates an account in the accounts state
       * - Updates the account's balance to the most recent history record updates, if applicable
       */
      updateAccount(state: WritableDraft<AccountState>, action: PayloadAction<{ account: Account, history?: AccountHistory }>) {
         const account: Account = { ...action.payload.account };
         const history: AccountHistory | undefined = action.payload.history;

         if (history) {
            // Convert update date once to avoid repeated conversions
            let historyInserted = false;
            const updateDate = normalizeDate(history.last_updated);
            const updateTimestamp = updateDate.getTime();

            // Process history records chronologically
            account.history = account.history.reduce((acc: AccountHistory[], record: AccountHistory) => {
               const currentDate = normalizeDate(record.last_updated.split("T")[0]);
               const currentTimestamp = currentDate.getTime();

               // Insert new history record in chronological order
               if (!historyInserted && updateTimestamp >= currentTimestamp) {
                  historyInserted = true;
                  acc.push({
                     balance: history.balance,
                     last_updated: updateDate.toISOString()
                  });

                  // Keep the old record if dates don't match
                  if (updateTimestamp !== currentTimestamp) {
                     acc.push(record);
                  }
               } else {
                  acc.push(record);
               }

               return acc;
            }, []);

            // Append history record if it's the most recent
            if (!historyInserted) {
               account.history.push({
                  balance: history.balance,
                  last_updated: updateDate.toISOString()
               });
            }
         }

         // Update account in state with latest balance
         state.value = state.value.map((acc) =>
            account.account_id === acc.account_id ? { ...account, balance: account.history[0].balance } : acc
         );
      },
      /**
       * Removes an account from the accounts state.
       *
       * @param {WritableDraft<AccountState>} state - The current state of the accounts.
       * @param {PayloadAction<string>} action - The dispatched action containing the payload.
       * @see {@link Account}
       * @description
       * - Removes an account from the accounts state
       * - Filters out the account with the matching `account_id` from the payload
       */
      removeAccount(state: WritableDraft<AccountState>, action: PayloadAction<string>) {
         // Filter out the account with matching ID
         state.value = state.value.filter(account => account.account_id !== action.payload);
      }
   }
});

export const { setAccounts, addAccount, updateAccount, removeAccount } = accountsSlice.actions;
export default accountsSlice.reducer;