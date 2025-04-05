import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   IconButton,
   LinearProgress,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { type BudgetGoal, type OrganizedBudget } from "capital/budgets";
import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";
import { useSelector } from "react-redux";

import { displayCurrency, horizontalScroll } from "@/lib/display";
import type { RootState } from "@/redux/store";

/**
 * Define the props for the CategoryItem component
 *
 * @interface CategoryItemProps
 * @property {string} budget_category_id - The id of the category
 * @property {string} name - The name of the category
 * @property {BudgetGoal[]} goals - The goals for the category
 * @property {string} period - The period
 * @property {Record<string, Record<string, number>>} allocations - Mapping of periods to budget allocations
 */
interface CategoryItemProps {
   budget_category_id: string;
   name: string;
   goals: BudgetGoal[];
   goalIndex: number;
   type: "Income" | "Expenses";
   onEditClick?: () => void;
   isMainCategory?: boolean;
   period: string;
   allocations: Record<string, Record<string, number>>;
}

/**
 * The CategoryItem component to display the category item
 *
 * @param {CategoryItemProps} props - The props for the CategoryItem component
 * @returns {React.ReactNode} The CategoryItem component
 */
const CategoryItem = memo(function CategoryItem({ budget_category_id, name, goals, goalIndex, type, onEditClick, isMainCategory = false, allocations, period }: CategoryItemProps) {
   const theme = useTheme();
   const goal = goals[goalIndex].goal;
   const current = allocations[period]?.[isMainCategory ? type : budget_category_id] || 0;
   const progress = Math.min((current / goal) * 100, 100);
   const color = type === "Income" ? "success" : "error";

   return (
      <Box sx = { { px: !isMainCategory ? { xs: 2, sm: 4 } : 0 } }>
         <Stack
            direction = "column"
            sx = { { width: "100%", alignItems: "center", justifyContent: "center", textAlign: "center", mb: 1.5, mx: "auto" } }
         >
            <Stack
               direction = "row"
               sx = { { ...horizontalScroll(theme), maxWidth: "90%", justifyContent: "flex-start", alignItems: "center", textAlign: "center" } }
            >
               <Typography
                  sx = { { fontWeight: "600" } }
                  variant = "h6"
               >
                  { name }
               </Typography>
               {
                  onEditClick && (
                     <IconButton
                        color = "primary"
                        onClick = { onEditClick }
                        size = "medium"
                     >
                        <FontAwesomeIcon
                           icon = { faPenToSquare }
                           size = "xs"
                        />
                     </IconButton>
                  )
               }
            </Stack>
            <Typography
               sx = { { ...horizontalScroll(theme), maxWidth: "90%", fontWeight: "600", textAlign: "center" } }
               variant = "subtitle1"
            >
               { displayCurrency(current) } / { displayCurrency(goal) }
            </Typography>
         </Stack>
         <LinearProgress
            color = { color }
            sx = { { height: "1.75rem", borderRadius: "16px" } }
            value = { progress }
            variant = "determinate"
         />
      </Box>
   );
});

/**
 * The BudgetCategory component to display the budget category
 *
 * @param {BudgetProps} props - The props for the BudgetCategory component
 * @returns {React.ReactNode} The BudgetCategory component
 */
const BudgetCategory = function BudgetCategory({ type, onEditClick, allocations }: BudgetProps): React.ReactNode {
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);
   const period: string = `${year}-${month.toString().padStart(2, "0")}`;

   return (
      <Stack
         direction = "column"
      >
         <Box
            sx = { { position: "relative", width: "100%", mx: "auto", mb: 2.5 } }
         >
            <CategoryItem
               allocations = { allocations }
               budget_category_id = { budget.budget_category_id }
               goalIndex = { budget.goalIndex }
               goals = { budget.goals }
               isMainCategory = { true }
               name = { type }
               onEditClick = { onEditClick }
               period = { period }
               type = { type }
            />
         </Box>
         <AnimatePresence mode = "popLayout">
            <Stack
               direction = "column"
               spacing = { 2 }
            >
               {
                  budget.categories.map((category) => (
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
                           allocations = { allocations }
                           budget_category_id = { category.budget_category_id }
                           goalIndex = { category.goalIndex }
                           goals = { category.goals }
                           name = { String(category.name) }
                           period = { period }
                           type = { type }
                        />
                     </motion.div>
                  ))
               }
            </Stack>
         </AnimatePresence>
      </Stack>
   );
};

/**
 * Define the props for the Budget component
 *
 * @interface BudgetProps
 * @property {string} type - The type of budget
 * @property {() => void} onEditClick - The function to call when the edit button is clicked on main categories
 * @property {Record<string, Record<string, number>>} allocations - Mapping of periods to budget allocations
 */
interface BudgetProps {
   type: "Income" | "Expenses";
   onEditClick: () => void;
   allocations: Record<string, Record<string, number>>;
}

/**
 * The Budget component to display the budget
 *
 * @param {BudgetProps} props - The props for the Budget component
 * @returns {React.ReactNode} The Budget component
 */
export default function Budget({ type, onEditClick, allocations }: BudgetProps): React.ReactNode {
   return (
      <BudgetCategory
         allocations = { allocations }
         onEditClick = { onEditClick }
         type = { type }
      />
   );
};