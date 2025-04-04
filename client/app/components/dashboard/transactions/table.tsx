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
   type GridFilterModel,
   type GridRenderCellParams,
   type GridRowSelectionModel,
   type GridTreeNodeWithRender,
   type GridValidRowModel
} from "@mui/x-data-grid";
import { type Account } from "capital/accounts";
import { type BudgetCategory, type BudgetPeriod, type BudgetType, type OrganizedBudgets } from "capital/budgets";
import type { Transaction } from "capital/transactions";
import { useCallback, useMemo, useRef, type Ref } from "react";
import { useSelector } from "react-redux";

import { TransactionDeletion, BulkTransactionDeletion } from "@/components/dashboard/transactions/delete";
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
         sx={{ fontWeight: "500" }}
         variant="caption"
      >
         {displayCurrency(params.row.amount)}
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
         noWrap={true}
         sx={{ fontWeight: "500", cursor: "pointer" }}
         onClick={openAccountModal}
         color="primary"
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
         sx={{ fontWeight: "500" }}
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
            sx={{ fontWeight: "500" }}
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
   const selectedRows: Ref<GridRowSelectionModel> = useRef([]);
   
   // Filters
   const filterModel: GridFilterModel | undefined = useMemo(() => {
      const isAccountFilter: boolean = filter === "account";

      return filter ? {
         items: [
            {
               field: isAccountFilter ? "account" : "amount",
               operator: isAccountFilter ? "equals" : identifier === "Income" ? ">=" : "<=",
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

   const columns = useMemo<GridColDef<TransactionRowModel>[]>(() => [
      {
         field: "date",
         headerName: "Date",
         minWidth: 140,
         renderCell: RenderDate,
         filterable: true,
         getOptionValue: (params: GridRenderCellParams<TransactionRowModel, string>) => displayDate(params.row.date)
      },
      {
         field: "description",
         headerName: "Description",
         flex: 1,
         minWidth: 300,
         renderCell: RenderDescription
      },
      {
         field: "account",
         headerName: "Account",
         headerAlign: "right",
         align: "right",
         minWidth: 220,
         renderCell: RenderAccountName
      },
      {
         field: "category",
         headerName: "Category",
         headerAlign: "right",
         align: "right",
         minWidth: 255,
         renderCell: RenderCategoryChip
      },
      {
         field: "amount",
         type: "number",
         headerName: "Amount",
         headerAlign: "right",
         align: "right",
         minWidth: 200,
         renderCell: RenderAmount
      },
      {
         field: "actions",
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
                  sx={{ color: "primary.main", pb: 1.5 }}
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
                  sx={{ color: "error.main", pb: 1.5 }}
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
      <>
         <DataGrid
            checkboxSelection={true}
            columns={columns}
            density="compact"
            disableAutosize={true}
            disableColumnResize={true}
            disableRowSelectionOnClick={true}
            filterModel={filterModel}
            getRowId={(row) => row.transaction_id || ""}
            getRowClassName={
               (params) =>
                  params.indexRelativeToCurrentPage % 2 === 0 ? "even" : "odd"
            }
            initialState={
               {
                  pagination: { paginationModel: { pageSize: 20 } }
               }
            }
            pageSizeOptions={[10, 20, 50, 100]}
            rows={rows}
            slotProps={
               {
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
            onRowSelectionModelChange={updateSelectedRows}
            localeText={{
               footerRowSelected: () => (
                  <Stack
                     direction="row"
                     justifyContent="center"
                     alignItems="center"
                     spacing={2}
                     sx = {{ pl: 0.5 }}
                  >
                     <BulkTransactionDeletion
                        selectedRows={selectedRows}
                     />
                  </Stack>
               ),
            }}
            slots={{
               noRowsOverlay: () => noResultsContainer,
               noResultsOverlay: () => noResultsContainer,
            }}
         />
      </>
   );
}