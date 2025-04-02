import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Chip,
   Tooltip,
   Typography
} from "@mui/material";
import {
   DataGrid,
   GridActionsCellItem,
   type GridColDef,
   type GridFilterModel,
   type GridRenderCellParams,
   type GridRowParams,
   type GridValidRowModel
} from "@mui/x-data-grid";
import { type Account } from "capital/accounts";
import { type BudgetCategory, type BudgetPeriod, type BudgetType, type OrganizedBudgets } from "capital/budgets";
import type { Transaction } from "capital/transactions";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import TransactionDeletion from "@/components/dashboard/transactions/delete";
import { displayCurrency, displayDate } from "@/lib/display";
import type { RootState } from "@/redux/store";

/**
 * The row model type for the DataGrid component.
 *
 * @type {TransactionRowModel}
 * @extends {GridValidRowModel & Transaction} - Inherits from GridValidRowModel and Transaction attributes
 * @property {string} id - The ID of the transaction.
 * @property {string} account - The name of the account.
 * @property {string} category - The name of the category.
 * @property {BudgetType} type - The type of the category (Income or Expenses)
 * @property {number} index - The index of the transaction.
 */
type TransactionRowModel = GridValidRowModel & Transaction & {
   id: string;
   account: string;
   category: string;
   type: BudgetType;
   index: number;
};

/**
 * Props for the TransactionsTable component.
 *
 * @interface TransactionsTableProps
 * @property {string} filter - The filter to apply to the table.
 * @property {string} identifier - The identifier to filter the table by.
 * @property {Record<string, Account>} accountsMap - The mapping of accounts IDs to accounts.
 * @property {(index: number) => void} onEdit - The callback to edit a transaction based on index.
 */
interface TransactionsTableProps {
   filter: "account" | "budget" | undefined;
   identifier: string | undefined;
   accountsMap: Record<string, Account>;
   onEdit: (_index: number) => void;
}

/**
 * Gets the category information for a given category ID.
 *
 * @param {OrganizedBudgets} budgets - The organized budgets.
 * @param {string | null | undefined} categoryId - The ID of the category.
 * @param {BudgetType} type - The type of the category (Income or Expenses)
 * @returns {Object | null} The category information.
 */
const getCategoryInfo = (budgets: OrganizedBudgets, categoryId: string | null | undefined, type: BudgetType): { name: string; type: BudgetType } | null => {
   if (!categoryId) return null;

   const category: BudgetCategory | null = budgets[type].categories.find(c => c.budget_category_id === categoryId) || null;

   // Missing based on invalid category ID or deleted category
   return category ? { name: category.name || "", type: type } : null;
};

/**
 * Renders the category chip for a given transaction.
 *
 * @param {GridRenderCellParams<TransactionRowModel, string>} params - The parameters for the grid render cell.
 * @returns {React.ReactNode} The rendered category chip.
 */
function RenderCategoryChip(params: GridRenderCellParams<TransactionRowModel, string>): React.ReactNode {
   const categoryType: string = params.row.type;
   const categoryName: string = params.row.category;
   const color: "success" | "error" = categoryType === "Income" ? "success" : "error";

   return (
      <Chip
         color = { color }
         label = { categoryName || categoryType }
         size = "small"
         variant = "filled"
      />
   );
}

/**
 * Renders the amount for a given transaction.
 *
 * @param {GridRenderCellParams<TransactionRowModel, number>} params - The parameters for the grid render cell.
 * @returns {React.ReactNode} The rendered amount.
 */
function RenderAmount(params: GridRenderCellParams<TransactionRowModel, number>): React.ReactNode {
   const color: string = params.row.amount > 0 ? "primary.main" : "error.main";

   return (
      <Typography
         color = { color }
         sx = { { fontWeight: "bold" } }
         variant = "caption"
      >
         { displayCurrency(params.row.amount) }
      </Typography>
   );
}

/**
 * Renders the account name for a given transaction.
 *
 * @param {GridRenderCellParams<TransactionRowModel, string>} params - The parameters for the grid render cell.
 * @returns {React.ReactNode} The rendered account name.
 */
function RenderAccountName(params: GridRenderCellParams<TransactionRowModel, string>): React.ReactNode {
   return (
      <Typography
         noWrap = { true }
         variant = "caption"
      >
         { params.row.account }
      </Typography>
   );
}

/**
 * Renders the date for a given transaction.
 *
 * @param {GridRenderCellParams<TransactionRowModel, string>} params - The parameters for the grid render cell.
 * @returns {React.ReactNode} The rendered date.
 */
function RenderDate(params: GridRenderCellParams<TransactionRowModel, string>): React.ReactNode {
   return (
      <Typography
         variant = "caption"
      >
         { displayDate(params.row.date) }
      </Typography>
   );
}

/**
 * Renders the description for a given transaction with a tooltip for user accessibility.
 *
 * @param {GridRenderCellParams<TransactionRowModel, string | undefined | null>} params - The parameters for the grid render cell.
 * @returns {React.ReactNode} The rendered description.
 */
