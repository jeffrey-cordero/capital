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
 * Props for the Transactions component
 *
 * @property {string} filter - Filter to apply to transactions (account or budget)
 * @property {string} identifier - Identifier for the applied filter
 */
interface TransactionProps {
   filter?: "account" | "budget";
   identifier?: string;
}

/**
 * Type for managing transaction form edit state
 */
type EditState = {
   state: "view" | "create" | "edit";
   index?: number;
};

/**
 * Displays transactions with filtering capabilities and form for creation/editing
 *
 * @param {TransactionProps} props - The Transactions component props
 * @returns {React.ReactNode} Transactions component
 */
export default function Transactions({ filter, identifier }: TransactionProps): React.ReactNode {
   const [editState, setEditState] = useState<EditState>({ state: "view" });

   // Generate context-aware testid for the add button to avoid duplicates
   const addButtonTestId = useMemo(() => {
      return filter ? `transactions-add-button-${filter}` : "transactions-add-button";
   }, [filter]);

   // Modal open/close handlers
   const openModal = useCallback((index?: number) => {
      setEditState({ state: index === undefined ? "create" : "edit", index });
   }, []);

   const closeModal = useCallback(() => {
      setEditState({ state: "view", index: undefined });
   }, []);

   // Fetch the transaction based on the current edit state index
   const transaction = useSelector((state: RootState) => {
      return editState.index !== undefined ? state.transactions.value[editState.index] : undefined;
   });

   // Memoize the account ID to account mappings for child components
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const accountsMap: Record<string, Account> = useMemo(() => {
      return accounts.reduce((acc: Record<string, Account>, record) => {
         acc[record.account_id || ""] = record;

         return acc;
      }, {} as Record<string, Account>);
   }, [accounts]);

   // Memoize the budget category ID to budget type mappings for child components
   const budgets: OrganizedBudgets = useSelector((state: RootState) => state.budgets.value);
   const budgetsMap: Record<string, BudgetType> = useMemo(() => {
      return Object.values(budgets).reduce((acc: Record<string, BudgetType>, record: OrganizedBudget) => {
         if (!record.budget_category_id) {
            // Ignore the budget period value
            return acc;
         }

         const type: BudgetType = record.budget_category_id === budgets.Income.budget_category_id ? "Income" : "Expenses";

         // Map the main and sub budget categories to the respective budget type
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
                  data-testid = { addButtonTestId }
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