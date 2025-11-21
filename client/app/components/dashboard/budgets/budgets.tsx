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
import { getCurrentDate, months } from "@/lib/dates";
import { selectMonth } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

/**
 * The edit state management type for budget components
 */
type EditState = {
   state: "view" | "edit";
   type: "Income" | "Expenses";
   displayWarning: boolean;
};

/**
 * The props for the Budgets component
 *
 * @interface BudgetsProps
 * @property {Record<string, Record<string, number>>} allocations - Period to budget allocation mapping
 */
interface BudgetsProps {
   allocations: Record<string, Record<string, number>>;
}

/**
 * Main budgets container with navigation controls
 *
 * @param {BudgetsProps} props - The props for the Budgets component
 * @returns {React.ReactNode} The Budgets component
 */
export default function Budgets({ allocations }: BudgetsProps): React.ReactNode {
   const dispatch = useDispatch(), theme = useTheme();
   const period: BudgetPeriod = useSelector((state: RootState) => state.budgets.value.period);
   const [editState, setEditState] = useState<EditState>(
      { state: "view", type: "Income", displayWarning: false }
   );
   // Track dirty fields within various child forms
   const dirtyFields = useRef<Record<string, boolean>>({});

   // Modal open/close handlers
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

   // Budget period navigation handlers
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

   // Update dirty fields for warning display when closing modal
   const updateDirtyFields = useCallback((fields: object, field: string) => {
      if (Object.keys(fields).length > 0) {
         dirtyFields.current[field] = true;
      } else {
         delete dirtyFields.current[field];
      }

      // Clear warning when no dirty fields remain
      if (Object.keys(dirtyFields.current).length === 0 && editState.displayWarning) {
         setEditState((prev) => ({ ...prev, displayWarning: false }));
      }
   }, [editState.displayWarning]);

   return (
      <Box>
         <Stack
            data-testid = "budget-period-display"
            direction = "row"
            sx = { { justifyContent: "space-between", alignItems: "center", textAlign: "center" } }
         >
            <IconButton
               data-testid = "budget-period-previous"
               disabled = { period.year === 1800 }
               onClick = { viewPreviousMonth }
               size = "medium"
               sx = { { color: theme.palette.primary.main } }
            >
               <FontAwesomeIcon icon = { faAnglesLeft } />
            </IconButton>
            <Typography
               data-testid = "budget-period-label"
               fontWeight = "bold"
               variant = "h6"
            >
               { `${months[period.month - 1]} ${period.year}` }
            </Typography>
            <IconButton
               data-testid = "budget-period-next"
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
            sx = { { mt: 3 } }
         >
            <Box data-testid = "budget-section-Income">
               <Budget
                  allocations = { allocations }
                  onEditClick = { () => openModal("Income") }
                  type = "Income"
               />
            </Box>
            <Box data-testid = "budget-section-Expenses">
               <Budget
                  allocations = { allocations }
                  onEditClick = { () => openModal("Expenses") }
                  type = "Expenses"
               />
            </Box>
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