function RenderDescription(params: GridRenderCellParams<TransactionRowModel, string | undefined | null>): React.ReactNode {
   return (
      <Tooltip
         placement = "bottom-start"
         title = { params.row.description || "" }
      >
         <Typography
            noWrap = { true }
            variant = "caption"
         >
            { params.row.description }
         </Typography>
      </Tooltip>
   );
}

/**
 * The TransactionsTable component.
 *
 * @param {TransactionsTableProps} props - The props for the TransactionsTable component.
 * @returns {React.ReactNode} The rendered TransactionsTable component.
 */
export default function TransactionsTable({ accountsMap, onEdit, filter, identifier }: TransactionsTableProps): React.ReactNode {
   const budgets: OrganizedBudgets & { period: BudgetPeriod } = useSelector((state: RootState) => state.budgets.value);
   const period: BudgetPeriod = budgets.period;
   const transactions: Transaction[] = useSelector((state: RootState) => state.transactions.value);

   // Filters
   const filterModel: GridFilterModel | undefined = useMemo(() => {
      const isAccountFilter: boolean = filter === "account";

      return filter ? {
         items: [
            {
               field: isAccountFilter ? "accountName" : "amount",
               operator: isAccountFilter ? "contains" : identifier === "Income" ? ">=" : "<",
               value: isAccountFilter ? identifier : 0
            }
         ]
      } : undefined;
   }, [filter, identifier]);

   // Data grid rows
   const rows: TransactionRowModel[] = useMemo(() => {
      return transactions.map((transaction, index) => {
         const categoryInfo = getCategoryInfo(budgets, transaction.budget_category_id, transaction.amount >= 0 ? "Income" : "Expenses");

         return {
            ...transaction,
            index,
            id: transaction.transaction_id || "",
            account: accountsMap[transaction.account_id ?? ""]?.name || "",
            category: categoryInfo?.name || "",
            type: categoryInfo?.type || (transaction.amount >= 0 ? "Income" : "Expenses")
         };
      });
   }, [transactions, accountsMap, budgets]);

   // Data grid columns
   const columns: GridColDef<TransactionRowModel>[] = useMemo(() => [
      { field: "title", headerName: "Title", flex: 1.2, minWidth: 120, filterable: !filter },
      { field: "date", headerName: "Date", flex: 0.6, minWidth: 95, filterable: !filter, renderCell: RenderDate },
      { field: "description", headerName: "Description", flex: 1.5, minWidth: 150, filterable: !filter, renderCell: RenderDescription },
      { field: "accountName", headerName: "Account", flex: 1, minWidth: 100, filterable: !filter, renderCell: RenderAccountName },
      { field: "categoryName", headerName: "Category", flex: 1, minWidth: 110, maxWidth: 140, filterable: !filter, renderCell: RenderCategoryChip },
      { field: "amount", headerName: "Amount", type: "number", flex: 0.7, minWidth: 90, align: "right", headerAlign: "right", filterable: !filter, renderCell: RenderAmount },
      {
         field: "actions", type: "actions", headerName: "", width: 80, align: "center", getActions: (params: GridRowParams<TransactionRowModel>) => [
            (
               <GridActionsCellItem
                  className = "primary"
                  disableRipple = { true }
                  icon = {
                     <FontAwesomeIcon
                        icon = { faPenToSquare }
                        size = "sm"
                     />
                  }
                  key = { `edit-${params.row.index}` }
                  label = "Edit"
                  onClick = { () => onEdit(params.row.index) }
                  sx = { { color: "primary.main" } }
               />
            ),
            (
               <GridActionsCellItem
                  className = "error"
                  disableRipple = { true }
                  icon = {
                     <TransactionDeletion
                        index = { params.row.index }
                        onClose = { () => {} }
                        transaction = { params.row }
                     />
                  }
                  key = { `delete-${params.row.index}` }
                  label = "Delete"
                  sx = { { color: "error.main" } }
               />
            )
         ]
      }
   ], [onEdit, filter]);

   const noResultsContainer: React.ReactNode = useMemo(() => {
      return (
         <Box
            sx = {{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", width: "100%", fontWeight: "bold" }}
         >
            No transactions found
         </Box>
      )
   }, []);

   return (
      <DataGrid
         columns = { columns }
         density = "standard"
         disableRowSelectionOnClick = { true }
         filterModel = { filterModel }
         getRowClassName = { (params) => params.indexRelativeToCurrentPage % 2 === 0 ? "even" : "odd" }
         getRowId = { (row) => row.id }
         initialState = { { pagination: { paginationModel: { pageSize: 15 } }, sorting: { sortModel: [{ field: "date", sort: "desc" }] } } }
         pageSizeOptions = { [10, 15, 25, 50, 100] }
         rows = { rows }
         slots = {{
            noRowsOverlay: () => noResultsContainer,
            noResultsOverlay: () => noResultsContainer
         }}
      />
   );
}