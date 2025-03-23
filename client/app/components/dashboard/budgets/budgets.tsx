import { faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   IconButton,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { type Period } from "capital/budgets";
import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Budget from "@/components/dashboard/budgets/budget";
import BudgetForm from "@/components/dashboard/budgets/form";
import { getCurrentDate, monthAbbreviations, months } from "@/lib/dates";
import { selectMonth } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

type EditState = { state: "view" | "edit", type: "Income" | "Expenses", displayWarning: boolean };

export default function Budgets() {
   const dispatch = useDispatch(), theme = useTheme();
   const [editState, setEditState] = useState<EditState>(
      { state: "view", type: "Income", displayWarning: false }
   );
   const period: Period = useSelector((state: RootState) => state.budgets.value.period);

   // Prevent future month selections
   const today: Date = useMemo(() => getCurrentDate(), []);
   const nextMonthDisabled = useMemo(() => {
      return period.month === today.getUTCMonth() + 1 && period.year === today.getUTCFullYear();
   }, [period, today]);

   const openModal = useCallback((type: "Income" | "Expenses") => {
      // Handle edit button click to open the budget modal
      setEditState({ state: "edit", displayWarning: false, type });
   }, []);

   const closeModal = (force?: boolean) => {
      const containsDirtyInput = !!document.querySelector('[data-dirty="true"]');

      // Close the budget modal, but only if there are no dirty forms and the request is not forced
      if (!force && containsDirtyInput) {
         setEditState((prev) => ({ ...prev, displayWarning: true }));
      } else {
         setEditState((prev) => ({ ...prev, state: "view" }));
      }
   };

   return (
      <Box>
         { /* Month and year selection buttons */ }
         <Stack
            direction = "row"
            sx = { { justifyContent: "space-between", alignItems: "center" } }
         >
            <IconButton
               disabled = { period.year === 1800 }
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
               { `${monthAbbreviations[period.month - 1]} ${period.year}` }
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
               onEditClick = { () => openModal("Income") }
               type = "Income"
            />
            <Budget
               onEditClick = { () => openModal("Expenses") }
               type = "Expenses"
            />
         </Stack>
         { /* Modal for editing budgets (Income or Expenses) */ }
         <BudgetForm
            displayWarning = { editState.displayWarning }
            onClose = { closeModal }
            open = { editState.state === "edit" }
            type = { editState.type }
         />
      </Box>
   );
}