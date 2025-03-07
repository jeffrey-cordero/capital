import { Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { Account } from "capital/accounts";
import { useSelector } from "react-redux";

import Accounts from "@/components/dashboard/accounts/accounts";
import Transactions from "@/components/dashboard/accounts/all-transactions";
import type { RootState } from "@/redux/store";

export default function Page() {
   const accounts = useSelector(
      (root: RootState) => root.accounts.value
   ) as Account[];

   return (
      <Stack
         direction = "column"
         sx = { {  width: { xs: "90%" }, margin: "auto", py: 6, textAlign: "center" } }
      >
         <Grid size = { { xs: 12, xl: 8 } }>
            <Accounts accounts = { accounts } />
         </Grid>
         <Grid size = { { xs: 12, xl: 4 } }>
            <Transactions />
         </Grid>
      </Stack>
   );
}