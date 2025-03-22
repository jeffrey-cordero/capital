import { Stack, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { type Account, liabilityTypes } from "capital/accounts";
import { useSelector } from "react-redux";

import { TrendCard } from "@/components/dashboard/trends";
import { getCurrentDate, getYearAbbreviations, normalizeDate } from "@/lib/dates";
import { displayCurrency, displayVolume } from "@/lib/display";
import { type RootState } from "@/redux/store";

export function AccountTrends({ elevation }: { elevation: number }) {
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);

   // Generate data points for the last 12 months until transactions are implemented
   const historicalAccounts = accounts.map((account) => {
      // Convert history entries to normalized format with proper date objects
      const history = account.history.map(entry => ({
         date: normalizeDate(entry.last_updated.split("T")[0]),
         balance: Number(entry.balance || 0)
      }));

      const today = getCurrentDate();
      let lastValidBalance = Number(account.balance || 0);
      const historicalData = [];

      for (let i = 0; i < 12; i++) {
         const monthDate = new Date(today.getUTCFullYear(), today.getUTCMonth() - i, 0);

         if (i > today.getUTCMonth()) {
            historicalData.push({ date: monthDate, balance: 0 });
            continue;
         }

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
         historicalData.push({ date: monthDate, balance });

         // Update last valid balance if current balance is non-zero
         if (balance !== 0) lastValidBalance = balance;
      }

      return historicalData;
   });

   // Calculate net worth considering account types (assets vs. liabilities) until transactions are implemented
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
         height = { elevation === 0 ? 400 : 300 }
         margin = { { left: 50, right: 0, top: 20, bottom: 30 } }
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
               data: getYearAbbreviations()
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
         elevation = { elevation }
         subtitle = "Account balances for the past 12 months"
         title = "Net Worth"
         value = { displayCurrency(netWorth) }
      />
   );
}