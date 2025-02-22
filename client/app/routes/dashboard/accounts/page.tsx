import { Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";

import Accounts from "@/components/dashboard/accounts/accounts";
import Transactions from "@/components/dashboard/accounts/transactions";

export default function Page() {
   return (
      <Stack
         direction = "column"
         sx = { {  width: { xs: "90%" }, margin: "auto", py: 6, textAlign: "center" } }
      >
         <Grid size = { { xs: 12, xl: 8 } }>
            <Accounts />
         </Grid>
         <Grid size = { { xs: 12, xl: 4 } }>
            <Transactions />
         </Grid>
      </Stack>
   );
}