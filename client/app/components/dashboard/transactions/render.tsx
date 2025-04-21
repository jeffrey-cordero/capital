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
 * Props for the RenderTextColumn component.
 *
 * @interface RenderTextColumnProps
 * @property {GridRenderCellParams<TransactionRowModel, number>} params - The parameters for the grid render cell.
 * @property {"amount" | "balance" | "date" | "description"} type - The type of the column to render.
 */
interface RenderTextColumnProps {
   params: GridRenderCellParams<TransactionRowModel, number>;
   type: "amount" | "balance" | "date" | "description";
}

/**
 * Renders a general text column for a given transaction.
 *
 * @param {RenderTextColumnProps} props - The props for the grid render cell.
 * @returns {React.ReactNode} The rendered column.
 */
export function RenderTextColumn({ params, type }: RenderTextColumnProps): React.ReactNode {
   let value: any;
   let color: string = "";

   switch (type) {
      case "amount": {
         color = params.row.amount > 0 ? "primary.main" : "";
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
         sx = { { fontWeight: "650", fontSize: "0.85rem" } }
         variant = "caption"
      >
         { value }
      </Typography>
   );
}

/**
 * Renders the account chip for a given transaction.
 *
 * @param {{account_id: string}} params - The account ID for the grid render cell.
 * @returns {React.ReactNode} The rendered account chip.
 */
export function RenderAccountChip({ account_id }: { account_id: string }): React.ReactNode {
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const account: Account | undefined = useMemo(() => {
      return accounts.find((account) => account.account_id === account_id);
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
 * Renders the category chip for a given transaction.
 *
 * @param { {budget_category_id: string} } params - The budget category ID for the grid render cell.
 * @returns {React.ReactNode} The rendered category chip.
 */
export function RenderCategoryChip({ budget_category_id, type }: { budget_category_id: string, type: BudgetType }): React.ReactNode {
   const budgets = useSelector((state: RootState) => state.budgets.value);
   const category: BudgetCategory | undefined = useMemo(() => {
      return budgets[type].categories.find((c) => {
         return c.budget_category_id === budget_category_id;
      });
   }, [budgets, budget_category_id, type]);

   const color: "success" | "error" = type === "Income" ? "success" : "error";
   const label: string = category?.name || type;

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
 * Props for the RenderActionsColumn component.
 *
 * @interface RenderActionsColumnProps
 * @property {GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>} params - The parameters for the grid render cell.
 * @property {(_index: number) => void} onEdit - The function to call when the edit button is clicked.
 */
interface RenderActionsColumnProps {
   params: GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>;
   onEdit: (_index: number) => void;
}

/**
 * Renders the actions column for a given transaction.
 *
 * @param {RenderActionsColumnProps} props - The props for the grid render cell.
 * @returns {React.ReactNode} The rendered actions column.
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