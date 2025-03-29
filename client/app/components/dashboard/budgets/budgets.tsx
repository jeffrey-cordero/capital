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
import { useCallback, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Budget from "@/components/dashboard/budgets/budget";
import BudgetForm from "@/components/dashboard/budgets/form";
import { getCurrentDate, monthAbbreviations } from "@/lib/dates";
import { selectMonth } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

/**
 * Type for managing edit state of budget components
 *
 * @type {EditState}
 */
type EditState = {
   state: "view" | "edit";
   type: "Income" | "Expenses";
   displayWarning: boolean;
};

/**
 * The Budgets component to display the budgets
 *
 * @returns {React.ReactNode} The Budgets component
 */
export default function Budgets(): React.ReactNode {
   const dispatch = useDispatch(), theme = useTheme();
   const [editState, setEditState] = useState<EditState>(
      { state: "view", type: "Income", displayWarning: false }
   );
   const dirtyFields = useRef<Record<string, boolean>>({});
   const period: BudgetPeriod = useSelector((state: RootState) => state.budgets.value.period);

   const openModal = useCallback((type: "Income" | "Expenses") => {
      setEditState({ state: "edit", type, displayWarning: false });
   }, []);

   const closeModal = useCallback((force?: boolean) => {
      if (!force && Object.keys(dirtyFields.current).length > 0) {
         setEditState((prev) => ({ ...prev, displayWarning: true }));
      } else {
         dirtyFields.current = {};
         setEditState((prev) => ({ ...prev, state: "view", displayWarning: false }));
      }
   }, []);

   const viewPreviousMonth = useCallback(() => {
      dispatch(selectMonth({ direction: "previous" }));
   }, [dispatch]);

   const viewNextMonth = useCallback(() => {
      dispatch(selectMonth({ direction: "next" }));
   }, [dispatch]);

   // Prevent selecting future budget periods
   const today = useMemo(() => getCurrentDate(), []);
   const selectNextMonthDisabled = useMemo(() => {
      return period.month === today.getUTCMonth() + 1 && period.year === today.getUTCFullYear();
   }, [period.month, period.year, today]);

   // Update dirty fields within child form's to check during before we close the modal
   const updateDirtyFields = useCallback((fields: object, field: string) => {
      if (Object.keys(fields).length > 0) {
         dirtyFields.current[field] = true;
      } else {
         delete dirtyFields.current[field];
      }

      if (Object.keys(dirtyFields.current).length === 0 && editState.displayWarning) {
         setEditState((prev) => ({ ...prev, displayWarning: false }));
      }
   }, [editState.displayWarning]);

   return (
      <Box>
         <Stack
            direction = "row"
            sx = { { justifyContent: "space-between", alignItems: "center" } }
         >
            <IconButton
               disabled = { period.year === 1800 }
               onClick = { viewPreviousMonth }
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
               disabled = { selectNextMonthDisabled }
               onClick = { viewNextMonth }
               size = "medium"
               sx = { { color: theme.palette.primary.main } }
            >
               <FontAwesomeIcon icon = { faAnglesRight } />
            </IconButton>
         </Stack>
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
         <BudgetForm
            displayWarning = { editState.displayWarning }
            onClose = { closeModal }
            open = { editState.state === "edit" }
            type = { editState.type }
            updateDirtyFields = { updateDirtyFields }
         />
      </Box>
   );
}