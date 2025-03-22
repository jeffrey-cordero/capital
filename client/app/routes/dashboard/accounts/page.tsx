import { Box, Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";

import Accounts from "@/components/dashboard/accounts/accounts";
import { AccountTrends } from "@/components/dashboard/accounts/charts";
import Transactions from "@/components/dashboard/accounts/transactions";
export default function Page() {
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
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               { /* Accounts */ }
               <Grid size = { { xs: 12 } }>
                  <Box className = "animation-container">
                     <Box
                        alt = "Accounts"
                        className = "floating"
                        component = "img"
                        src = "/svg/accounts.svg"
                        sx = { { width: 360, height: "auto", mb: 10 } }
                     />
                  </Box>
                  <Accounts />
               </Grid>
            </Grow>
            <Grow
               in = { true }
               mountOnEnter = { true }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               { /* Transactions */ }
               <Grid size = { { xs: 12 } }>
                  <Box className = "animation-container">
                     <Box
                        alt = "Transactions"
                        className = "floating"
                        component = "img"
                        src = "/svg/transactions.svg"
                        sx = { { width: 325, height: "auto", mb: 10 } }
                     />
                  </Box>
                  <Transactions />
               </Grid>
            </Grow>
            <Grow
               in = { true }
               mountOnEnter = { true }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               { /* Account Trends */ }
               <Grid size = { { xs: 12 } }>
                  <Box className = "animation-container">
                     <Box
                        alt = "Accounting"
                        className = "floating"
                        component = "img"
                        src = "/svg/accounting.svg"
                        sx = { { width: 400, height: "auto" } }
                     />
                  </Box>
                  <AccountTrends elevation = { 0 } />
               </Grid>
            </Grow>
         </Grid>
      </Container>
   );
}