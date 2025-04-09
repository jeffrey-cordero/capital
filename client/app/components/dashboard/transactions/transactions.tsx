import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button } from "@mui/material";
import type { Account } from "capital/accounts";
import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import TransactionForm from "@/components/dashboard/transactions/form";
import TransactionsTable from "@/components/dashboard/transactions/table";
import { type RootState } from "@/redux/store";
/**
 * Define the props for the Transactions component
 *
 * @interface TransactionProps
 * @property {string} filter - The filter to apply to the transactions
 * @property {string} identifier - The identifier to apply to the transactions
 */
interface TransactionProps {
   filter?: "account" | "budget";
   identifier?: string;
}

/**
 * Type for managing edit state of the transaction form
 *
 * @type {EditState}
 */
type EditState = {
   state: "view" | "create" | "edit";
   index?: number;
};

/**
 * The Transactions component to display the transactions table and form.
 *
 * @param {TransactionProps} props - The props for the Transactions component
 * @returns {React.ReactNode} The Transactions component
 */
export default function Transactions({ filter, identifier }: TransactionProps): React.ReactNode {
   const [editState, setEditState] = useState<EditState>({ state: "view" });

   // Transaction form modal handlers
   const openModal = useCallback((index?: number) => {
      setEditState({ state: index === undefined ? "create" : "edit", index });
   }, []);

   const closeModal = useCallback(() => {
      setEditState({ state: "view", index: undefined });
   }, []);

   // Fetch the transaction based on the index
   const transaction = useSelector((state: RootState) => {
      return editState.index !== undefined ? state.transactions.value[editState.index] : undefined;
   });

   // Memoize the account mappings
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const accountsMap = useMemo(() => {
      return accounts.reduce((acc: Record<string, Account>, record) => {
         acc[record.account_id || ""] = record;

         return acc;
      }, {});
   }, [accounts]);

   return (
      <Box sx = { { textAlign: "center" } }>
         <Box sx = { { mt: 2 } }>
            <TransactionsTable
               accountsMap = { accountsMap }
               filter = { filter }
               identifier = { identifier }
               onEdit = { openModal }
            />
            <Box sx = { { mt: 5 } }>
               <Button
                  className = "btn-primary"
                  color = "primary"
                  onClick = { () => openModal() }
                  startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
                  variant = "contained"
               >
                  Add Transaction
               </Button>
               <TransactionForm
                  accountsMap = { accountsMap }
                  filter = { filter }
                  identifier = { identifier }
                  index = { editState.index ?? 0 }
                  onClose = { closeModal }
                  open = { editState.state !== "view" }
                  transaction = { transaction }
               />
            </Box>
         </Box>
      </Box>
   );
}