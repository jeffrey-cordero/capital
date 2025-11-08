import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Chip, Stack, Typography } from "@mui/material";
import { GridActionsCellItem, type GridRenderCellParams, type GridTreeNodeWithRender } from "@mui/x-data-grid";
import { type Account } from "capital/accounts";
import { type BudgetCategory, type BudgetType } from "capital/budgets";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import { TransactionDeletion } from "@/components/dashboard/transactions/delete";
import type { TransactionRowModel } from "@/components/dashboard/transactions/table";
import { displayCurrency, displayDate } from "@/lib/display";
import type { RootState } from "@/redux/store";

/**
 * Props for text column rendering
 *
 * @property {GridRenderCellParams<TransactionRowModel, number>} params - DataGrid cell parameters
 * @property {"amount" | "balance" | "date" | "description"} type - Type of column to render
 */
interface RenderTextColumnProps {
   params: GridRenderCellParams<TransactionRowModel, number>;
   type: "amount" | "balance" | "date" | "description";
}

/**
 * Renders formatted text column based on type
 *
 * @param {RenderTextColumnProps} props - The RenderTextColumn component props
 * @returns {React.ReactNode} Formatted text display
 */
export function RenderTextColumn({ params, type }: RenderTextColumnProps): React.ReactNode {
   let value: any;
   let color: string = "";

   switch (type) {
      case "amount": {
         color = params.row.type === "Income" ? "primary.main" : "error.main";
         value = displayCurrency(params.row.amount);
         break;
      }
      case "balance": {
         value = displayCurrency(params.row.balance || 0);
         break;
      }
      case "date": {
         value = displayDate(params.row.date);
         break;
      }
      case "description": {
         value = params.row.description || "";
         break;
      }
      default: {
         value = null;
         break;
      }
   }

   return (
      <Typography
         color = { color }
         sx = { { fontWeight: "550", fontSize: "0.85rem" } }
         variant = "caption"
      >
         { value }
      </Typography>
   );
}

/**
 * Renders account chip with account name
 *
 * @param {{account_id: string}} props - Account ID to display
 * @returns {React.ReactNode} Account chip component
 */
export function RenderAccountChip({ account_id }: { account_id: string }): React.ReactNode {
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const account: Account | undefined = useMemo(() => {
      return accounts.find((a) => a.account_id === account_id);
   }, [accounts, account_id]);

   return (
      account ? (
         <Chip
            color = "primary"
            label = { account?.name || "" }
            size = "small"
            sx = { { m: "0 !important" } }
            variant = "filled"
         />
      ) : null
   );
}

/**
 * Renders category chip with appropriate color
 *
 * @param {{budget_category_id: string, type: BudgetType}} props - Budget category ID and type props
 * @returns {React.ReactNode} Category chip component
 */
export function RenderCategoryChip({ budget_category_id, type }: { budget_category_id: string, type: BudgetType }): React.ReactNode {
   const budgets = useSelector((state: RootState) => state.budgets.value);
   const budgetCategory: BudgetCategory | undefined = useMemo(() => {
      return budgets[type].categories.find((c) => {
         return c.budget_category_id === budget_category_id;
      });
   }, [budgets, budget_category_id, type]);

   const label: string = budgetCategory?.name || type;
   const color: "success" | "error" = type === "Income" ? "success" : "error";

   return (
      <Chip
         color = { color }
         label = { label }
         size = "small"
         sx = { { m: "0 !important" } }
         variant = "filled"
      />
   );
}

/**
 * Props for actions column rendering
 *
 * @property {GridRenderCellParams<TransactionRowModel>} params - DataGrid cell parameters
 * @property {(index: number) => void} onEdit - Callback for edit action
 */
interface RenderActionsColumnProps {
   params: GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>;
   onEdit: (index: number) => void;
}

/**
 * Renders edit and delete actions for transactions
 *
 * @param {RenderActionsColumnProps} props - The RenderActionsColumn component props
 * @returns {React.ReactNode} Actions column content
 */
export function RenderActionsColumn({ params, onEdit }: RenderActionsColumnProps): React.ReactNode {
   return (
      <Stack
         direction = "row"
         sx = { { height: "100%", justifyContent: "center", alignItems: "center" } }
      >
         <GridActionsCellItem
            className = "primary"
            disableRipple = { true }
            icon = {
               <FontAwesomeIcon
                  icon = { faPenToSquare }
                  size = "sm"
                  style = { { fontSize: "1.1rem", cursor: "pointer" } }
               />
            }
            key = { `edit-${params.row.index}` }
            label = "Edit"
            onClick = { () => onEdit(params.row.index) }
            sx = { { color: "primary.main", pb: 0.9 } }
         />
         <GridActionsCellItem
            className = "error"
            disableRipple = { true }
            icon = {
               <TransactionDeletion
                  index = { params.row.index }
                  transaction = { params.row }
               />
            }
            key = { `delete-${params.row.index}` }
            label = "Delete"
            sx = { { color: "error.main" } }
         />
      </Stack>
   );
}