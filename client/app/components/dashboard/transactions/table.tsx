import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Chip,
   Stack,
   Tooltip,
   Typography
} from "@mui/material";
import {
   DataGrid,
   GridActionsCellItem,
   type GridColDef,
   type GridRenderCellParams,
   type GridRowSelectionModel,
   type GridTreeNodeWithRender,
   type GridValidRowModel
} from "@mui/x-data-grid";
import { type Account } from "capital/accounts";
import { type BudgetCategory, type BudgetPeriod, type BudgetType, type OrganizedBudgets } from "capital/budgets";
import type { Transaction } from "capital/transactions";
import { type Ref, useCallback, useMemo, useRef } from "react";
import { useSelector } from "react-redux";

import { BulkTransactionDeletion, TransactionDeletion } from "@/components/dashboard/transactions/delete";
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
   balance?: number;
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
         color={color}
         label={categoryName || categoryType}
         size="small"
         variant="filled"
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
         color={color}
         sx={{ fontWeight: "600", fontSize: "0.85rem" }}
         variant="caption"
      >
         { displayCurrency(params.row.amount) }
      </Typography>
   );
}

/**
 * Renders the balance for a given account following a transaction.
 *
 * @param {GridRenderCellParams<TransactionRowModel, number>} params - The parameters for the grid render cell.
 * @returns {React.ReactNode} The rendered balance.
 */
