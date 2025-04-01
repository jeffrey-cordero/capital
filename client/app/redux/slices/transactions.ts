import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Transaction as CapitalTransaction } from "capital/transactions";
import { type WritableDraft } from "immer";

/**
 * The transaction type for the Redux store.
 */
export type Transaction = Omit<CapitalTransaction, "date"> & { date: string, index: number };

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
       * Sets the transactions state in the Redux store with normalization.
       *
       * @param {WritableDraft<TransactionState>} state - The current state of the transactions
       * @param {PayloadAction<CapitalTransaction[]>} action - The dispatched action containing the payload
       */
      setTransactions(state: WritableDraft<TransactionState>, action: PayloadAction<CapitalTransaction[]>) {
         state.value = action.payload.map((transaction, index) => ({
            ...transaction,
            index, // Store index for constant time lookups
            date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date
         }));
      },
      /**
       * Adds a transaction to the transactions state in the correct order.
       *
       * @param {WritableDraft<TransactionState>} state - The current state of the transactions
       * @param {PayloadAction<Transaction>} action - The dispatched action containing the payload
       */
      addTransaction(state: WritableDraft<TransactionState>, action: PayloadAction<Transaction>) {
         const transaction = action.payload;
         let found = false;

         state.value = state.value.reduce((acc, record, index) => {
            // Attempt to insert the transaction in the correct order or append to the end
            if (!found && record.date >= transaction.date) {
               acc.push({ ...transaction, index });
               acc.push({ ...record, index: index + 1 });
               found = true;
            } else {
               acc.push({ ...record });
            }

            return acc;
         }, [] as Transaction[]);

         if (!found) {
            state.value.push({ ...transaction, index: state.value.length });
         }
      },
      /**
       * Updates a transaction in the transactions state.
       *
       * @param {WritableDraft<TransactionState>} state - The current state of the transactions
       * @param {PayloadAction<Transaction>} action - The dispatched action containing the updated transaction
       */
      updateTransaction(state: WritableDraft<TransactionState>, action: PayloadAction<Transaction>) {
         const { index } = action.payload;
         const updatedTransaction = { ...state.value[index], ...action.payload };

         if (state.value[index].date !== updatedTransaction.date) {
            // Date changed, remove and add as a new transaction
            state.value.splice(index, 1);
            addTransaction(updatedTransaction);
         } else {
            // Date unchanged, update existing transaction
            state.value[index] = updatedTransaction;
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

         state.value = state.value.splice(index, 1);
      }
   }
});

export const { setTransactions, addTransaction, updateTransaction, deleteTransaction } = transactionsSlice.actions;
export default transactionsSlice.reducer;