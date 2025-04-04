import { type Transaction } from "capital/transactions";
import { useCallback, type Ref } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";
import { deleteTransaction, deleteTransactions } from "@/redux/slices/transactions";
import type { GridRowSelectionModel } from "@mui/x-data-grid";

/**
 * Props for the TransactionDeletion component.
 *
 * @interface TransactionDeletionProps
 * @property {Transaction} transaction - The transaction to delete.
 * @property {number} index - The index of the transaction.
 */
interface TransactionDeletionProps {
   transaction: Transaction;
   index: number;
}

/**
 * The message for the TransactionDeletion component.
 */
const message = "Are you sure you want to delete this transaction? This action cannot be undone.";

/**
 * The message for the BulkTransactionDeletion component.
 */
const bulkMessage = "Are you sure you want to delete these transactions? This action cannot be undone.";

/**
 * The TransactionDeletion component for confirming transaction deletion.
 *
 * @param {TransactionDeletionProps} props - The props for the TransactionDeletion component.
 * @returns {React.ReactNode} The TransactionDeletion component.
 */
export function TransactionDeletion({ transaction, index }: TransactionDeletionProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = useCallback(async() => {
      try {
         // Submit the delete request to the API
         const result = await sendApiRequest<number>(
            `dashboard/transactions/${transaction.transaction_id}`, "DELETE", undefined, dispatch, navigate
         );

         // Delete the transaction from the Redux store
         if (result === 204) {
            dispatch(deleteTransaction({ index }));
         }
      } catch (error) {
         console.error("Failed to delete transaction:", error);
      }
   }, [dispatch, navigate, transaction.transaction_id, index]);

   return (
      <Confirmation
         message = { message }
         onConfirmation = { onSubmit }
         size = "sm"
         type = "icon"
      />
   );
}


/**
 * Props for the BulkTransactionDeletion component.
 *
 * @interface BulkTransactionDeletionProps
 * @extends {TransactionDeletionProps} - Inherits the props from the TransactionDeletion component
 * @property {Ref<GridRowSelectionModel>} selectedRows - The selected rows reference.
 */
interface BulkTransactionDeletionProps {
   selectedRows: Ref<GridRowSelectionModel>;
}

/**
 * The BulkTransactionDeletion component for confirming bulk transaction deletion.
 *
 * @param {BulkTransactionDeletionProps} props - The props for the BulkTransactionDeletion component.
 * @returns {React.ReactNode} The BulkTransactionDeletion component.
 */
export function BulkTransactionDeletion({ selectedRows }: BulkTransactionDeletionProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = useCallback(async () => {
      // @ts-ignore
      const transactionIds = selectedRows?.current as string[];
      
      try {
         const result = await sendApiRequest<number>(`dashboard/transactions`, "DELETE", { transactionIds }, dispatch, navigate);
         console.log(result);

         if (result === 204) {
            dispatch(deleteTransactions({ transactionIds }));
         }
      } catch (error) {
         console.error("Failed to delete transactions:", error);
      }
   }, [selectedRows]);


   return (
      <Confirmation
         message = { bulkMessage }
         onConfirmation = { onSubmit }
         size = "sm"
         type = "icon"
      />
   );
}
