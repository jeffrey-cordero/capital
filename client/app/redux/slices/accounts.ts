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
         const account: Account = { ...action.payload.account };
         const history: AccountHistory | undefined = action.payload.history;

         if (history) {
            // Update the history records array if a record is supplied
            let found: boolean = false;
            const update: Date = new Date(history.last_updated);

            account.history = account.history.reduce((acc: AccountHistory[], record: AccountHistory) => {
               const current = new Date(record.last_updated);

               if (!found && update.getTime() >= current.getTime()) {
                  // Insert the new history record
                  found = true;

                  acc.push({
                     balance: history.balance,
                     last_updated: update.toISOString()
                  });

                  // Insert the old record with a different date
                  if (update.getTime() !== current.getTime()) {
                     acc.push({ ...record });
                  }
               } else {
                  // Insert the old history record
                  acc.push({ ...record });
               }

               return acc;
            }, []);

            // New history record to append
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