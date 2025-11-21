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
import { useSelector } from "react-redux";

import { displayCurrency, horizontalScroll } from "@/lib/display";
import type { RootState } from "@/redux/store";

/**
 * Props for the CategoryItem component
 *
 * @property {string} budget_category_id - Category identifier
 * @property {string} name - Category name
 * @property {BudgetGoal[]} goals - Budget goals list
 * @property {number} goalIndex - Current goal index
 * @property {"Income" | "Expenses"} type - Budget type
 * @property {() => void} [onEditClick] - Edit handler function
 * @property {boolean} [isMainCategory] - Whether this is a main category
 * @property {string} period - Current budget period
 * @property {Record<string, Record<string, number>>} allocations - Period to budget allocation mapping
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
 * Displays a budget category with progress bar and details
 *
 * @param {CategoryItemProps} props - The props for the CategoryItem component
 * @returns {React.ReactNode} The CategoryItem component
 */
const CategoryItem = function CategoryItem(props: CategoryItemProps): React.ReactNode {
   const { budget_category_id, name, goals, goalIndex, type, onEditClick, isMainCategory = false, allocations, period } = props;
   const theme = useTheme();
   const goal = goals[goalIndex].goal;
   const current = allocations[period]?.[isMainCategory ? type : budget_category_id] || 0;
   const progress = Math.min((current / goal) * 100, 100);
   const color = type === "Income" ? "success" : "error";

   return (
      <Box
         data-testid = { isMainCategory ? `budget-category-${type}` : `budget-category-${budget_category_id}` }
         data-category-id = { budget_category_id }
         sx = { { px: !isMainCategory ? { xs: 2, sm: 4 } : 0 } }
      >
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
                  isMainCategory && (
                     <IconButton
                        aria-label = "edit"
                        color = "primary"
                        data-testid = { `budget-category-edit-${type}` }
                        onClick = { onEditClick }
                        size = "medium"
                        sx = {{ mb: 0.25 }}
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
               data-testid = { isMainCategory ? `budget-category-progress-${type}` : `budget-category-progress-${budget_category_id}` }
               sx = { { ...horizontalScroll(theme), maxWidth: "90%", fontWeight: "600", textAlign: "center" } }
            >
               { displayCurrency(current) } / { displayCurrency(goal) }
            </Typography>
         </Stack>
         <LinearProgress
            color = { color }
            sx = { { height: "1.50rem", borderRadius: "16px" } }
            value = { progress }
            variant = "determinate"
         />
      </Box>
   );
};

/**
 * Displays budget categories with animations
 *
 * @param {BudgetProps} props - The props for the BudgetCategory component
 * @returns {React.ReactNode} The BudgetCategory component
 */
const BudgetCategory = function BudgetCategory({ type, onEditClick, allocations }: BudgetProps): React.ReactNode {
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);
   const period: string = `${year}-${month.toString().padStart(2, "0")}`;

   return (
      <Stack
         data-testid = { `budget-group-${type}` }
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
         {
            budget.categories.length > 0 && (
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
            )
         }
      </Stack>
   );
};

/**
 * Props for the Budget component
 *
 * @property {"Income" | "Expenses"} type - Budget type
 * @property {() => void} onEditClick - Edit button click handler
 * @property {Record<string, Record<string, number>>} allocations - Period to budget allocation mapping
 */
interface BudgetProps {
   type: "Income" | "Expenses";
   onEditClick: () => void;
   allocations: Record<string, Record<string, number>>;
}

/**
 * Main budget display component
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
}