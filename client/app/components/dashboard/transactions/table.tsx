import { faPenToSquare, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Chip,
   IconButton,
   Stack,
   Typography,
   useMediaQuery,
   useTheme
} from "@mui/material";
import {
   DataGrid,
   type GridCellParams,
   type GridColDef,
   type GridRowsProp,
   type GridTreeNodeWithRender
} from "@mui/x-data-grid";

import { displayCurrency, displayDate } from "@/lib/display";

type Transaction = {
   id: number;
   title: string;
   amount: number;
   date: string;
   description: string;
   account?: string;
   category?: string;
}

function RenderTransactionActions(params: GridCellParams<Transaction, any, any, GridTreeNodeWithRender>): React.ReactNode {
   return (
      <Stack
         direction = "row"
         spacing = { 1 }
         sx = { { pt: 0.5 } }
      >
         <IconButton
            data-transaction-id = { params.id }
            size = "medium"
         >
            <FontAwesomeIcon
               className = "primary"
               icon = { faPenToSquare }
               size = "xs"
            />
         </IconButton>
         <IconButton
            data-transaction-id = { params.id }
            size = "medium"
         >
            <FontAwesomeIcon
               className = "error"
               icon = { faTrash }
               size = "xs"
            />
         </IconButton>
      </Stack>
   );
}

function RenderTransactionCategory(params: GridCellParams<Transaction, any, any, GridTreeNodeWithRender>): React.ReactNode {
   const type: "Income" | "Expenses" = params.row.amount > 0 ? "Income" : "Expenses";
   const color: "success" | "error" = params.row.amount > 0 ? "success" : "error";

   return (
      <Chip
         color = { color }
         label = { params.value || type }
         size = "small"
      />
   );
}

function RenderTransactionAmount(params: GridCellParams<Transaction, any, any, GridTreeNodeWithRender>): React.ReactNode {
   const color: "primary" | "error" = params.row.amount > 0 ? "primary" : "error";

   return (
      <Typography
         color = { color }
         sx = { { fontWeight: "semibold", pt: 2 } }
         variant = "body2"
      >
         { displayCurrency(params.value) }
      </Typography>
   );
}

const columns: GridColDef<Transaction>[] = [
   { field: "title", headerName: "Title", flex: 1, minWidth: 100 },
   {
      field: "amount", headerName: "Amount", flex: 0.5, minWidth: 80, align: "right", headerAlign: "right", renderCell: (params) => (
         <RenderTransactionAmount { ...params } />
      )
   },
   {
      field: "date", headerName: "Date", flex: 0.5, minWidth: 90, valueFormatter: (value: string | null | undefined) => {
         if (value == null) return "";

         return displayDate(value);
      }
   },
   { field: "description", headerName: "Description", flex: 1.5, minWidth: 150 },
   { field: "account", headerName: "Account", flex: 1, minWidth: 100 },
   {
      field: "category", headerName: "Category", flex: 1, minWidth: 100, renderCell: (params) => (
         <RenderTransactionCategory { ...params } />
      )
   },
   {
      field: "actions", headerName: "Actions", sortable: false, filterable: false, disableColumnMenu: true, width: 90, renderCell: (params) => (
         <RenderTransactionActions { ...params } />
      )
   }
];

const rows: GridRowsProp<Transaction> = [
   {
      id: 1,
      title: "Salary Deposit",
      amount: 3500.00,
      date: "2025-03-01",
      description: "Monthly salary payment"
   }, {
      id: 2,
      title: "Grocery Shopping",
      amount: -125.67,
      date: "2025-02-28",
      description: "Weekly grocery run",
      account: "Checking Account",
      category: "Groceries"
   }, {
      id: 3,
      title: "Dinner Out",
      amount: -50.00,
      date: "2025-02-27",
      description: "Dinner with friends",
      account: "Credit Card"
   }, {
      id: 4,
      title: "Amazon Purchase",
      amount: -100.00,
      date: "2025-02-26",
      description: "Online shopping",
      account: "Credit Card",
      category: "Shopping"
   }, {
      id: 5,
      title: "Gasoline",
      amount: -30.00,
      date: "2025-02-25",
      description: "Fuel for commute",
      account: "Credit Card"
   }
];

export default function TransactionsTable(): React.ReactNode {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

   return (
      <DataGrid
         checkboxSelection = { true }
         columns = { columns }
         density = "standard"
         disableColumnResize = { true }
         disableRowSelectionOnClick = { true }
         getRowClassName = {
            (params) =>
               params.indexRelativeToCurrentPage % 2 === 0 ? "even" : "odd"
         }
         initialState = {
            {
               pagination: { paginationModel: { pageSize: 20 } }
            }
         }
         pageSizeOptions = { [10, 20, 50] }
         rows = { rows }
         slotProps = {
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
      />
   );
}