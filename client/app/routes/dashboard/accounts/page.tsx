import { Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { Account } from "capital/accounts";
import { useSelector } from "react-redux";

import Accounts from "@/components/dashboard/accounts/accounts";
import Transactions from "@/components/dashboard/accounts/transactions";
import type { RootState } from "@/redux/store";

export default function Page() {
   const accounts: Account[] = useSelector(
      (root: RootState) => root.accounts.value
   );

   return (
      <Container
         maxWidth = "xl"
         sx = { { textAlign: "center", pt: 6, pb: 4, px: 2 } }
      >
         <Grow
            in = { true }
            mountOnEnter = { true }
            timeout = { 1000 }
            unmountOnExit = { true }
         >
            <Grid size = { { xs: 12 } }>
               <Accounts accounts = { accounts } />
            </Grid>
         </Grow>
         <Grow
            in = { true }
            mountOnEnter = { true }
            timeout = { 1000 }
            unmountOnExit = { true }
         >
            <Grid size = { { xs: 12 } }>
               <Transactions />
            </Grid>
         </Grow>
      </Container>
   );
}