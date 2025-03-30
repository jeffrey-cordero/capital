import { Box, Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";

import Budgets from "@/components/dashboard/budgets/budgets";
import { BudgetPieChart, BudgetTrends } from "@/components/dashboard/budgets/charts";

/**
 * The budgets page component.
 *
 * @returns {React.ReactNode} The budgets page component
 */
export default function Page(): React.ReactNode {
   return (
      <Container
         maxWidth = "xl"
         sx = { { py: 4, px: 2 } }
      >
         <Grid
            container = { true }
            rowSpacing = { 8 }
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
                     sx = { { height: 310, mb: -10, mt: -2 } }
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
                  <Budgets />
               </Grid>
            </Grow>
            <Grid size = { { xs: 12 } }>
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
                     <Grid
                        size = { { xs: 12 } }
                        sx = { { textAlign: "center", justifyContent: "center" } }
                     >
                        <Box
                           alt = "Trends"
                           component = "img"
                           src = "/svg/trends.svg"
                           sx = { { height: 235 } }
                        />
                     </Grid>
                     <Grid size = { { xs: 12, md: 6 } }>
                        <BudgetPieChart type = "Income" />
                     </Grid>
                     <Grid
                        size = { { xs: 12, md: 6 } }
                        sx = { { mt: { xs: -4, md: 0 } } }
                     >
                        <BudgetPieChart type = "Expenses" />
                     </Grid>
                     <Grid size = { { xs: 12 } }>
                        <BudgetTrends isCard = { false } />
                     </Grid>
                  </Grid>
               </Grow>
            </Grid>
         </Grid>
      </Container>
   );
}