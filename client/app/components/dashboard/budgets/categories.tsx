import { faPenToSquare, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { type BudgetCategory, type BudgetGoals } from "capital/budgets";
import { useState } from "react";
import { useDoubleTap } from "use-double-tap";

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

   // Double tap handler to toggle editing mode
   const doubleTapBindings = useDoubleTap(() => {
      if (onEditClick) {
         setIsEditing(true);
         onEditClick();
      }
   });

   return (
      <Box sx={{ pl: !isParent ? 4 : 0 }}>
         <Stack
            direction="row"
            sx={{ justifyContent: "space-between" }}
         >
            <Stack
               direction="row"
               spacing={1}
               sx={{ alignItems: "center" }}
               {...doubleTapBindings}
            >
               <Typography variant="h6">
                  {name}
               </Typography>
               {onEditClick && (
                  <FontAwesomeIcon
                     className="primary"
                     icon={faPenToSquare}
                     onClick={onEditClick}
                     style={{ cursor: "pointer", zIndex: 1000 }}
                  />
               )}
            </Stack>
            <Typography variant="h6">
               {displayCurrency(total)} / {displayCurrency(goal)}
            </Typography>
         </Stack>
         <LinearProgress
            color={color}
            sx={{
               height: "1.5rem",
               borderRadius: "12px"
            }}
            value={progress}
            variant="determinate"
         />
      </Box>
   );
}

// Props for the category list component
interface CategoryListProps {
   type: "Income" | "Expenses";
   data: {
      goals: BudgetGoals[];
      budget_category_id: string;
      categories: Array<BudgetCategory & { goals: BudgetGoals[] }>;
   };
   onEditClick: () => void;
}

// Component to render a list of budget categories with their progress bars
export function BudgetCategoryList({ type, data, onEditClick }: CategoryListProps) {
   // Calculate parent category values
   const parentGoal = data.goals[0]?.goal || 0;
   const parentTotal = Math.random() * parentGoal; // Replace with actual data when available
   const parentProgress = parentGoal <= 0 ? 0 : Math.min((parentTotal / parentGoal) * 100, 100);
   const color = type === "Income" ? "success" : "error";
   
   // State to track expanded/collapsed state
   const [isExpanded, setIsExpanded] = useState(true);

   // Toggle expanded state
   const toggleExpanded = () => {
      setIsExpanded(!isExpanded);
   };

   return (
      <Stack
         direction="column"
         spacing={1}
      >
         {/* Parent category */}
         <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ flexGrow: 1 }}>
               <CategoryItem
                  color={color}
                  goal={parentGoal}
                  name={type}
                  onEditClick={onEditClick}
                  progress={parentProgress}
                  total={parentTotal}
                  type={type}
                  isParent={true}
               />
            </Box>
            <FontAwesomeIcon
               icon={isExpanded ? faChevronUp : faChevronDown}
               onClick={toggleExpanded}
               style={{ cursor: "pointer", marginLeft: "8px" }}
            />
         </Stack>

         {/* Child categories */}
         {isExpanded && (
            <Stack
               direction="column"
               spacing={0.5}
            >
               {data.categories.map((category) => {
                  const categoryGoal = category.goals[0]?.goal || 0;
                  const categoryTotal = Math.random() * categoryGoal; // Replace with actual data when available
                  const categoryProgress = categoryGoal <= 0 ? 0 : Math.min((categoryTotal / categoryGoal) * 100, 100);

                  return (
                     <CategoryItem
                        color={color}
                        goal={categoryGoal}
                        key={category.budget_category_id}
                        name={category.name || ""}
                        progress={categoryProgress}
                        total={categoryTotal}
                        type={type}
                     />
                  );
               })}
            </Stack>
         )}
      </Stack>
   );
}
