import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Typography } from "@mui/material";
import { useCallback, useState } from "react";
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
      setEditState({ state: "view" });
   }, []);

   // Fetch the transaction based on the index
   const transaction = useSelector((state: RootState) => {
      return editState.index ? state.transactions.value[editState.index] : undefined;
   });

   console.log(transaction);

   return (
      <Box sx = { { textAlign: "center" } }>
         <Box sx = { { mt: 2 } }>
            <Typography
               fontWeight = "bold"
               variant = "body1"
            >
               Coming Soon
            </Typography>
            <Typography
               fontWeight = "bold"
               variant = "body1"
            >
               { filter } { identifier }
            </Typography>
         </Box>
         <Box sx = { { mt: 2 } }>
            <TransactionsTable
               closeModal = { closeModal }
               filter = { filter }
               identifier = { identifier }
               openModal = { openModal }
            />
            <Box sx = { { mt: 6 } }>
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
                  onClose = { closeModal }
                  open = { editState.state !== "view" }
                  transaction = { transaction }
               />
            </Box>
         </Box>
      </Box>
   );
}