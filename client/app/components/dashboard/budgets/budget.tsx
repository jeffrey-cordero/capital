import { faCaretDown, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Collapse,
   LinearProgress,
   Stack,
   Typography
} from "@mui/material";
import { type OrganizedBudget } from "capital/budgets";
import { useCallback, useState } from "react";

import { Expand } from "@/components/global/expand";
import { displayCurrency } from "@/lib/display";

interface CategoryItemProps {
   goal: number;
   total: number;
   name: string;
   progress: number;
   type: "Income" | "Expenses";
   color: "success" | "error";
   onEditClick?: () => void;
   isMainCategory?: boolean;
}

// Component to render a single category with its respective progress bar and progress in the current period
function CategoryItem({ name, goal, total, progress, color, onEditClick, isMainCategory = false }: CategoryItemProps) {
   return (
      <Box sx = { { pl: !isMainCategory ? 4 : 0, pr: !isMainCategory ? 6 : 0 } }>
         <Stack
            direction = "row"
            sx = { { justifyContent: "space-between", mb: 1 } }
         >
            <Stack
               direction = "row"
               spacing = { 1 }
               sx = { { alignItems: "center" } }
            >
               <Typography variant = "h6">
                  { name }
               </Typography>
               {
                  onEditClick && (
                     <FontAwesomeIcon
                        className = "primary"
                        icon = { faPenToSquare }
                        onClick = { onEditClick }
                        size = "lg"
                        style = { { cursor: "pointer", zIndex: 1000 } }
                     />
                  )
               }
            </Stack>
            <Typography variant = "h6">
               { displayCurrency(total) } / { displayCurrency(goal) }
            </Typography>
         </Stack>
         <LinearProgress
            color = { color }
            sx = {
               {
                  height: "1.45rem",
                  borderRadius: "12px"
               }
            }
            value = { progress }
            variant = "determinate"
         />
      </Box>
   );
}

interface BudgetCategoryProps {
   type: "Income" | "Expenses";
   data: OrganizedBudget;
   onEditClick: () => void;
}

// Component to render a list of budget categories with their progress bars and potential subcategories
export function BudgetCategory({ type, data, onEditClick }: BudgetCategoryProps) {
   // Calculate the category values
   const goal = data.goals[data.goalIndex].goal;
   const total = Math.random() * goal; // Placeholder until transactions are implemented
   const progress = Math.min((total / goal) * 100, 100);
   const color = type === "Income" ? "success" : "error";

   // State to track expanded/collapsed state of subcategories
   const [isExpanded, setIsExpanded] = useState(true);

   // Toggle expanded state of subcategories
   const toggleExpanded = useCallback(() => {
      setIsExpanded(!isExpanded);
   }, [isExpanded]);

   return (
      <Stack
         direction = "column"
         spacing = { 1 }
      >
         { /* Parent category */ }
         <Stack
            direction = "row"
            spacing = { 1 }
            sx = { { position: "relative" } }
         >
            <Box sx = { { flexGrow: 1 } }>
               <CategoryItem
                  color = { color }
                  goal = { goal }
                  isMainCategory = { true }
                  name = { type }
                  onEditClick = { onEditClick }
                  progress = { progress }
                  total = { total }
                  type = { type }
               />
            </Box>
            <Box sx = { { display: "flex", alignItems: "center", justifyContent: "center", pt: isExpanded ? 3.5 : 3 } }>
               <Expand
                  disableRipple = { true }
                  expand = { isExpanded }
                  onClick = { toggleExpanded }
               >
                  <FontAwesomeIcon
                     icon = { faCaretDown }
                     size = "xl"
                  />
               </Expand>
            </Box>
         </Stack>
         { /* Child categories */ }
         <Collapse
            in = { isExpanded }
            timeout = "auto"
            unmountOnExit = { true }
         >
            <Stack
               direction = "column"
               spacing = { 0.5 }
            >
               {
                  data.categories.map((category) => {
                     const goal = category.goals[category.goalIndex].goal;
                     const total = Math.random() * goal; // Placeholder until transactions are implemented
                     const progress = Math.min((total / goal) * 100, 100);

                     return (
                        <CategoryItem
                           color = { color }
                           goal = { goal }
                           key = { category.budget_category_id }
                           name = { String(category.name) }
                           progress = { progress }
                           total = { total }
                           type = { type }
                        />
                     );
                  })
               }
            </Stack>
         </Collapse>
      </Stack>
   );
}
interface BudgetProps {
   type: "Income" | "Expenses";
   data: OrganizedBudget;
   onEditClick: () => void;
}

export default function Budget({ type, data, onEditClick }: BudgetProps) {
   return (
      <BudgetCategory
         data = { data }
         onEditClick = { onEditClick }
         type = { type }
      />
   );
}