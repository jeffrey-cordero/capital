import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { type BudgetGoals, type OrganizedBudget } from "capital/budgets";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import { displayCurrency, ellipsis } from "@/lib/display";
import type { RootState } from "@/redux/store";

interface CategoryItemProps {
   name: string;
   goals: BudgetGoals[];
   goalIndex: number;
   type: "Income" | "Expenses";
   onEditClick?: () => void;
   isMainCategory?: boolean;
}

function CategoryItem({ name, goals, goalIndex, type, onEditClick, isMainCategory = false }: CategoryItemProps) {
   // Calculate the category values
   const goal = goals[goalIndex].goal;
   const current = useMemo(() => Math.random() * goal, [goal]);
   const progress = Math.min((current / goal) * 100, 100);
   const color = type === "Income" ? "success" : "error";

   return (
      <Box sx = { { px: !isMainCategory ? { xs: 2, sm: 4 } : 0 } }>
         <Stack
            direction = "column"
            sx = { { justifyContent: { xs: "flex-start", sm: "space-between" }, alignItems: "center", mb: 1 } }
         >
            <Stack
               direction = "row"
               spacing = { 1 }
               sx = { { alignItems: "center" } }
            >
               <Typography
                  sx = { { ...ellipsis, maxWidth: { xs: "40%", sm: "500px" }, fontWeight: "600", textAlign: "center" }}
                  variant = "h6"
               >
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
            <Typography
               sx = { { fontWeight: "600", wordBreak: "break-word", textAlign: "center" } }
               variant = "subtitle1"
            >
               { displayCurrency(current) } / { displayCurrency(goal) }
            </Typography>
         </Stack>
         <LinearProgress
            color = { color }
            sx = {
               {
                  height: "1.65rem",
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
   onEditClick: () => void;
}

// Component to render a list of budget categories with their progress bars and potential subcategories
export function BudgetCategory({ type, onEditClick }: BudgetCategoryProps) {
   // Get the main budget category
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);

   return (
      <Stack
         direction = "column"
         spacing = { 2 }
      >
         { /* Parent category */ }
         <Stack
            direction = "row"
            spacing = { 1 }
            sx = { { position: "relative" } }
         >
            <Box sx = { { flexGrow: 1 } }>
               <CategoryItem
                  goalIndex = { budget.goalIndex }
                  goals = { budget.goals }
                  isMainCategory = { true }
                  name = { type }
                  onEditClick = { onEditClick }
                  type = { type }
               />
            </Box>
         </Stack>
         { /* Child categories */ }
         <Stack
            direction = "column"
            spacing = { 1 }
         >
            <AnimatePresence mode = "popLayout">
               {
                  budget.categories.map((category) => {
                     return (
                        <motion.div
                           animate = { { opacity: 1, y: 0 } }
                           exit = { { opacity: 0, y: 10 } }
                           initial = { { opacity: 0, y: -10 } }
                           key = { category.budget_category_id }
                           layout = "position"
                           transition = {
                              {
                                 type: "spring",
                                 stiffness: 100,
                                 damping: 15,
                                 mass: 1,
                                 duration: 0.1
                              }
                           }
                        >
                           <CategoryItem
                              goalIndex = { category.goalIndex }
                              goals = { category.goals }
                              name = { String(category.name) }
                              type = { type }
                           />
                        </motion.div>
                     );
                  })
               }
            </AnimatePresence>
         </Stack>
      </Stack>
   );
}
interface BudgetProps {
   type: "Income" | "Expenses";
   onEditClick: () => void;
}

export default function Budget({ type, onEditClick }: BudgetProps) {
   return (
      <BudgetCategory
         onEditClick = { onEditClick }
         type = { type }
      />
   );
}