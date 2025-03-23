import { Box, Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";

import { AccountTrends } from "@/components/dashboard/accounts/charts";
import { BudgetTrends } from "@/components/dashboard/budgets/charts";

export default function Finances() {
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
               <AccountTrends isCard = { true } />
            </Grid>
            <Grid size = { 12 }>
               <BudgetTrends isCard = { true } />
            </Grid>
         </Stack>
      </Box>
   );
}