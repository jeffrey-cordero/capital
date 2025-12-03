import { Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import Budgets from "@/components/dashboard/budgets/budgets";
import { BudgetPieChart, BudgetTrends } from "@/components/dashboard/budgets/charts";
import type { RootState } from "@/redux/store";

/**
 * Budgets page with allocation charts and budget management features
 *
 * @returns {React.ReactNode} The budgets page component
 */
export default function Page(): React.ReactNode {
   const transactions = useSelector((state: RootState) => state.transactions.value);

   // Calculate budget allocations from transaction history
   const allocations = useMemo(() => {
      return transactions.reduce((acc, record) => {
         const period: string = record.date!.substring(0, 7);

         // Initialize the period
         if (!acc[period]) {
            acc[period] = { Income: 0, Expenses: 0 };
         }

         // Initialize the category
         if (!acc[period][record.budget_category_id || ""]) {
            acc[period][record.budget_category_id || ""] = 0;
         }

         // Add the absolute amount to the category and respective type allocations
         const amount = Math.abs(record.amount);
         acc[period][record.budget_category_id || ""] += amount;
         acc[period][record.type!] += amount;

         return acc;
      }, {} as Record<string, Record<string, number>>);
   }, [transactions]);

   return (
      <Container
         maxWidth = "xl"
         sx = { { py: 4, px: 2, mt: 6 } }
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
               <Grid size = { { xs: 12 } }>
                  <Budgets allocations = { allocations } />
               </Grid>
            </Grow>
            {
               transactions.length > 0 && (
                  <Grid
                     size = { { xs: 12 } }
                     sx = { { mt: -4 } }
                  >
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