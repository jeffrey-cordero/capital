import { Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useSelector } from "react-redux";

import Accounts from "@/components/dashboard/accounts/accounts";
import AccountTrends from "@/components/dashboard/accounts/charts";
import Transactions from "@/components/dashboard/transactions/transactions";
import type { RootState } from "@/redux/store";

/**
 * Accounts page displaying financial accounts, transactions, and balance trends
 *
 * @returns {React.ReactNode} The accounts page component
 */
export default function Page(): React.ReactNode {
   const accounts = useSelector((state: RootState) => state.accounts.value);

   return (
      <Container
         maxWidth = "xl"
         sx = { { textAlign: "center", pt: 6, pb: 4, px: 2, mt: 10 } }
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
                  <Accounts />
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
                  <Transactions />
               </Grid>
            </Grow>
            {
               accounts.length > 0 && (
                  <Grow
                     in = { true }
                     mountOnEnter = { true }
                     style = { { transformOrigin: "center top" } }
                     timeout = { 1000 }
                     unmountOnExit = { true }
                  >
                     <Grid size = { { xs: 12 } }>
                        <AccountTrends isCard = { false } />
                     </Grid>
                  </Grow>
               )
            }
         </Grid>
      </Container>
   );
}