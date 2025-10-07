import type { GridRowSelectionModel } from "@mui/x-data-grid";
import { HTTP_STATUS } from "capital/server";
import { type Transaction } from "capital/transactions";
import { type RefObject, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";
import { deleteTransaction, deleteTransactions } from "@/redux/slices/transactions";

/**
 * Props for the TransactionDeletion component
 *
 * @property {Transaction} transaction - Transaction to delete
 * @property {number} index - Index of the transaction in the store
 */
interface TransactionDeletionProps {
   transaction: Transaction;
   index: number;
}

/**
 * Confirmation message for single transaction deletion
 */
const message = "Are you sure you want to delete this transaction? This action cannot be undone.";

/**
 * Confirmation message for bulk transaction deletion
 */
const bulkMessage = "Are you sure you want to delete these transactions? This action cannot be undone.";

/**
 * Transaction deletion confirmation component with API integration
 *
 * @param {TransactionDeletionProps} props - The TransactionDeletion component props
 * @returns {React.ReactNode} Deletion confirmation component
 */
export function TransactionDeletion({ transaction, index }: TransactionDeletionProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = useCallback(async() => {
      try {
         // Submit the request to the API for transaction deletion
         const result = await sendApiRequest<number>(
            `dashboard/transactions/${transaction.transaction_id}`, "DELETE", undefined, dispatch, navigate
         );

         if (result === HTTP_STATUS.NO_CONTENT) {
            // Delete the transaction from the Redux store based on the current index
            dispatch(deleteTransaction({ index }));
         }
      } catch (error) {
         console.error("Failed to delete transaction:", error);
      }
   }, [dispatch, navigate, transaction.transaction_id, index]);

   return (
      <Confirmation
         fontSize = "1.1rem"
         message = { message }
         onConfirmation = { onSubmit }
         type = "icon"
      />
   );
}

/**
 * Props for bulk transaction deletion
 *
 * @property {RefObject<GridRowSelectionModel>} selectedRows - Reference to selected transaction rows
 */
interface BulkTransactionDeletionProps {
   selectedRows: RefObject<GridRowSelectionModel>;
}

/**
 * Bulk transaction deletion confirmation with API integration
 *
 * @param {BulkTransactionDeletionProps} props - The BulkTransactionDeletion component props
 * @returns {React.ReactNode} Bulk deletion confirmation component
 */
export function BulkTransactionDeletion({ selectedRows }: BulkTransactionDeletionProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = useCallback(async() => {
      const transactionIds: string[] = selectedRows.current as string[];

      try {
         // Submit the request to the API for bulk transaction deletion
         const result = await sendApiRequest<number>("dashboard/transactions/bulk", "DELETE", { transactionIds }, dispatch, navigate);

         // Delete the transactions from the Redux store based on the provided transaction IDs
         if (result === HTTP_STATUS.NO_CONTENT) {
            dispatch(deleteTransactions({ transactionIds }));
         }
      } catch (error) {
         console.error("Failed to delete transactions:", error);
      }
   }, [selectedRows, dispatch, navigate]);

   return (
      <Confirmation
         fontSize = "1rem"
         message = { bulkMessage }
         onConfirmation = { onSubmit }
         type = "icon"
      />
   );
}