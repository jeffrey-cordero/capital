import { Box, Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { type Account } from "capital/accounts";

import { AccountTrends, BudgetTrends } from "@/components/dashboard/trends";

export default function Finances({ accounts }: { accounts: Account[] }) {
   return (
      <Box
         id = "marketTrends"
         sx = { { width: "100%" } }
      >
         <Stack
            direction = "column"
            sx = { { justifyContent: "center", alignItems: "center", gap: 2 } }
         >
            <Box className = "animation-container">
               <Box
                  alt = "Finances"
                  className = "floating"
                  component = "img"
                  src = "/svg/finances.svg"
                  sx = { { width: 362, height: "auto" } }
               />
            </Box>
            <Grid size = { 12 }>
               <AccountTrends accounts = { accounts } />
            </Grid>
            <Grid size = { 12 }>
               <BudgetTrends />
            </Grid>
         </Stack>
      </Box>
   );
}