import { Container, Grow, Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { Account } from "capital/accounts";
import { useSelector } from "react-redux";

import Finances from "@/components/dashboard/finances";
import Markets from "@/components/dashboard/markets";
import Stories from "@/components/dashboard/news";
import type { RootState } from "@/redux/store";

export default function Page() {
   const { news, marketTrends } = useSelector(
      (root: RootState) => root.economy
   );
   const accounts: Account[] = useSelector(
      (root: RootState) => root.accounts.value
   ) as Account[];

   return (
      <Container
         maxWidth = "xl"
         sx = { { py: 4, px: 2 } }
      >
         <Grid
            columnSpacing = { 4 }
            container = { true }
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
                  sx = { { height: "100%" } }
               >
                  <Stack
                     direction = "column"
                     spacing = { 1 }
                     sx = { { height:"100%", textAlign: "center", justifyContent: "space-between" } }
                  >
                     <Grid size = { { xs: 12 } }>
                        <Finances accounts = { accounts } />
                     </Grid>
                     <Grid size = { { xs: 12 } }>
                        <Markets data = { marketTrends } />
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
                  sx = { { height: "100%" } }
               >
                  <Stories data = { news } />
               </Grid>
            </Grow>
         </Grid>
      </Container>
   );
}