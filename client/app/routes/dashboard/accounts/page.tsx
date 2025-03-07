import { Container } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { Account } from "capital/accounts";
import { useSelector } from "react-redux";

import Accounts from "@/components/dashboard/accounts/accounts";
import Transactions from "@/components/dashboard/accounts/all-transactions";
import type { RootState } from "@/redux/store";

export default function Page() {
   const accounts: Account[] = useSelector(
      (root: RootState) => root.accounts.value
   );

   return (
      <Container
         maxWidth = "lg"
         sx = { { textAlign: "center", py: 4 } }
      >
         <Grid size = { { xs: 12 } }>
            <Accounts accounts = { accounts } />
         </Grid>
         <Grid size = { { xs: 12 } }>
            <Transactions />
         </Grid>
      </Container>
   );
}