import { faList, faTable } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Stack,
   ToggleButton,
   ToggleButtonGroup,
   useTheme
} from "@mui/material";
import {
   DataGrid,
   type GridColDef,
   type GridFilterInputMultipleValueProps,
   type GridFilterItem,
   type GridPaginationModel,
   type GridRenderCellParams,
   type GridRowSelectionModel,
   type GridTreeNodeWithRender,
   type GridValidRowModel
} from "@mui/x-data-grid";
import { type Account } from "capital/accounts";
import { type BudgetPeriod, type BudgetType, type OrganizedBudgets } from "capital/budgets";
import type { Transaction } from "capital/transactions";
import {
   type Ref,
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState
} from "react";
import { useSelector } from "react-redux";

import { TransactionCard } from "@/components/dashboard/transactions/card";
import { BulkTransactionDeletion } from "@/components/dashboard/transactions/delete";
import { filterTransactions, TransactionFilter } from "@/components/dashboard/transactions/filter";
import { RenderAccountChip, RenderActionsColumn, RenderCategoryChip, RenderTextColumn } from "@/components/dashboard/transactions/render";
import { normalizeDate } from "@/lib/dates";
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
export type TransactionRowModel = GridValidRowModel & Transaction & {
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
 * The TransactionsTable component.
 *
 * @param {TransactionsTableProps} props - The props for the TransactionsTable component.
 * @returns {React.ReactNode} The rendered TransactionsTable component.
 */
export default function TransactionsTable({ accountsMap, onEdit, filter, identifier }: TransactionsTableProps): React.ReactNode {
   const theme = useTheme();
   const budgets: OrganizedBudgets & { period: BudgetPeriod } = useSelector((state: RootState) => state.budgets.value);
   const transactions: Transaction[] = useSelector((state: RootState) => state.transactions.value);
   const [view, setView] = useState<"table" | "stack">("table");

   // Data grid container references
   const dataGridRef: Ref<any> = useRef<any>(null);
   const selectedRows: Ref<GridRowSelectionModel> = useRef<GridRowSelectionModel>([]);
   const pageSize: Ref<number> = useRef<number>(25);

   useEffect(() => {
      setView(window.localStorage.getItem("view") === "table" ? "table" : "stack");
      pageSize.current = Number(window.localStorage.getItem("pageSize")) || 25;
   }, []);

   // Data grid rows
   const rows: TransactionRowModel[] = useMemo(() => {
      return filterTransactions(transactions, accountsMap, budgets, filter, identifier);
   }, [transactions, accountsMap, budgets, filter, identifier]);

   // Components for the table view
   const columns = useMemo<GridColDef<TransactionRowModel>[]>(() => {
      const visible: GridColDef<TransactionRowModel>[] = [{
         field: "date",
         headerName: "Date",
         type: "date",
         minWidth: 140,
         flex: 1,
         headerAlign: "left",
         valueGetter: (value: string) => normalizeDate(value.split("T")[0]),
         filterable: true,
         renderCell: (params: GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>) => (
            <RenderTextColumn
               params = { params }
               type = "date"
            />
         )
      },
      {
         field: "description",
         headerName: "Description",
         type: "string",
         flex: 1,
         minWidth: 250,
         headerAlign: "left",
         renderCell: (params: GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>) => (
            <RenderTextColumn
               params = { params }
               type = "description"
            />
         )
      },
      {
         field: "account",
         headerName: "Account",
         flex: 1,
         minWidth: 270,
         headerAlign: "left",
         renderCell: (params: GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>) => (
            <RenderAccountChip
               account_id = { params.row.account_id || "" }
            />
         ),
         valueFormatter: (_value: never, row: TransactionRowModel) => row.account_id,
         valueGetter: (_value: never, row: TransactionRowModel) => row.account_id,
         getApplyQuickFilterFn: () => {
            return ({ value, row }) => {
               return value === "all" || value === row?.account_id;
            };
         },
         filterOperators: [{
            label: "includes",
            value: "includes",
            getApplyFilterFn: (filterItem: GridFilterItem) => {
               const selected = filterItem.value;

               return (item: string) => {
                  if (Array.isArray(selected)) {
                     return selected.length === 0 || (selected.length === 1 && selected[0] === "all") || selected.includes(item);
                  }

                  return true;
               };
            },
            InputComponent: (props: GridFilterInputMultipleValueProps) => {
               return <TransactionFilter
                  props = { props }
                  type = "Account"
               />;
            }
         }]
      },
      {
         field: "category",
         headerName: "Category",
         headerAlign: "left",
         minWidth: 255,
         flex: 1,
         renderCell: (params: GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>) => (
            <RenderCategoryChip
               budget_category_id = { params.row.budget_category_id || "" }
            />
         ),
         valueFormatter: (_value: never, row: TransactionRowModel) => row.budget_category_id,
         valueGetter: (_value: never, row: TransactionRowModel) => row.budget_category_id,
         getApplyQuickFilterFn: () => {
            return ({ value, row }) => {
               return value === "all" || value === row?.budget_category_id;
            };
         },
         filterOperators: [{
            label: "includes",
            value: "includes",
            getApplyFilterFn: (filterItem: GridFilterItem) => {
               const selected = filterItem.value;

               return (item: string) => {
                  if (Array.isArray(selected)) {
                     return selected.length === 0 || (selected.length === 1 && selected[0] === "all") || selected.includes(item);
                  }

                  return true;
               };
            },
            InputComponent: (props: GridFilterInputMultipleValueProps) => {
               return <TransactionFilter
                  props = { props }
                  type = "Category"
               />;
            }
         }]
      },
      {
         field: "amount",
         type: "number",
         headerAlign: "left",
         align: "left",
         headerName: "Amount",
         minWidth: 200,
         flex: 1,
         renderCell: (params: GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>) => (
            <RenderTextColumn
               params = { params }
               type = "amount"
            />
         )
      }];

      // Potential balance column for the specific account view
      if (filter === "account") {
         visible.push({
            field: "balance",
            type: "number",
            align: "left",
            headerAlign: "left",
            headerName: "Balance",
            minWidth: 200,
            flex: 1,
            filterable: false,
            sortable: false,
            renderCell: (params: GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>) => (
               <RenderTextColumn
                  params = { params }
                  type = "balance"
               />
            )
         });
      }

      // Actions column
      visible.push({
         field: "Actions",
         headerName: "",
         align: "center",
         width: 100,
         minWidth: 100,
         sortable: false,
         flex: 0.2,
         renderCell: (params: GridRenderCellParams<TransactionRowModel, any, any, GridTreeNodeWithRender>) => (
            <RenderActionsColumn
               onEdit = { onEdit }
               params = { params }
            />
         )
      });

      return visible;
   }, [onEdit, filter]);

   // Component for the stack view
   const cards: GridColDef<TransactionRowModel>[] = useMemo(() => [{
      field: "card",
      headerName: "",
      flex: 1,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<TransactionRowModel>) => (
         <Box sx = { { width: "100%", height: "100%" } }>
            <TransactionCard
               onEdit = { onEdit }
               pageSize = { Math.min(pageSize.current || Number(window.localStorage.getItem("pageSize")) || 25, transactions.length) }
               transaction = { params.row }
            />
         </Box>
      )
   }
   ], [onEdit, transactions.length]);

   const updateSelectedRows = useCallback((rows: GridRowSelectionModel) => {
      selectedRows.current = rows;
   }, []);

   const updatePageSize = useCallback((details: GridPaginationModel) => {
      if (details.pageSize !== pageSize.current) {
         pageSize.current = details.pageSize;
         window.localStorage.setItem("pageSize", details.pageSize.toString());

         // Scroll to the top of the table
         document.getElementById(`transactions-table-${filter}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
   }, [filter]);

   const noResultsContainer: React.ReactNode = useMemo(() => {
      return (
         <Box
            sx = { { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", width: "100%", fontWeight: "bold" } }
         >
            No available transactions
         </Box>
      );
   }, []);

   const changeView = useCallback((_event: React.MouseEvent<HTMLElement>, value: "table" | "stack") => {
      // Update the local state and storage for preferred transaction view
      setView((prev) => {
         const update: "table" | "stack" = value || prev;
         window.localStorage.setItem("view", update);

         // Reset the horizontal virtual scrollbar position as list view get's cut off
         dataGridRef.current?.scroll({ top: 0, left: 0 });

         return update;
      });
   }, []);

   return (
      <Box
         id = { `transactions-table-${filter}` }
         sx = { { width: "100%" } }
      >
         <Box sx = { { display: "flex", justifyContent: "flex-end", mb: 1 } }>
            <ToggleButtonGroup
               exclusive = { true }
               onChange = { changeView }
               size = "medium"
               value = { view }
            >
               <ToggleButton
                  aria-label = "Table view"
                  disableRipple = { true }
                  value = "table"
               >
                  <FontAwesomeIcon
                     fixedWidth = { true }
                     icon = { faTable }
                     style = { { color: view === "table" ? "hsl(210deg 98% 48%)" : "inherit" } }
                  />
               </ToggleButton>
               <ToggleButton
                  aria-label = "Stack view"
                  disableRipple = { true }
                  value = "stack"
               >
                  <FontAwesomeIcon
                     fixedWidth = { true }
                     icon = { faList }
                     style = { { color: view === "stack" ? "hsl(210deg 98% 48%)" : "inherit" } }
                  />
               </ToggleButton>
            </ToggleButtonGroup>
         </Box>
         <DataGrid
            apiRef = { dataGridRef }
            checkboxSelection = { view === "table" }
            columns = { view === "table" ? columns : cards }
            density = "standard"
            disableColumnResize = { true }
            disableRowSelectionOnClick = { true }
            getRowClassName = {
               (params) =>
                  params.indexRelativeToCurrentPage % 2 === 0 ? "even" : "odd"
            }
            getRowHeight = { () => view === "table" ? undefined : "auto" }
            getRowId = { (row) => row.transaction_id || "" }
            initialState = {
               {
                  pagination: { paginationModel: { pageSize: Number(window.localStorage.getItem("pageSize")) || 25 } }
               }
            }
            localeText = {
               {
                  footerRowSelected: () => (
                     <Stack
                        alignItems = "center"
                        direction = "row"
                        justifyContent = "center"
                        spacing = { 2 }
                        sx = { { pl: 0.2, visibility: view === "table" ? "visible" : "hidden" } }
                     >
                        <BulkTransactionDeletion
                           selectedRows = { selectedRows as any }
                        />
                     </Stack>
                  )
               }
            }
            onPaginationModelChange = { updatePageSize }
            onRowDoubleClick = { (params) => view === "table" ? onEdit(params.row.index) : null }
            onRowSelectionModelChange = { updateSelectedRows }
            pageSizeOptions = { [10, 25, 50, 100] }
            rows = { rows }
            slotProps = {
               {
                  baseCheckbox: {
                     disableRipple: true
                  },

                  columnsManagement: {
                     searchInputProps: {
                        variant: "outlined",
                        size: "small",
                        placeholder: ""
                     },
                     disableShowHideToggle: true
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
                              placeholder: "",
                              autoFocus: true,
                              size: "small"
                           },
                           sx: {
                              colorScheme: theme.palette.mode === "dark" ? "dark" : "inherit"
                           }
                        }
                     }
                  },
                  panel: { placement: "top-start" }
               }
            }
            slots = {
               {
                  columnHeaders: view === "stack" ? () => null : undefined,
                  noRowsOverlay: () => noResultsContainer,
                  noResultsOverlay: () => noResultsContainer
               }
            }
            sx = {
               view === "stack" ? {
                  boxShadow: 2,
                  "& .MuiDataGrid-row": {
                     minWidth: "100% !important"
                  },
                  "& .MuiDataGrid-cell": {
                     minWidth: "100% !important",
                     padding: "0px",
                     border: "none"
                  },
                  ".css-13d6lok-MuiPaper-root-MuiCard-root": {
                     margin: "0px"
                  },
                  ".MuiDataGrid-scrollbar--vertical": {
                     display: "none"
                  },
                  ".MuiDataGrid-scrollbarFiller": {
                     width: "0px",
                     height: "0px"
                  }
               } : {
                  boxShadow: 2
               }
            }
         />
      </Box>
   );
}