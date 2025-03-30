import { Box, Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";

import Accounts from "@/components/dashboard/accounts/accounts";
import AccountTrends from "@/components/dashboard/accounts/charts";
import Transactions from "@/components/dashboard/transactions/transactions";

/**
 * The accounts page component.
 *
 * @returns {React.ReactNode} The accounts page component
 */
export default function Page(): React.ReactNode {
   return (
      <Container
         maxWidth = "xl"
         sx = { { textAlign: "center", pt: 6, pb: 4, px: 2 } }
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
                  <Box
                     alt = "Accounts"
                     component = "img"
                     src = "/svg/accounts.svg"
                     sx = { { height: 205, mb: 10 } }
                  />
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
                  <Box
                     alt = "Transactions"
                     component = "img"
                     src = "/svg/transactions.svg"
                     sx = { { height: 280, mb: 2 } }
                  />
                  <Transactions />
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
                  <Box
                     alt = "Accounting"
                     component = "img"
                     src = "/svg/accounting.svg"
                     sx = { { height: 290, mb: 2 } }
                  />
                  <AccountTrends isCard = { false } />
               </Grid>
            </Grow>
         </Grid>
      </Container>
   );
}