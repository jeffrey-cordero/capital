import { Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { Account } from "capital/accounts";
import { useSelector } from "react-redux";

import Finances from "@/components/dashboard/finances";
import Markets from "@/components/dashboard/markets";
import Stories from "@/components/dashboard/news";
import type { RootState } from "@/redux/store";

export default function Page() {
   const { financialNews, marketTrends } = useSelector(
      (root: RootState) => root.economy
   );
   const accounts: Account[] = useSelector(
      (root: RootState) => root.accounts.value
   ) as Account[];

   return (
      <Box
         sx = { { margin: "auto", py: 6 } }
         width = { { xs: "90%" } }
      >
         <Grid
            columnSpacing = { 4 }
            container = { true }
            sx = { { width: "100%", height: "100%" } }
         >
            <Grid size = { { xs: 12, lg: 8 } }>
               <Box
                  sx = {
                     {
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "start",
                        alignItems: "center",
                        height: "100%",
                        gap: "2rem",
                        textAlign: "center"
                     }
                  }
               >
                  <Grid size = { { xs: 12 } }>
                     <Finances accounts = { accounts } />
                  </Grid>
                  <Grid size = { { xs: 12 } }>
                     <Markets data = { marketTrends } />
                  </Grid>
               </Box>
            </Grid>
            <Grid size = { { xs: 12, lg: 4 } }>
               <Stories data = { financialNews } />
            </Grid>
         </Grid>
      </Box>
   );
}