function RenderBalance(params: GridRenderCellParams<TransactionRowModel, number>): React.ReactNode {
   return (
      <Typography
         color="primary.default"
         sx={{ fontWeight: "600", fontSize: "0.85rem" }}
         variant="caption"
      >
         <Tooltip
            placement="top-start"
            title={`Previous: ${displayCurrency((params.row.balance || 0) - params.row.amount)}`}
         >
            <span>
               {displayCurrency((params.row.balance || 0))}
            </span>
         </Tooltip>
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
   const openAccountModal = useCallback(() => {
      document.getElementById(params.row.account_id || "")?.click();
   }, [params.row.account_id]);

   return (
      <Typography
         color="primary"
         noWrap={true}
         onClick={openAccountModal}
         sx={{ fontWeight: "500", cursor: "pointer", fontSize: "0.85rem" }}
         variant="caption"
      >
         {params.row.account}
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
         sx={{ fontWeight: "500", fontSize: "0.85rem" }}
         variant="caption"
      >
         {displayDate(params.row.date)}
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
         placement="top-start"
         title={params.row.description || ""}
      >
         <Typography
            noWrap={true}
            sx={{ fontWeight: "500", fontSize: "0.85rem" }}
            variant="caption"
         >
            {params.row.description}
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
   const selectedRows: Ref<GridRowSelectionModel> = useRef<GridRowSelectionModel>([]);

   // Data grid rows
   const rows: TransactionRowModel[] = useMemo(() => {
      const balances: Record<string, number> = Object.values(accountsMap).reduce((acc, account) => {
         acc[account.account_id || ""] = Number(account.balance);

         return acc;
      }, {} as Record<string, number>);

      return transactions.reduce((acc, record, index) => {
         const categoryInfo = getCategoryInfo(budgets, record.budget_category_id, record.amount >= 0 ? "Income" : "Expenses");

         const transaction: TransactionRowModel = {
            ...record,
            index,
            id: record.transaction_id || "",
            account: accountsMap[record.account_id ?? ""]?.name || "",
            category: categoryInfo?.name || "",
            balance: balances[record.account_id || ""] || undefined,
            type: categoryInfo?.type || (record.amount >= 0 ? "Income" : "Expenses")
         };

         if (record.account_id && balances[record.account_id]) {
            balances[record.account_id] -= record.amount;
         }

         switch (filter) {
            case "account": {
               // Match transactions by account ID
               if (record.account_id === identifier) {
                  acc.push(transaction);
               }

               break;
            }
            case "budget": {
               // Match transactions within the budget period
               const [year, month] = transaction.date.split("T")[0].split("-");
               const isValidType = transaction.amount >= 0 && identifier === "Income" || transaction.amount < 0 && identifier === "Expenses";

               if (isValidType && parseInt(year) === period.year && parseInt(month) === period.month) {
                  acc.push(transaction);
               }

               break;
            }
            default: {
               acc.push(transaction);
            }
         }

         return acc;
      }, [] as TransactionRowModel[]);
   }, [transactions, accountsMap, budgets, filter, identifier, period]);

   const columns = useMemo<GridColDef<TransactionRowModel>[]>(() => [
      {
         field: "date",
         headerName: "Date",
         minWidth: 140,
         renderCell: RenderDate,
         filterable: true
      },
      {
         field: "description",
         headerName: "Description",
         flex: 1,
         minWidth: 250,
         renderCell: RenderDescription
      },
      {
         field: "account",
         headerName: "Account",
         minWidth: 220,
         renderCell: RenderAccountName
      },
      {
         field: "category",
         headerName: "Category",
         minWidth: 255,
         renderCell: RenderCategoryChip,
         columnMenuProps: {
            flexDirection: "row"
         }
      },
      {
         field: "amount",
         type: "number",
         headerName: "Amount",
         minWidth: 200,
         renderCell: RenderAmount
      },
      {
         field: "balance",
         type: "number",
         headerName: "Balance",
         minWidth: 200,
         filterable: false,
         sortable: false,
         renderCell: RenderBalance
      },
      {
         field: "Actions",
         headerName: "",
         align: "center",
         minWidth: 120,
         sortable: false,
         renderCell: (params: GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>) => [
            (
               <GridActionsCellItem
                  className="primary"
                  disableRipple={true}
                  icon={
                     <FontAwesomeIcon
                        icon={faPenToSquare}
                        size="sm"
                     />
                  }
                  key={`edit-${params.row.index}`}
                  label="Edit"
                  onClick={() => onEdit(params.row.index)}
                  sx={{ color: "primary.main", pb: 0.8 }}
               />
            ),
            (
               <GridActionsCellItem
                  className="error"
                  disableRipple={true}
                  icon={
                     <TransactionDeletion
                        index={params.row.index}
                        transaction={params.row}
                     />
                  }
                  key={`delete-${params.row.index}`}
                  label="Delete"
                  sx={{ color: "error.main" }}
               />
            )
         ]
      }
   ], [onEdit]);

   const updateSelectedRows = useCallback((rows: GridRowSelectionModel) => {
      selectedRows.current = rows;
   }, []);

   const noResultsContainer: React.ReactNode = useMemo(() => {
      return (
         <Box
            sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", width: "100%", fontWeight: "bold" }}
         >
            No available transactions
         </Box>
      );
   }, []);

   return (
      <DataGrid
         checkboxSelection={true}
         columns={columns}
         columnVisibilityModel={{ balance: filter === "account" }}
         density="standard"
         disableColumnResize={true}
         disableRowSelectionOnClick={true}
         getRowClassName={
            (params) =>
               params.indexRelativeToCurrentPage % 2 === 0 ? "even" : "odd"
         }
         getRowId={(row) => row.transaction_id || ""}
         initialState={
            {
               pagination: { paginationModel: { pageSize: 25 } }
            }
         }
         localeText={
            {
               footerRowSelected: () => (
                  <Stack
                     alignItems="center"
                     direction="row"
                     justifyContent="center"
                     spacing={2}
                     sx={{ pl: 0.2, visibility: "visible" }}
                  >
                     <BulkTransactionDeletion
                        selectedRows={selectedRows as any}
                     />
                  </Stack>
               )
            }
         }
         onRowSelectionModelChange={updateSelectedRows}
         pageSizeOptions={[10, 25, 50, 100]}
         rows={rows}
         slotProps={
            {
               baseCheckbox: {
                  disableRipple: true
               },
               filterPanel: {
                  filterFormProps: {
                     logicOperatorInputProps: {
                        variant: "outlined",
                        size: "small"
                     },
                     columnInputProps: {
                        variant: "outlined",
                        size: "small",
                        sx: { mt: "auto" }
                     },
                     operatorInputProps: {
                        variant: "outlined",
                        size: "small",
                        sx: { mt: "auto" }
                     },
                     valueInputProps: {
                        InputComponentProps: {
                           variant: "outlined",
                           size: "small"
                        }
                     }
                  }
               }
            }
         }
         slots={
            {
               noRowsOverlay: () => noResultsContainer,
               noResultsOverlay: () => noResultsContainer
            }
         }
      />
   );
}