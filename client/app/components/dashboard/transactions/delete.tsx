import { type Transaction } from "capital/transactions";
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";
import { deleteTransaction } from "@/redux/slices/transactions";

/**
 * Props for the TransactionDeletion component.
 *
 * @interface TransactionDeletionProps
 * @property {Transaction} transaction - The transaction to delete.
 * @property {number} index - The index of the transaction.
 * @property {() => void} onClose - The function to call when the modal is closed.
 */
interface TransactionDeletionProps {
   transaction: Transaction;
   index: number;
   onClose: () => void;
}

/**
 * The message for the TransactionDeletion component.
 */
const message = "Are you sure you want to delete this transaction? This action cannot be undone.";

/**
 * The TransactionDeletion component for confirming transaction deletion.
 *
 * @param {TransactionDeletionProps} props - The props for the TransactionDeletion component.
 * @returns {React.ReactNode} The TransactionDeletion component.
 */
export default function TransactionDeletion({ transaction, index, onClose }: TransactionDeletionProps): React.ReactNode {
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
            onClose();
         }
      } catch (error) {
         console.error("Failed to delete transaction:", error);
         onClose();
      }
   }, [dispatch, navigate, transaction.transaction_id, index, onClose]);

   return (
      <Confirmation
         message = { message }
         onConfirmation = { onSubmit }
         size = "sm"
         type = "icon"
      />
   );
}