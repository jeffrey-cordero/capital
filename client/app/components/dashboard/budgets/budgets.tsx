import { faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Stack, Typography } from "@mui/material";
import { type OrganizedBudgets } from "capital/budgets";
import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Budget from "@/components/dashboard/budgets/budget";
import BudgetForm from "@/components/dashboard/budgets/form";
import { months } from "@/lib/dates";
import { selectMonth } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

export default function Budgets({ budgets }: { budgets: OrganizedBudgets }) {
   const dispatch = useDispatch();
   const [editState, setEditState] = useState<{ state: "view" | "edit", type: "Income" | "Expenses" }>({
      state: "view",
      type: "Income"
   });
   const { period } = useSelector(
      (state: RootState) => state.budgets.value
   ) as  { period: { month: number, year: number } };

   // Helper function to format the current month/year display
   const formatCurrentPeriod = useCallback(() => {
      return `${months[period.month - 1]} ${period.year}`;
   }, [period]);

   // Handle edit button click
   const handleEditClick = useCallback((type: "Income" | "Expenses") => {
      setEditState({
         state: "edit",
         type
      });
   }, []);

   const closeModal = useCallback(() => {
      setEditState(prev => ({
         ...prev,
         state: "view"
      }));
   }, []);

   return (
      <Box>
         { /* Month and year selector */ }
         <Stack
            direction = "row"
            sx = { { justifyContent: "space-between", alignItems: "center" } }
         >
            <FontAwesomeIcon
               className = "primary"
               icon = { faAnglesLeft }
               onClick = { () => dispatch(selectMonth({ direction: "previous" })) }
               size = "xl"
               style = { { cursor: "pointer" } }
            />
            <Typography
               fontWeight = "bold"
               variant = "h6"
            >
               { formatCurrentPeriod() }
            </Typography>
            <FontAwesomeIcon
               className = "primary"
               icon = { faAnglesRight }
               onClick = { () => dispatch(selectMonth({ direction: "next" })) }
               size = "xl"
               style = { { cursor: "pointer" } }
            />
         </Stack>
         { /* Income section with main category and subcategories */ }
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

         { /* Budget edit modal */ }
         <BudgetForm
            budget = { budgets[editState.type] }
            onClose = { closeModal }
            open = { editState.state === "edit" }
            type = { editState.type }
         />
      </Box>
   );
}