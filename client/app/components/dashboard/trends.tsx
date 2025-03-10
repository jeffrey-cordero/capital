import {
   Card,
   CardContent,
   Chip,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { type Account, liabilityTypes } from "capital/accounts";

import { getLastSixMonths, normalizeDate, today } from "@/lib/dates";
import { displayCurrency, displayVolume, ellipsis } from "@/lib/display";

// Common card layout component to reduce duplication
const TrendCard = ({ title, value, subtitle, chart, extraInfo }: {
   title: string;
   value: string;
   subtitle: string;
   chart: React.ReactNode;
   extraInfo?: React.ReactNode;
}) => (
   <Card
      elevation = { 3 }
      sx = { { textAlign: "left", borderRadius: 2, height: "100%" } }
      variant = "elevation"
   >
      <CardContent sx = { { p: 2.5 } }>
         <Typography
            component = "h2"
            gutterBottom = { true }
            variant = "subtitle2"
         >
            { title }
         </Typography>
         <Stack sx = { { justifyContent: "space-between" } }>
            <Stack
               direction = "row"
               sx = {
                  {
                     alignContent: { xs: "center", sm: "flex-start" },
                     alignItems: "center",
                     gap: 1
                  }
               }
            >
               <Typography
                  component = "p"
                  sx = { { ...ellipsis, maxWidth: "95%" } }
                  variant = "h4"
               >
                  { value }
               </Typography>
               { extraInfo }
            </Stack>
            <Typography
               sx = { { color: "text.secondary" } }
               variant = "caption"
            >
               { subtitle }
            </Typography>
         </Stack>
         { chart }
      </CardContent>
   </Card>
);

export function AccountTrends({ accounts }: { accounts: Account[] }) {
   // Calculate historical data for each account over the last 6 months
   const historicalAccounts = accounts.map((account) => {
      // Convert history entries to normalized format with proper date objects
      const history = account.history.map(entry => ({
         date: normalizeDate(entry.last_updated.split("T")[0]),
         balance: Number(entry.balance || 0)
      }));

      let lastValidBalance = Number(account.balance || 0);
      const historicalData = [];

      // Generate data points for the last 6 months
      for (let i = 0; i < 6; i++) {
         const monthDate = new Date(today.getUTCFullYear(), today.getUTCMonth() - i + 1, 0);

         // Handle year transition
         if (monthDate.getUTCMonth() < 0) {
            monthDate.setUTCFullYear(monthDate.getUTCFullYear() - 1);
            monthDate.setUTCMonth(monthDate.getUTCMonth() + 12);
         }

         // Find the closest historical record for this month
         const matchingRecord = history.find(
            entry => entry.date.getTime() <= monthDate.getTime()
         );

         const balance = matchingRecord?.balance ?? lastValidBalance;
         historicalData.unshift({ date: monthDate, balance });

         // Update last valid balance if current balance is non-zero
         if (balance !== 0) lastValidBalance = balance;
      }

      return historicalData;
   });

   // Calculate net worth considering account types (assets vs. liabilities)
   const netWorth = accounts.reduce((acc, record) => {
      const multiplier = liabilityTypes.has(record.type) ? -1 : 1;
      return acc + (multiplier * Number(record.balance || 0));
   }, 0);

   // Prepare chart data
   const chartContent = historicalAccounts.length > 0 ? (
      <BarChart
         borderRadius = { 8 }
         colors = {
            accounts.map(acc =>
               liabilityTypes.has(acc.type) ? "hsl(0, 90%, 50%)" : "hsl(210, 98%, 48%)"
            )
         }
         grid = { { horizontal: true } }
         height = { 300 }
         margin = { { left: 50, right: 0, top: 20, bottom: 20 } }
         resolveSizeBeforeRender = { true }
         series = {
            accounts.map((account, index) => ({
               id: account.account_id || String(index),
               label: account.name,
               data: historicalAccounts[index].map(acc => acc.balance),
               stack: String(index)
            }))
         }
         slotProps = { { legend: { hidden: true } } }
         xAxis = {
 [{
    scaleType: "band",
    categoryGapRatio: 0.5,
    data: getLastSixMonths()
 }] as any
         }
         yAxis = {
            [{
               domainLimit: "nice",
               valueFormatter: displayVolume
            }]
         }
      />
   ) : (
      <Stack sx = { { justifyContent: "center", textAlign: "center", height: "300px" } }>
         <Typography
            fontWeight = "bold"
            variant = "body1"
         >
            No available accounts
         </Typography>
      </Stack>
   );

   return (
      <TrendCard
         chart = { chartContent }
         subtitle = "Account balances for the past 6 months"
         title = "Net Worth"
         value = { displayCurrency(netWorth) }
      />
   );
}

export function BudgetTrends() {
   const theme = useTheme();

   // Use theme colors for consistent styling
   const colorPalette = [
      theme.palette.primary.dark,
      theme.palette.primary.main,
      theme.palette.primary.light
   ];

   // Mock data - should be replaced with real data in future PR
   const chartContent = (
      <BarChart
         borderRadius = { 8 }
         colors = { colorPalette }
         grid = { { horizontal: true } }
         height = { 300 }
         margin = { { left: 50, right: 0, top: 20, bottom: 20 } }
         resolveSizeBeforeRender = { true }
         series = {
            [
               {
                  id: "income",
                  label: "Income",
                  data: [45234, 33872, 29198, 49125, 41317, 27389, 29398],
                  stack: "A",
                  color: theme.palette.success.main
               },
               {
                  id: "expenses",
                  label: "Expenses",
                  data: [45234, 33872, 29198, 42125, 51317, 27389, 29398],
                  stack: "B",
                  color: theme.palette.error.main
               }
            ]
         }
         slotProps = { { legend: { hidden: true } } }
         xAxis = {
 [{
    scaleType: "band",
    categoryGapRatio: 0.5,
    data: getLastSixMonths()
 }] as any
         }
         yAxis = {
            [{
               domainLimit: "nice",
               valueFormatter: displayVolume
            }]
         }
      />
   );

   return (
      <TrendCard
         chart = { chartContent }
         extraInfo = {
            <Chip
               color = "success"
               label = "+52%"
               size = "small"
            />
         }
         subtitle = "Income vs. Expenses for the past 6 months"
         title = "Budget"
         value = "$0.00"
      />
   );
}