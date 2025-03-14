import { Box, Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useSelector } from "react-redux";

import Budgets from "@/components/dashboard/budgets/budgets";
import { ExpensesPieChart, IncomePieChart } from "@/components/dashboard/budgets/charts";
import { type RootState } from "@/redux/store";

export default function Page() {
   // Get budgets data from Redux store
   const budgets = useSelector((root: RootState) => root.budgets.value);

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
            { /* Header */ }
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
                  { /* Header image */ }
                  <Box className = "animation-container">
                     <Box
                        alt = "Accounts"
                        className = "floating"
                        component = "img"
                        src = "/svg/budget.svg"
                        sx = { { width: 250, height: "auto", mb: 6 } }
                     />
                  </Box>
               </Grid>
            </Grow>
            { /* Budget Summary */ }
            <Grow
               in = { true }
               mountOnEnter = { true }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               <Grid size = { { xs: 12, lg: 8 } }>
                  <Budgets budgets = { budgets } />
               </Grid>
            </Grow>
            { /* Budget Charts */ }
            <Grow
               in = { true }
               mountOnEnter = { true }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               <Grid size = { { xs: 12, lg: 4 } }>
                  <IncomePieChart budgets = { budgets } />
                  <ExpensesPieChart budgets = { budgets } />
               </Grid>
            </Grow>
         </Grid>
      </Container>
   );
}