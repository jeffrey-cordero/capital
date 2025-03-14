import { faAnglesLeft, faAnglesRight, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   LinearProgress,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { type BudgetCategory, type BudgetGoals } from "capital/budgets";

import { displayCurrency } from "@/lib/display";

// Component to render a budget category (Income or Expenses) with its progress bar
interface BudgetCategoryProps {
   type: "Income" | "Expenses";
   data: {
      goals: BudgetGoals[];
      budget_category_id: string;
      categories?: Array<BudgetCategory & { goals: BudgetGoals[] }>; // null for subcategories
   };
   onEditClick: () => void;
}

// Helper function to calculate progress percentage
const calculateProgress = (current: number, goal: number): number => {
   if (goal <= 0) return 0;

   const progress = (current / goal) * 100;
   return Math.min(progress, 100); // Cap at 100%
};

function BudgetCategoryList({ type, data, onEditClick }: BudgetCategoryProps) {
   const theme = useTheme();
   // For demo purposes, using 0 as current value - this should be replaced with actual data
   const currentAmount = 0;
   const goalAmount = data.goals[0]?.goal || 0;
   const progress = calculateProgress(currentAmount, goalAmount);

   // Determine color based on category type
   const color = type === "Income" ? "success" : "error";

   return (
      <Stack
         direction = "column"
         spacing = { 0.5 }
         sx = { { pl: !data.categories ? 4 : 0 } }
      >
         <Stack
            direction = "row"
            sx = { { justifyContent: "space-between" } }
         >
            <Stack
               direction = "row"
               spacing = { 1 }
               sx = { { alignItems: "center" } }
            >
               <Typography variant = "h6">
                  { type }
               </Typography>
               <FontAwesomeIcon
                  className = "primary"
                  icon = { faPenToSquare }
                  onClick = { onEditClick }
                  size = "lg"
                  style = { { cursor: "pointer" } }
               />
            </Stack>
            <Typography variant = "h6">
               { displayCurrency(currentAmount) } / { displayCurrency(goalAmount) }
            </Typography>
         </Stack>
         <LinearProgress
            color = { color }
            sx = {
               {
                  height: "1.5rem",
                  borderRadius: "12px"
               }
            }
            value = { progress }
            variant = "determinate"
         />
      </Stack>
   );
}

// Component to render a single budget category with its progress bar
export default function Budget({ type, data, onEditClick }: BudgetCategoryProps) {
   return (
      <Stack>
         <BudgetCategoryList type = { type } data = { data } onEditClick = { onEditClick } />
         {
            data.categories && (
               <Stack direction = "column" spacing = { 2 } sx = {{ mt: 2 }}>
                  {
                     data.categories.map((category) => (
                        <BudgetCategoryList
                           key = { category.budget_category_id }
                           type = { type }
                           data = { category }
                           onEditClick = { onEditClick }
                        />
                     ))
                  }
               </Stack>
            )
         }
      </Stack>
   );
}
