import { Container, Grow, Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";

import Finances from "@/components/dashboard/finances";
import Markets from "@/components/dashboard/markets";
import Articles from "@/components/dashboard/news";

export default function Page() {
   return (
      <Container
         maxWidth = "xl"
         sx = { { py: 4, px: 2 } }
      >
         <Grid
            columnSpacing = { 4 }
            container = { true }
            rowSpacing = { 2 }
            sx = { { width: "100%", height: "100%" } }
         >
            <Grow
               in = { true }
               mountOnEnter = { true }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               <Grid
                  size = { { xs: 12, lg: 8 } }
                  sx = { { minHeight: "100%" } }
               >
                  <Stack
                     direction = "column"
                     spacing = { 1 }
                     sx = { { minHeight:"100%", textAlign: "center", justifyContent: "space-between" } }
                  >
                     <Grid size = { { xs: 12 } }>
                        <Finances />
                     </Grid>
                     <Grid size = { { xs: 12 } }>
                        <Markets />
                     </Grid>
                  </Stack>
               </Grid>
            </Grow>
            <Grow
               in = { true }
               mountOnEnter = { true }
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