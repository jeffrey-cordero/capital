import { Box, Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import Budgets from "@/components/dashboard/budgets/budgets";
import { BudgetPieChart, BudgetTrends } from "@/components/dashboard/budgets/charts";
import type { RootState } from "@/redux/store";

/**
 * The budgets page component.
 *
 * @returns {React.ReactNode} The budgets page component
 */
export default function Page(): React.ReactNode {
   const transactions = useSelector((state: RootState) => state.transactions.value);

   // Calculate the total budget allocations for existing transactions
   const allocations = useMemo(() => {
      return transactions.reduce((acc, transaction) => {
         const period: string = transaction.date.substring(0, 7);

         // Initialize the period if it doesn't exist
         if (!acc[period]) {
            acc[period] = { Income: 0, Expenses: 0 };
         }

         // Initialize the category if it doesn't exist
         if (!acc[period][transaction.budget_category_id || ""]) {
            acc[period][transaction.budget_category_id || ""] = 0;
         }

         // Add the amount to the category and respective type
         const amount = Math.abs(transaction.amount);
         acc[period][transaction.budget_category_id || ""] += amount;
         acc[period][transaction.type] += amount;

         return acc;
      }, {} as Record<string, Record<string, number>>);
   }, [transactions]);

   return (
      <Container
         maxWidth = "xl"
         sx = { { py: 4, px: 2 } }
      >
         <Grid
            container = { true }
            rowSpacing = { 6 }
            sx = { { width: "100%", height: "100%" } }
         >
            <Grow
               in = { true }
               mountOnEnter = { true }
               style = { { transformOrigin: "center top" } }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               <Grid
                  size = { { xs: 12 } }
                  sx = { { textAlign: "center" } }
               >
                  <Box
                     alt = "Budgets"
                     component = "img"
                     src = "/svg/budgets.svg"
                     sx = { { width: 335, mb: -5 } }
                  />
               </Grid>
            </Grow>
            <Grow
               in = { true }
               mountOnEnter = { true }
               style = { { transformOrigin: "center top" } }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               <Grid size = { { xs: 12 } }>
                  <Budgets allocations = { allocations } />
               </Grid>
            </Grow>
            {
               transactions.length > 0 && (
                  <Grid size = { { xs: 12 } } sx = {{ mt: -4 }}>
                     <Grow
                        in = { true }
                        mountOnEnter = { true }
                        style = { { transformOrigin: "center top" } }
                        timeout = { 1000 }
                        unmountOnExit = { true }
                     >
                        <Grid
                           container = { true }
                           rowSpacing = { 4 }
                        >
                           <Grid size = { { xs: 12, md: 6 } }>
                              <BudgetPieChart
                                 allocations = { allocations }
                                 type = "Income"
                              />
                           </Grid>
                           <Grid
                              size = { { xs: 12, md: 6 } }
                              sx = { { mt: { xs: -4, md: 0 } } }
                           >
                              <BudgetPieChart
                                 allocations = { allocations }
                                 type = "Expenses"
                              />
                           </Grid>
                           <Grid size = { { xs: 12 } }>
                              <BudgetTrends isCard = { false } />
                           </Grid>
                        </Grid>
                     </Grow>
                  </Grid>
               )
            }
         </Grid>
      </Container>
   );
}