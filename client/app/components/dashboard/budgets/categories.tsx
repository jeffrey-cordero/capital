import { faCaretDown, faChevronDown, faChevronUp, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Collapse,
   LinearProgress,
   Stack,
   Typography
} from "@mui/material";
import { type OrganizedBudget } from "capital/budgets";
import { useState } from "react";

import { Expand } from "@/components/global/expand";
import { displayCurrency } from "@/lib/display";

// Props for rendering a single category item
interface CategoryItemProps {
   goal: number;
   total: number;
   name: string;
   progress: number;
   type: "Income" | "Expenses";
   onEditClick?: () => void;
   color: "success" | "error";
   isParent?: boolean;
}

// Component to render a single category with its progress bar
export function CategoryItem({
   name,
   goal,
   total,
   progress,
   color,
   onEditClick,
   isParent = false
}: CategoryItemProps) {
   // State to track if the category is being edited
   const [isEditing, setIsEditing] = useState(false);

   return (
      <Box sx = { { pl: !isParent ? 4 : 0 } }>
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
                  height: "1.5rem",
                  borderRadius: "12px"
               }
            }
            value = { progress }
            variant = "determinate"
         />
      </Box>
   );
}

// Props for the category list component
interface CategoryListProps {
   type: "Income" | "Expenses";
   data: OrganizedBudget;
   onEditClick: () => void;
}

// Component to render a list of budget categories with their progress bars
export function BudgetCategoryList({ type, data, onEditClick }: CategoryListProps) {
   // Calculate parent category values
   const goal = data.goals[data.goalIndex]?.goal || 0;
   const total = Math.random() * goal;
   const progress = goal <= 0 ? 0 : Math.min((total / goal) * 100, 100);
   const color = type === "Income" ? "success" : "error";

   // State to track expanded/collapsed state
   const [isExpanded, setIsExpanded] = useState(true);

   // Toggle expanded state
   const toggleExpanded = () => {
      setIsExpanded(!isExpanded);
   };

   return (
      <Stack
         direction = "column"
         spacing = { 1 }
      >
         { /* Parent category */ }
         <Stack
            direction = "row"
            spacing = { 1 }
            sx = { { position: "relative", alignContent: "center" } }
         >
            <Box sx = { { flexGrow: 1 } }>
               <CategoryItem
                  color = { color }
                  goal = { goal }
                  isParent = { true }
                  name = { type }
                  onEditClick = { onEditClick }
                  progress = { progress }
                  total = { total }
                  type = { type }
               />
            </Box>
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
                     const categoryGoal = category.goals[category.goalIndex]?.goal || 0;
                     const categoryTotal = Math.random() * categoryGoal;
                     const categoryProgress = categoryGoal <= 0 ? 0 : Math.min((categoryTotal / categoryGoal) * 100, 100);

                     return (
                        <CategoryItem
                           color = { color }
                           goal = { categoryGoal }
                           key = { category.budget_category_id }
                           name = { category.name || "" }
                           progress = { categoryProgress }
                           total = { categoryTotal }
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