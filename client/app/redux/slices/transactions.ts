import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Transaction } from "capital/transactions";
import { type WritableDraft } from "immer";

/**
 * The state of the transactions slice.
 */
type TransactionState = { value: Transaction[]; }

/**
 * The transactions slice for transaction state management
 */
const transactionsSlice = createSlice({
   name: "transactions",
   initialState: {
      value: []
   } as TransactionState,
   reducers: {
      /**
       * Sets the transactions state in the Redux store.
       *
       * @param {WritableDraft<TransactionState>} state - The current state of the transactions
       * @param {PayloadAction<Transaction[]>} action - The dispatched action containing the payload
       */
      setTransactions(state: WritableDraft<TransactionState>, action: PayloadAction<Transaction[]>) {
         state.value = action.payload;
      },
      /**
       * Adds a transaction to the transactions state in the correct order.
       *
       * @param {WritableDraft<TransactionState>} state - The current state of the transactions
       * @param {PayloadAction<Transaction>} action - The dispatched action containing the payload
       */
      addTransaction(state: WritableDraft<TransactionState>, action: PayloadAction<Transaction>) {
         const transaction: Transaction = action.payload;

         // Insert the transaction in the correct order
         for (let i = 0; i < state.value.length; i++) {
            if (transaction.date >= state.value[i].date) {
               state.value.splice(i, 0, transaction);
               return;
            }
         }

         state.value.push(transaction);
      },
      /**
       * Updates a transaction in the transactions state.
       *
       * @param {WritableDraft<TransactionState>} state - The current state of the transactions
       * @param {PayloadAction<{ index: number, transaction: Transaction }>} action - The dispatched action containing the updated transaction
       */
      updateTransaction(state: WritableDraft<TransactionState>, action: PayloadAction<{ index: number, transaction: Partial<Transaction> }>) {
         const { index } = action.payload;
         const updates: Transaction = { ...state.value[index], ...action.payload.transaction };

         if (state.value[index].date !== updates.date) {
            // Date changed - remove and add as a new transaction
            state.value.splice(index, 1);

            // Insert the updated transaction in the correct order
            for (let i = 0; i < state.value.length; i++) {
               if (updates.date >= state.value[i].date) {
                  state.value.splice(i, 0, updates);
                  return;
               }
            }

            state.value.push(updates);
         } else {
            // Date unchanged - update existing transaction
            state.value[index] = updates;
         }
      },
      /**
       * Removes a transaction from the transactions state by its index.
       *
       * @param {WritableDraft<TransactionState>} state - The current state of the transactions
       * @param {PayloadAction<{ index: number }>} action - The dispatched action containing the index payload
       */
      deleteTransaction(state: WritableDraft<TransactionState>, action: PayloadAction<{ index: number }>) {
         const { index } = action.payload;

         state.value = state.value.filter((_, i) => i !== index);
      },
      /**
       * Removes a list of transactions from the transactions state based on their IDs for bulk deletion.
       *
       * @param {WritableDraft<TransactionState>} state - The current state of the transactions
       * @param {PayloadAction<{ transactionIds: string[] }>} action - The dispatched action containing the IDs payload
       */
      deleteTransactions(state: WritableDraft<TransactionState>, action: PayloadAction<{ transactionIds: string[] }>) {
         const set: Set<string> = new Set(action.payload.transactionIds);

         state.value = state.value.filter((transaction) => !set.has(transaction.transaction_id || ""));
      }
   }
});

export const { setTransactions, addTransaction, updateTransaction, deleteTransaction, deleteTransactions } = transactionsSlice.actions;
export default transactionsSlice.reducer;