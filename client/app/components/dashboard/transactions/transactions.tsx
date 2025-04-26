import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button } from "@mui/material";
import type { Account } from "capital/accounts";
import type { BudgetCategory, BudgetType, OrganizedBudget, OrganizedBudgets } from "capital/budgets";
import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import TransactionForm from "@/components/dashboard/transactions/form";
import TransactionsTable from "@/components/dashboard/transactions/table";
import { type RootState } from "@/redux/store";

/**
 * Defines the props for the Transactions component
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

   // Memoize the account mappings leveraged by various child components
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);

   const accountsMap: Record<string, Account> = useMemo(() => {
      return accounts.reduce((acc: Record<string, Account>, record) => {
         acc[record.account_id || ""] = record;

         return acc;
      }, {} as Record<string, Account>);
   }, [accounts]);

   // Memoize the budget category mappings leveraged by various child components
   const budgets: OrganizedBudgets = useSelector((state: RootState) => state.budgets.value);
   const budgetsMap: Record<string, BudgetType> = useMemo(() => {
      return Object.values(budgets).reduce((acc: Record<string, BudgetType>, record: OrganizedBudget) => {
         if (!record.budget_category_id) {
            // Budget period values should be ignored
            return acc;
         }

         const type: BudgetType = record.budget_category_id === budgets.Income.budget_category_id ? "Income" : "Expenses";

         acc[record.budget_category_id || ""] = type;
         record.categories.forEach((category: BudgetCategory) => {
            acc[category.budget_category_id || ""] = type;
         });

         return acc;
      }, {} as Record<string, BudgetType>);
   }, [budgets]);

   return (
      <Box sx = { { textAlign: "center" } }>
         <Box sx = { { mt: -1 } }>
            <TransactionsTable
               accountsMap = { accountsMap }
               budgetsMap = { budgetsMap }
               filter = { filter }
               identifier = { identifier }
               onEdit = { openModal }
            />
            <Box sx = { { mt: 3 } }>
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
                  budgetsMap = { budgetsMap }
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