import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Transaction } from "capital/transactions";
import { type WritableDraft } from "immer";

/**
 * Redux state for transactions management
 */
type TransactionState = { value: Transaction[]; }

/**
 * Transactions slice for state management
 */
const transactionsSlice = createSlice({
   name: "transactions",
   initialState: {
      value: []
   } as TransactionState,
   reducers: {
      /**
       * Sets the transactions state
       *
       * @param {WritableDraft<TransactionState>} state - Current transactions state
       * @param {PayloadAction<Transaction[]>} action - Action containing transactions array
       */
      setTransactions(state: WritableDraft<TransactionState>, action: PayloadAction<Transaction[]>) {
         state.value = action.payload;
      },
      /**
       * Adds a transaction in reverse chronological order (newest to oldest)
       *
       * @param {WritableDraft<TransactionState>} state - Current transactions state
       * @param {PayloadAction<Transaction>} action - Action containing the transaction to add
       */
      addTransaction(state: WritableDraft<TransactionState>, action: PayloadAction<Transaction>) {
         const transaction: Transaction = action.payload;

         // Insert the transaction in the correct order
         for (let i = 0; i < state.value.length; i++) {
            if (transaction.date! >= state.value[i].date!) {
               state.value.splice(i, 0, transaction);
               return;
            }
         }

         state.value.push(transaction);
      },
      /**
       * Updates a transaction and maintains reverse chronological order
       *
       * @param {WritableDraft<TransactionState>} state - Current transactions state
       * @param {PayloadAction<{ index: number, transaction: Partial<Transaction> }>} action - Action containing current index and updated transaction fields
       */
      updateTransaction(state: WritableDraft<TransactionState>, action: PayloadAction<{ index: number, transaction: Partial<Transaction> }>) {
         const { index, transaction } = action.payload;
         const updates: Transaction = { ...state.value[index], ...transaction };

         if (state.value[index].date! !== updates.date!) {
            // Transaction date changed, so we treat it as a new transaction
            state.value.splice(index, 1);

            // Insert the updated transaction in the correct order
            for (let i = 0; i < state.value.length; i++) {
               if (updates.date! >= state.value[i].date!) {
                  state.value.splice(i, 0, updates);
                  return;
               }
            }

            state.value.push(updates);
         } else {
            // Update the existing transaction
            state.value[index] = updates;
         }
      },
      /**
       * Removes a transaction by index
       *
       * @param {WritableDraft<TransactionState>} state - Current transactions state
       * @param {PayloadAction<{ index: number }>} action - Action containing the index to remove
       */
      deleteTransaction(state: WritableDraft<TransactionState>, action: PayloadAction<{ index: number }>) {
         const { index } = action.payload;

         state.value = state.value.filter((_, i) => i !== index);
      },
      /**
       * Batch removes transactions by their IDs
       *
       * @param {WritableDraft<TransactionState>} state - Current transactions state
       * @param {PayloadAction<{ transactionIds: string[] }>} action - Action containing array of transaction IDs to remove
       */
      deleteTransactions(state: WritableDraft<TransactionState>, action: PayloadAction<{ transactionIds: string[] }>) {
         const set: Set<string> = new Set(action.payload.transactionIds);

         state.value = state.value.filter((transaction) => !set.has(transaction.transaction_id || ""));
      }
   }
});

export const { setTransactions, addTransaction, updateTransaction, deleteTransaction, deleteTransactions } = transactionsSlice.actions;
export default transactionsSlice.reducer;