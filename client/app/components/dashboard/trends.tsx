import { Card, CardContent, Stack, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { type Account, decrementingTypes } from "capital/accounts";

import { getLastSixMonths, normalizeDate, today } from "@/lib/dates";
import { displayCurrency, ellipsis } from "@/lib/display";

export default function AccountTrends({ accounts }: { accounts: Account[] }) {
   const historicalAccounts = accounts.map((account) => {
      // Format the history array into the proper types
      const history = account.history.map(entry => ({
         date: normalizeDate(entry.last_updated.split("T")[0]),
         balance: Number(entry.balance || 0)
      }));

      // Generate 6 months of historical data
      let lastValidBalance = Number(account.balance || 0);
      const historicalData = [];

      for (let i = 0; i < 6; i++) {
         // Calculate the date for this month, handling year rollover
         const monthDate = new Date(
            today.getUTCFullYear(),
            today.getUTCMonth() - i + 1,
            0
         );

         // Adjust for year rollover if we've crossed into the previous year
         if (monthDate.getUTCMonth() < 0) {
            monthDate.setUTCFullYear(monthDate.getUTCFullYear() - 1);
            monthDate.setUTCMonth(monthDate.getUTCMonth() + 12);
         }

         // Find the most recent historical record for this month
         const matchingRecord = history.find(
            entry => {
               return entry.date.getTime() <= monthDate.getTime();
            }
         );

         // Use the most recent balance or the last known balance
         const balance = matchingRecord ? Number(matchingRecord.balance) : lastValidBalance;

         historicalData.unshift({
            date: monthDate,
            balance: balance
         });

         // Update last valid balance, ensuring it's a non-zero value
         if (balance !== 0) {
            lastValidBalance = balance;
         }
      }

      return historicalData;
   });

   const netWorth = accounts.reduce((acc, record) => {
      // Account for potential decrementing in net worth
      const multiplier = decrementingTypes.has(record.type) ? -1 : 1;

      return acc + (multiplier * Number(record.balance || 0));
   }, 0);

   return (
      <Card
         elevation = { 3 }
         sx = { { height: "100%", flexGrow: 1, textAlign: "left", borderRadius: 2 } }
         variant = "elevation"
      >
         <CardContent>
            <Typography
               component = "h2"
               gutterBottom = { true }
               variant = "subtitle2"
            >
               Net Worth
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
                     { displayCurrency(netWorth) }
                  </Typography>
               </Stack>
               <Typography
                  sx = { { color: "text.secondary" } }
                  variant = "caption"
               >
                  Account balances for the last 6 months
               </Typography>
            </Stack>
            <BarChart
               borderRadius = { 8 }
               colors = { accounts.map((acc) => decrementingTypes.has(acc.type) ? "hsl(0, 90%, 50%)" : "hsl(210, 98%, 48%)") }
               grid = { { horizontal: true } }
               height = { 250 }
               margin = { { left: 50, right: 0, top: 20, bottom: 20 } }
               series = {
                  accounts.map((account, index) => {
                     return {
                        id: account.account_id || "" + index,
                        label: account.name,
                        data: historicalAccounts[index].map((account) => account.balance),
                        stack: String(index)
                     };
                  })
               }
               slotProps = {
                  {
                     legend: {
                        hidden: true
                     }
                  }
               }
               xAxis = {
                  [
                     {
                        scaleType: "band",
                        categoryGapRatio: 0.5,
                        data: getLastSixMonths()
                     }
                  ] as any
               }
            />
         </CardContent>
      </Card>
   );
}