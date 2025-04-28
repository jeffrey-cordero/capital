import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Card,
   CardContent,
   Divider,
   Stack,
   Typography,
   useTheme
} from "@mui/material";

import { TransactionDeletion } from "@/components/dashboard/transactions/delete";
import { RenderAccountChip, RenderCategoryChip } from "@/components/dashboard/transactions/render";
import type { TransactionRowModel } from "@/components/dashboard/transactions/table";
import { displayCurrency, displayDate } from "@/lib/display";

/**
 * Props for the TransactionCard component
 *
 * @property {TransactionRowModel} transaction - Transaction to display
 * @property {(_index: number) => void} onEdit - Callback for editing a transaction
 * @property {number | null} pageSize - Page size of the transactions table
 */
interface TransactionCardProps {
   transaction: TransactionRowModel;
   onEdit: (_index: number) => void;
   pageSize: number | null;
}

/**
 * Card display for individual transactions in list view
 *
 * @param {TransactionCardProps} props - The TransactionCard component props
 * @returns {React.ReactNode} Rendered transaction card
 */
export function TransactionCard({ transaction, onEdit, pageSize }: TransactionCardProps): React.ReactNode {
   const theme = useTheme();
   const color: string = transaction.amount > 0 ? "primary.main" : "";

   return (
      <Card
         sx = { { width: "100%", height: "100%", border: "none", borderRadius: "0px", backgroundColor: theme.palette.mode === "dark" ? "#2B2B2B" : "#FFFFFF" } }
         variant = "outlined"
      >
         <CardContent sx = { { p: 2 } }>
            <Stack
               direction = "column"
               rowGap = { 1 }
               sx = { { alignItems: "flex-start", direction: "row", textAlign: "left", justifyContent: "flex-start", alignContent: "center" } }
            >
               <Stack
                  direction = "row"
                  rowGap = { 1 }
                  sx = { { flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", width: "100%" } }
               >
                  <Typography
                     color = "text.secondary"
                     sx = { { fontSize: "0.8rem", fontWeight: "650", pl: 0.5 } }
                     variant = "body1"
                  >
                     { displayDate(transaction.date) }
                  </Typography>
                  <RenderCategoryChip
                     budget_category_id = { transaction.budget_category_id || "" }
                     type = { transaction.type }
                  />
               </Stack>
               <Stack
                  direction = "row"
                  rowGap = { 1 }
                  sx = { { flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", width: "100%", m: "0px !important" } }
               >
                  <Typography
                     color = { color }
                     sx = { { fontWeight: "650", fontSize: "0.9rem", pl: 0.25 } }
                     variant = "subtitle1"
                  >
                     { displayCurrency(transaction.amount) }
                  </Typography>
                  <Box>
                     <RenderAccountChip
                        account_id = { transaction.account_id || "" }
                     />
                  </Box>
               </Stack>
               <Stack
                  direction = "row"
                  spacing = { 0.5 }
                  sx = { { flexWrap: "nowrap", justifyContent: "space-between", alignItems: "flex-start", width: "100%", m: "0px !important" } }
               >
                  <Typography
                     sx = { { fontWeight: "550", wordBreak: "break-word", m: "0px !important", maxWidth: "calc(100% - 5rem)", pl: 0.5 } }
                     variant = "body1"
                  >
                     { transaction.description || "No Description" }
                  </Typography>
                  <Stack
                     direction = "row"
                     spacing = { 1 }
                     sx = { { justifyContent: "flex-start", alignItems: "center", pr: 0.5 } }
                  >
                     <FontAwesomeIcon
                        className = "primary"
                        icon = { faPenToSquare }
                        onClick = { () => onEdit(transaction.index) }
                        style = { { fontSize: "1.1rem", cursor: "pointer" } }
                     />
                     <Box sx = { { pt: 0.4 } }>
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