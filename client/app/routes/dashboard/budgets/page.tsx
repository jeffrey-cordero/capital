import { Box, Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";

import Budgets from "@/components/dashboard/budgets/budgets";
import { BudgetPieChart, BudgetTrends } from "@/components/dashboard/budgets/charts";

export default function Page() {
   return (
      <Container
         maxWidth = "xl"
         sx = { { py: 4, px: 2 } }
      >
         <Grid
            columnSpacing = { 4 }
            container = { true }
            rowSpacing = { 4 }
            sx = { { width: "100%", height: "100%" } }
         >
            <Grow
               in = { true }
               mountOnEnter = { true }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               <Grid
                  size = { { xs: 12 } }
                  sx = { { textAlign: "center" } }
               >
                  { /* Budget image */ }
                  <Box className = "animation-container">
                     <Box
                        alt = "Budgets"
                        className = "floating"
                        component = "img"
                        src = "/svg/budget.svg"
                        sx = { { width: 250, height: "auto" } }
                     />
                  </Box>
               </Grid>
            </Grow>
            { /* Budget Summaries */ }
            <Grow
               in = { true }
               mountOnEnter = { true }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               <Grid size = { { xs: 12 } }>
                  <Budgets />
               </Grid>
            </Grow>
            { /* Budget Charts */ }
            <Grid size = { { xs: 12 } }>
               <Grow
                  in = { true }
                  mountOnEnter = { true }
                  timeout = { 1000 }
                  unmountOnExit = { true }
               >
                  <Grid
                     container = { true }
                  >
                     <Grid
                        size = { { xs: 12 } }
                        sx = { { textAlign: "center", justifyContent: "center" } }
                     >
                        { /* Budgeting image */ }
                        <Box className = "animation-container">
                           <Box
                              alt = "Budgeting"
                              className = "floating"
                              component = "img"
                              src = "/svg/budgeting.svg"
                              sx = { { width: 500, height: "auto", mb: -5 } }
                           />
                        </Box>
                     </Grid>
                     <Grid size = { { xs: 12, md: 6 } }>
                        <BudgetPieChart type = "Income" />
                     </Grid>
                     <Grid size = { { xs: 12, md: 6 } }>
                        <BudgetPieChart type = "Expenses" />
                     </Grid>
                     <Grid size = { { xs: 12 } }>
                        <BudgetTrends elevation = { 0 } />
                     </Grid>
                  </Grid>
               </Grow>
            </Grid>
         </Grid>
      </Container>
   );
}