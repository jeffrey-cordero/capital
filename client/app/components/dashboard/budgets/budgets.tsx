import { faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   IconButton,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { type BudgetPeriod } from "capital/budgets";
import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Budget from "@/components/dashboard/budgets/budget";
import BudgetForm from "@/components/dashboard/budgets/form";
import { getCurrentDate, monthAbbreviations } from "@/lib/dates";
import { selectMonth } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

// Type for managing edit state of budget components
type EditState = { state: "view" | "edit", type: "Income" | "Expenses", displayWarning: boolean };

export default function Budgets() {
   const dispatch = useDispatch(), theme = useTheme();
   const [editState, setEditState] = useState<EditState>(
      { state: "view", type: "Income", displayWarning: false }
   );

   // Get current period from Redux store
   const period: BudgetPeriod = useSelector((state: RootState) => state.budgets.value.period);

   // Get current date for validating period selections
   const today = useMemo(() => getCurrentDate(), []);

   // Determine if next month button should be disabled
   const nextMonthDisabled = useMemo(() =>
      period.month === today.getUTCMonth() + 1 && period.year === today.getUTCFullYear(),
   [period.month, period.year, today]);

   // Handler for opening the budget editing modal
   const openModal = useCallback((type: "Income" | "Expenses") => {
      setEditState({ state: "edit", displayWarning: false, type });
   }, []);

   // Handler for closing the budget editing modal
   const closeModal = useCallback((force?: boolean) => {
      const containsDirtyInput = !!document.querySelector("[data-dirty=\"true\"]");

      if (!force && containsDirtyInput) {
         // Show warning if there are unsaved changes
         setEditState((prev) => ({ ...prev, displayWarning: true }));
      } else {
         // Close modal if forced or no unsaved changes
         setEditState((prev) => ({ ...prev, state: "view", displayWarning: false }));
      }
   }, []);

   // Handlers for month navigation
   const handlePreviousMonth = useCallback(() => {
      dispatch(selectMonth({ direction: "previous" }));
   }, [dispatch]);

   const handleNextMonth = useCallback(() => {
      dispatch(selectMonth({ direction: "next" }));
   }, [dispatch]);

   return (
      <Box>
         { /* Month and year selection buttons */ }
         <Stack
            direction = "row"
            sx = { { justifyContent: "space-between", alignItems: "center" } }
         >
            <IconButton
               disabled = { period.year === 1800 }
               onClick = { handlePreviousMonth }
               size = "medium"
               sx = { { color: theme.palette.primary.main } }
            >
               <FontAwesomeIcon icon = { faAnglesLeft } />
            </IconButton>
            <Typography
               fontWeight = "bold"
               variant = "h6"
            >
               { `${monthAbbreviations[period.month - 1]} ${period.year}` }
            </Typography>
            <IconButton
               disabled = { nextMonthDisabled }
               onClick = { handleNextMonth }
               size = "medium"
               sx = { { color: theme.palette.primary.main } }
            >
               <FontAwesomeIcon icon = { faAnglesRight } />
            </IconButton>
         </Stack>
         { /* Income and expenses sections */ }
         <Stack
            direction = "column"
            spacing = { 4 }
            sx = { { mt: 2 } }
         >
            <Budget
               onEditClick = { () => openModal("Income") }
               type = "Income"
            />
            <Budget
               onEditClick = { () => openModal("Expenses") }
               type = "Expenses"
            />
         </Stack>
         { /* Modal for editing budgets */ }
         <BudgetForm
            displayWarning = { editState.displayWarning }
            onClose = { closeModal }
            open = { editState.state === "edit" }
            type = { editState.type }
         />
      </Box>
   );
}