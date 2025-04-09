import { faList, faPenToSquare, faTable } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Card,
   CardContent,
   Chip,
   Divider,
   FormControl,
   InputLabel,
   MenuItem,
   Select,
   type SelectChangeEvent,
   Stack,
   ToggleButton,
   ToggleButtonGroup,
   Tooltip,
   Typography,
   useTheme
} from "@mui/material";
import {
   DataGrid,
   GridActionsCellItem,
   type GridColDef,
   type GridFilterItem,
   type GridPaginationModel,
   type GridRenderCellParams,
   type GridRowSelectionModel,
   type GridTreeNodeWithRender,
   type GridValidRowModel
} from "@mui/x-data-grid";
import { type Account } from "capital/accounts";
import { type BudgetCategory, type BudgetPeriod, type BudgetType, type OrganizedBudgets } from "capital/budgets";
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

import { BulkTransactionDeletion, TransactionDeletion } from "@/components/dashboard/transactions/delete";
import { normalizeDate } from "@/lib/dates";
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
 * @param { {budget_category_id: string} } params - The budget category ID for the grid render cell.
 * @returns {React.ReactNode} The rendered category chip.
 */
export function RenderCategoryChip({ budget_category_id }: { budget_category_id: string }): React.ReactNode {
   const budgets = useSelector((state: RootState) => state.budgets.value);
   const type: BudgetType = budget_category_id === budgets.Income.budget_category_id || budgets.Income.categories.some((c) => {
      return c.budget_category_id === budget_category_id;
   }) ? "Income" : "Expenses";
   const category: BudgetCategory | undefined = budgets[type].categories.find((c) => {
      return c.budget_category_id === budget_category_id;
   });
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
 * Renders the amount for a given transaction.
 *
 * @param {GridRenderCellParams<TransactionRowModel, number>} params - The parameters for the grid render cell.
 * @returns {React.ReactNode} The rendered amount.
 */
function RenderAmount(params: GridRenderCellParams<TransactionRowModel, number>): React.ReactNode {
   const color: string = params.row.amount > 0 ? "primary.main" : "";

   return (
      <Typography
         color = { color }
         sx = { { fontWeight: "625", fontSize: "0.85rem" } }
         variant = "caption"
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
         color = "primary.default"
         sx = { { fontWeight: "625", fontSize: "0.85rem" } }
         variant = "caption"
      >
         <Tooltip
            enterDelay = { 0 }
            placement = "top-start"
            title = { `Previous: ${displayCurrency((params.row.balance || 0) - params.row.amount)}` }
         >
            <span>
               { displayCurrency((params.row.balance || 0)) }
            </span>
         </Tooltip>
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
   const account: Account | undefined = accounts.find((account) => account.account_id === account_id);

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
 * Renders the date for a given transaction.
 *
 * @param {GridRenderCellParams<TransactionRowModel, string>} params - The parameters for the grid render cell.
 * @returns {React.ReactNode} The rendered date.
 */
function RenderDate(params: GridRenderCellParams<TransactionRowModel, string>): React.ReactNode {
   return (
      <Typography
         sx = { { fontWeight: "625", fontSize: "0.85rem" } }
         variant = "caption"
      >
         { displayDate(params.row.date) }
      </Typography>
   );
}

/**
 * Renders the description for a given transaction.
 *
 * @param {GridRenderCellParams<TransactionRowModel, string | undefined | null>} params - The parameters for the grid render cell.
 * @returns {React.ReactNode} The rendered description.
 */
function RenderDescription(params: GridRenderCellParams<TransactionRowModel, string | undefined | null>): React.ReactNode {
   return (
      <Typography
         sx = { { fontWeight: "625", fontSize: "0.85rem" } }
         variant = "caption"
      >
         <Tooltip
            enterDelay = { 0 }
            placement = "top-start"
            title = { params.row.description || "No Description" }
         >
            <span>
               { params.row.description || "No Description" }
            </span>
         </Tooltip>
      </Typography>
   );
}

/**
 * Props for the TransactionCard component.
 *
 * @interface TransactionCardProps
 * @property {TransactionRowModel} transaction - The transaction to render.
 * @property {(_index: number) => void} onEdit - The callback to edit a transaction based on index.
 * @property {number | null} pageSize - The page size of the table.
 */
interface TransactionCardProps {
   transaction: TransactionRowModel;
   onEdit: (_index: number) => void;
   pageSize: number | null;
}

/**
 * Renders a transaction card.
 *
 * @param {TransactionCardProps} props - The props for the TransactionCard component.
 * @returns {React.ReactNode} The rendered TransactionCard component.
 */
function TransactionCard({ transaction, onEdit, pageSize }: TransactionCardProps): React.ReactNode {
   const theme = useTheme();
   const amountColor: string = transaction.amount > 0 ? "primary.main" : "";

   return (
      <Card
         sx = { { width: "100%", height: "100%", border: "none", borderRadius: "0px", backgroundColor: theme.palette.mode === "dark" ? "#2B2B2B" : "#FFFFFF" } }
         variant = "outlined"
      >
         <CardContent sx = { { py: 2, px: 2.5 } }>
            <Stack
               direction = "column"
               rowGap = { 1 }
               sx = { { alignItems: "flex-start", direction: "row", textAlign: "left", justifyContent: "flex-start", alignContent: "center" } }
            >
               <Stack
                  direction = "row"
                  sx = { { flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", width: "100%" } }
               >
                  <Typography
                     color = "text.secondary"
                     sx = { { fontSize: "0.8rem", fontWeight: "625" } }
                     variant = "body1"
                  >
                     { displayDate(transaction.date) }
                  </Typography>
                  <RenderCategoryChip
                     budget_category_id = { transaction.budget_category_id || "" }
                  />
               </Stack>
               <Stack
                  direction = "row"
                  spacing = { 0.5 }
                  sx = { { flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", width: "100%", m: "0px !important" } }
               >
                  <Typography
                     color = { amountColor }
                     sx = { { fontWeight: "625", fontSize: "0.9rem" } }
                     variant = "subtitle1"
                  >
                     { displayCurrency(transaction.amount) }
                  </Typography>
                  <RenderAccountChip
                     account_id = { transaction.account_id || "" }
                  />
               </Stack>
               <Stack
                  direction = "row"
                  spacing = { 0.5 }
                  sx = { { flexWrap: "nowrap", justifyContent: "space-between", alignItems: "flex-start", width: "100%", m: "0px !important" } }
               >
                  <Typography
                     sx = { { fontWeight: "625", wordBreak: "break-word", m: "0px !important", maxWidth: "calc(100% - 5rem)" } }
                     variant = "body1"
                  >
                     { transaction.description || "No Description" }
                  </Typography>
                  <Stack
                     direction = "row"
                     spacing = { 1 }
                     sx = { { justifyContent: "flex-start", alignItems: "flex-start", pr: 0.5 } }
                  >
                     <FontAwesomeIcon
                        className = "primary"
                        icon = { faPenToSquare }
                        onClick = { () => onEdit(transaction.index) }
                        style = { { fontSize: "1.1rem", paddingTop: "1px", cursor: "pointer" } }
                     />
                     <Box sx = { { pt: 0.2 } }>
                        <TransactionDeletion
                           index = { transaction.index }
                           transaction = { transaction }
                        />
                     </Box>
                  </Stack>

               </Stack>

            </Stack>
         </CardContent>
         {
            pageSize !== null && transaction.index !== pageSize - 1 && (
               <Divider sx = { { borderBottomWidth: "1.5px" } } />
            )
         }
      </Card>
   );
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
   const period: BudgetPeriod = budgets.period;
   const transactions: Transaction[] = useSelector((state: RootState) => state.transactions.value);
   const [view, setView] = useState<"table" | "stack">("table");

   // Table-related references
   const dataGridRef: Ref<any> = useRef<any>(null);
   const selectedRows: Ref<GridRowSelectionModel> = useRef<GridRowSelectionModel>([]);
   const pageSize: Ref<number> = useRef<number>(25);

   useEffect(() => {
      setView(window.localStorage.getItem("view") === "table" ? "table" : "stack");
      pageSize.current = Number(window.localStorage.getItem("pageSize")) || 25;
   }, []);

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

   // Components for the table view
   const columns = useMemo<GridColDef<TransactionRowModel>[]>(() => {
      const visible: GridColDef<TransactionRowModel>[] = [{
         field: "date",
         headerName: "Date",
         type: "date",
         minWidth: 140,
         flex: 1,
         headerAlign: "left",
         renderCell: RenderDate,
         valueGetter: (value: string) => normalizeDate(value.split("T")[0]),
         filterable: true
      },
      {
         field: "description",
         headerName: "Description",
         type: "string",
         flex: 1,
         minWidth: 250,
         headerAlign: "left",
         renderCell: RenderDescription
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
            InputComponent: (props: any) => {
               const { item, applyValue } = props;
               const selectedReference = useRef<string[]>(["all"]);

               const updateSelectedAccounts = (event: SelectChangeEvent<string[]>) => {
                  const { value } = event.target;
                  const selected: string[] = Array.isArray(value) ? value : [value];

                  if (selected.length === 1 && selected[0] === "all") {
                     // Pivot to default state
                     selectedReference.current = ["all"];
                  } else {
                     // Remove the "all" from selected options
                     selectedReference.current = selected.filter((v: string) => v !== "all");
                  }

                  applyValue({ ...item, value: selectedReference.current });
               };

               return (
                  <FormControl>
                     <InputLabel
                        htmlFor = "filter-account"
                        shrink = { true }
                        variant = "outlined"
                     >
                        Account
                     </InputLabel>
                     <Select
                        label = "Account"
                        multiple = { true }
                        onChange = { updateSelectedAccounts }
                        renderValue = {
                           (selected: string[]) => {
                              return (
                                 <Stack
                                    columnGap = { 1 }
                                    direction = "row"
                                    rowGap = { 1 }
                                    sx = { { maxWidth: "226px", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "center" } }
                                 >
                                    {
                                       selected.length === 0 ? null : selected.map((value) => {
                                          return value === "all" ? null : (
                                             <RenderAccountChip
                                                account_id = { value }
                                                key = { `selected-${value}` }
                                             />
                                          );
                                       })
                                    }
                                 </Stack>
                              );
                           }
                        }
                        value = { selectedReference.current }
                        variant = "outlined"
                     >
                        <MenuItem
                           key = "filter-all-accounts"
                           sx = { { color: "transparent" } }
                           value = { "all" }
                        >
                           -- Select Account --
                        </MenuItem>
                        {
                           Object.values(accountsMap).map((account) => (
                              <MenuItem
                                 key = { `filter-${account.account_id}` }
                                 value = { account.account_id }
                              >
                                 { account.name }
                              </MenuItem>
                           ))
                        }
                     </Select>
                  </FormControl>
               );
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
            InputComponent: (props: any) => {
               const { item, applyValue } = props;
               const selectedReference = useRef<string[]>(["all"]);

               const updateSelectedCategories = (event: SelectChangeEvent<string[]>) => {
                  const { value } = event.target;
                  const selected: string[] = Array.isArray(value) ? value : [value];

                  if (selected.length === 1 && selected[0] === "all") {
                     // Pivot to default state
                     selectedReference.current = ["all"];
                  } else {
                     // Remove the "all" category from the selected categories
                     selectedReference.current = selected.filter((v: string) => v !== "all");
                  }

                  applyValue({ ...item, value: selectedReference.current });
               };

               return (
                  <FormControl>
                     <InputLabel
                        htmlFor = "filter-category"
                        shrink = { true }
                        variant = "outlined"
                     >
                        Category
                     </InputLabel>
                     <Select
                        label = "Category"
                        multiple = { true }
                        onChange = { updateSelectedCategories }
                        renderValue = {
                           (selected: string[]) => {
                              return (
                                 <Stack
                                    columnGap = { 1 }
                                    direction = "row"
                                    rowGap = { 1 }
                                    sx = { { maxWidth: "226px", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "center" } }
                                 >
                                    {
                                       selected.length === 0 ? null : selected.map((value) => {
                                          return value === "all" ? null : (
                                             <RenderCategoryChip
                                                budget_category_id = { value }
                                                key = { `selected-${value}` }
                                             />
                                          );
                                       })
                                    }
                                 </Stack>
                              );
                           }
                        }
                        slotProps = {
                           {
                              input: {
                                 id: "filter-category"
                              }
                           }
                        }
                        value = { selectedReference.current }
                        variant = "outlined"
                     >
                        <MenuItem
                           key = "filter-all-categories"
                           sx = { { color: "transparent" } }
                           value = { "all" }
                        >
                           -- Select Category --
                        </MenuItem>
                        <MenuItem
                           key = { `filter-${budgets.Income.budget_category_id}` }
                           sx = { { fontWeight: "bold" } }
                           value = { budgets.Income.budget_category_id }
                        >
                           Income
                        </MenuItem>
                        {
                           budgets.Income.categories.map((category) => (
                              <MenuItem
                                 key = { `filter-${category.budget_category_id}` }
                                 sx = { { pl: 3.5 } }
                                 value = { category.budget_category_id }
                              >
                                 { category.name }
                              </MenuItem>
                           ))
                        }
                        <MenuItem
                           key = { `filter-${budgets.Expenses.budget_category_id}` }
                           sx = { { fontWeight: "bold" } }
                           value = { budgets.Expenses.budget_category_id }
                        >
                           Expenses
                        </MenuItem>
                        {
                           budgets.Expenses.categories.map((category) => (
                              <MenuItem
                                 key = { `filter-${category.budget_category_id}` }
                                 sx = { { pl: 3.5 } }
                                 value = { category.budget_category_id }
                              >
                                 { category.name }
                              </MenuItem>
                           ))
                        }
                     </Select>
                  </FormControl>
               );
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
         renderCell: RenderAmount
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
            renderCell: RenderBalance
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
                  sx = { { color: "primary.main", pb: 0.8 } }
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
         )
      });

      return visible;
   }, [onEdit, budgets, filter, accountsMap]);

   // Component for the stack view
   const cardColumn: GridColDef<TransactionRowModel>[] = useMemo(() => [{
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
            columns = { view === "table" ? columns : cardColumn }
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