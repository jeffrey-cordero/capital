import { Container, Grow, Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";

import Markets from "@/components/dashboard/economy";
import Finances from "@/components/dashboard/finances";
import Articles from "@/components/dashboard/news";

/**
 * Main dashboard view with financial overview and market data
 *
 * @returns {React.ReactNode} The dashboard page component
 */
export default function Page(): React.ReactNode {
   return (
      <Container
         maxWidth = "xl"
         sx = { { py: 4, px: 2, mt: 6 } }
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
               style = { { transformOrigin: "center top" } }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               <Grid
                  size = { { xs: 12, lg: 8 } }
                  sx = { { minHeight: "100%" } }
               >
                  <Stack
                     direction = "column"
                     sx = { { minHeight: "100%", textAlign: "center" } }
                  >
                     <Finances />
                     <Markets />
                  </Stack>
               </Grid>
            </Grow>
            <Grow
               in = { true }
               mountOnEnter = { true }
               style = { { transformOrigin: "center top" } }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               <Grid
                  size = { { xs: 12, lg: 4 } }
                  sx = { { minHeight: "100%" } }
               >
                  <Articles />
               </Grid>
            </Grow>
         </Grid>
      </Container>
   );
}