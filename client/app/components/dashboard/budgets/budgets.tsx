import { faAnglesLeft, faAnglesRight, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { type BudgetCategory, type BudgetGoals, type OrganizedBudgets } from "capital/budgets";
import { useCallback, useState } from "react";

import { months, today } from "@/lib/dates";
import { Modal } from "@/components/global/modal";
import Budget from "@/components/dashboard/budgets/budget";

// Component to render a budget category (Income or Expenses) with its progress bar
interface BudgetCategoryProps {
   type: "Income" | "Expenses";
   data: {
      goals: BudgetGoals[];
      budget_category_id: string;
      categories: Array<BudgetCategory & { goals: BudgetGoals[] }> | null; // null for subcategories
   };
   onEditClick: () => void;
}
export default function Budgets({ budgets }: { budgets: OrganizedBudgets }) {
   const theme = useTheme();
   const [state, setState] = useState<"view" | "edit">("view");

   // Track current month and year for infinite stepping
   const [currentDate, setCurrentDate] = useState(() => {
      return { month: today.getUTCMonth(), year: today.getUTCFullYear() };
   });

   // Helper function to format the current month/year display
   const formatCurrentPeriod = useCallback(() => {
      return `${months[currentDate.month]} ${currentDate.year}`;
   }, [currentDate]);

   // Navigate to previous month
   const selectPreviousMonth = useCallback(() => {
      setCurrentDate(prev => {
         const newMonth = prev.month === 0 ? 11 : prev.month - 1;
         const newYear = prev.month === 0 ? prev.year - 1 : prev.year;
         return { month: newMonth, year: newYear };
      });
   }, []);

   // Navigate to next month
   const selectNextMonth = useCallback(() => {
      setCurrentDate(prev => {
         const newMonth = prev.month === 11 ? 0 : prev.month + 1;
         const newYear = prev.month === 11 ? prev.year + 1 : prev.year;
         return { month: newMonth, year: newYear };
      });
   }, []);

   // Handle edit button click
   const handleEditClick = useCallback(() => {
      setState("edit");
      // This would open a modal for editing the budget
      // TODO: Implement budget edit modal
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
               onClick = { selectPreviousMonth }
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
               onClick = { selectNextMonth }
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
            <Budget type = "Income" data = { budgets.Income } onEditClick = { handleEditClick } />
            <Budget type = "Expenses" data = { budgets.Expenses } onEditClick = { handleEditClick } />
         </Stack>

         { /* TODO: Add budget edit modal component here */ }
         <Modal
            open = { state === "edit" }
            onClose = { () => setState("view") }
         >
            <Box>
               <Typography variant = "h6">Edit Budget</Typography>
            </Box>
         </Modal>
      </Box>
   );
}