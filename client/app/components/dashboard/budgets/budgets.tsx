import { faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   IconButton,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { type OrganizedBudgets } from "capital/budgets";
import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Budget from "@/components/dashboard/budgets/budget";
import BudgetForm from "@/components/dashboard/budgets/form";
import { getCurrentDate, months } from "@/lib/dates";
import { selectMonth } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

export default function Budgets({ budgets }: { budgets: OrganizedBudgets }) {
   const dispatch = useDispatch(), theme = useTheme();
   const [editState, setEditState] = useState<{ state: "view" | "edit", type: "Income" | "Expenses" }>({
      state: "view",
      type: "Income"
   });
   const today = useMemo(() => getCurrentDate(), []);
   const { period } = useSelector(
      (state: RootState) => state.budgets.value
   ) as  { period: { month: number, year: number } };

   // Prevent future month selections
   const nextMonthDisabled = useMemo(() => {
      return period.month === today.getUTCMonth() + 1 && period.year === today.getUTCFullYear();
   }, [period, today]);

   // Handle edit button click to open the budget modal
   const handleEditClick = useCallback((type: "Income" | "Expenses") => {
      setEditState({
         state: "edit",
         type
      });
   }, []);

   // Close the budget modal
   const closeModal = useCallback(() => {
      setEditState(prev => ({
         ...prev,
         state: "view"
      }));
   }, []);

   return (
      <Box>
         { /* Month and year selection buttons */ }
         <Stack
            direction = "row"
            sx = { { justifyContent: "space-between", alignItems: "center" } }
         >
            <IconButton
               onClick = { () => dispatch(selectMonth({ direction: "previous" })) }
               size = "medium"
               sx = { { color: theme.palette.primary.main } }
            >
               <FontAwesomeIcon
                  icon = { faAnglesLeft }
               />
            </IconButton>
            <Typography
               fontWeight = "bold"
               variant = "h6"
            >
               { `${months[period.month - 1]} ${period.year}` }
            </Typography>
            <IconButton
               disabled = { nextMonthDisabled }
               onClick = { () => dispatch(selectMonth({ direction: "next" })) }
               size = "medium"
               sx = { { color: theme.palette.primary.main } }
            >
               <FontAwesomeIcon
                  icon = { faAnglesRight }
               />
            </IconButton>
         </Stack>
         { /* Income and expenses sections */ }
         <Stack
            direction = "column"
            spacing = { 4 }
            sx = { { mt: 2 } }
         >
            <Budget
               data = { budgets.Income }
               onEditClick = { () => handleEditClick("Income") }
               type = "Income"
            />
            <Budget
               data = { budgets.Expenses }
               onEditClick = { () => handleEditClick("Expenses") }
               type = "Expenses"
            />
         </Stack>
         { /* Modal for editing budgets (Income or Expenses) */ }
         <BudgetForm
            budget = { budgets[editState.type] }
            onClose = { closeModal }
            open = { editState.state === "edit" }
            type = { editState.type }
         />
      </Box>
   );
}