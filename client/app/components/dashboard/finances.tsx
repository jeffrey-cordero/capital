import { Box, Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";

import AccountTrends from "@/components/dashboard/accounts/charts";
import { BudgetTrends } from "@/components/dashboard/budgets/charts";

/**
 * The Finances component to render the user finances, including account and budget trends.
 *
 * @returns {React.ReactNode} The Finances component
 */
export default function Finances(): React.ReactNode {
   return (
      <Box
         id = "marketTrends"
         sx = { { width: "100%" } }
      >
         <Box
            alt = "Finances"
            component = "img"
            src = "/svg/finances.svg"
            sx = { { height: 255, mb: 2.1 } }
         />
         <Stack
            direction = "column"
            sx = { { justifyContent: "center", alignItems: "center", gap: 3.1 } }
         >
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