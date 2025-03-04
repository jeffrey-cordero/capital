import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Account, type AccountHistory } from "capital/accounts";

const authenticationSlice = createSlice({
   name: "accounts",
   initialState: {
      value: [] as Account[]
   },
   reducers: {
      setAccounts(state, action: PayloadAction<Account[]>) {
         state.value = action.payload;
      },
      addAccount(state, action: PayloadAction<Account>) {
         state.value.push(action.payload);
      },
      updateAccount(state, action: PayloadAction<{account: Account, history?: AccountHistory }>) {
         const account = { ...action.payload.account };
         const history = action.payload.history;

         if (history) {
            // Update the history records array if a record is supplied
            let found: boolean = false;
            const update = new Date(history.last_updated);

            account.history = account.history.reduce((acc: AccountHistory[], record) => {
               const current = new Date(record.last_updated);

               if (!found && update.getTime() >= current.getTime()) {
                  // Insert the new history record
                  acc.push({
                     balance: history.balance,
                     last_updated: update.toISOString()
                  });

                  // Insert the old non-updating record for different date
                  if (update.getTime() !== current.getTime()) {
                     acc.push({ ...record });
                  }

                  found = true;
               } else {
                  // Insert the old history record
                  acc.push({ ...record });
               }

               return acc;
            }, []);

            // Append new history record
            if (!found) {
               account.history.push({
                  balance: history.balance,
                  last_updated: update.toISOString()
               });
            }
         }

         state.value = state.value.map((acc) => {
            return account.account_id ===  acc.account_id ? {
               ...account,
               // Ensure the current balance matches the latest history record
               balance: account.history[0].balance
            } : acc;
         });
      },
      removeAccount(state, action: PayloadAction<string>) {
         state.value = state.value.filter((account) => {
            return account.account_id !== action.payload;
         });
      }
   }
});

export const { setAccounts, addAccount, updateAccount, removeAccount } = authenticationSlice.actions;
export default authenticationSlice.reducer;