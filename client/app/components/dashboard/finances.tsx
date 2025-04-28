import { Box, Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";

import AccountTrends from "@/components/dashboard/accounts/charts";
import { BudgetTrends } from "@/components/dashboard/budgets/charts";

/**
 * Displays user financial data through account and budget trend visualizations
 *
 * @returns {React.ReactNode} The Finances component
 */
export default function Finances(): React.ReactNode {
   return (
      <Box
         id = "finances"
         sx = { { width: "100%" } }
      >
         <Stack
            direction = "column"
            sx = { { justifyContent: "center", alignItems: "center", gap: 2.2 } }
         >
            <Grid size = { 12 }>
               <AccountTrends isCard = { true } />
            </Grid>
            <Grid size = { 12 }>
               <BudgetTrends
                  isCard = { true }
               />
            </Grid>
         </Stack>
      </Box>
   );
}