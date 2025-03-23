import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { type Account, liabilityTypes } from "capital/accounts";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import { Trends } from "@/components/dashboard/trends";
import { getChipColor } from "@/components/global/graph";
import { getCurrentDate, normalizeDate } from "@/lib/dates";
import { displayCurrency, displayPercentage } from "@/lib/display";
import { type RootState } from "@/redux/store";

// Calculate percentage change between current and past net worth
function calculatePercentageChange(currentValue: number, historicalValue: number): number {
   if (historicalValue === 0) return 0;

   return ((currentValue - historicalValue) / Math.abs(historicalValue)) * 100;
}

export default function AccountTrends({ isCard }: { isCard: boolean }) {
   const theme = useTheme();
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);

   // Process account data with memoization to prevent unnecessary recalculations
   const { historicalAccounts, netWorth, percentageChange } = useMemo(() => {
      const today = getCurrentDate();

      // Generate data points for the last 12 months
      const historicalAccounts = accounts.map((account) => {
         // Convert history entries to normalized format with proper date objects
         const history = account.history.map(entry => ({
            date: normalizeDate(entry.last_updated.split("T")[0]),
            balance: Number(entry.balance || 0)
         }));

         let lastValidBalance = Number(account.balance || 0);
         const historicalData = [];

         for (let i = 0; i < 12; i++) {
            // Create date for previous month (using 0 as day gets last day of previous month)
            const monthDate = new Date(today.getUTCFullYear(), today.getUTCMonth() - i, 0);

            // Skip future months relative to current data
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

      // Calculate net worth considering account types (assets vs. liabilities)
      const netWorth = accounts.reduce((acc, record) => {
         const multiplier = liabilityTypes.has(record.type) ? -1 : 1;

         return acc + (multiplier * Number(record.balance || 0));
      }, 0);

      // Calculate percentage change from 12 months ago to now
      const oldestNetWorth = accounts.reduce((acc, account, index) => {
         const oldestData = historicalAccounts[index][historicalAccounts[index].length - 1];
         const multiplier = liabilityTypes.has(account.type) ? -1 : 1;

         return acc + (multiplier * oldestData.balance);
      }, 0);

      const percentageChange = calculatePercentageChange(netWorth, oldestNetWorth);

      return { historicalAccounts, netWorth, percentageChange };
   }, [accounts]);

   // Prepare chart data
   const chartData = useMemo(() => accounts.map((account, index) => ({
      id: account.account_id || String(index),
      label: account.name,
      data: historicalAccounts[index].map(acc => acc.balance),
      stack: String(index),
      color: liabilityTypes.has(account.type) ? theme.palette.error.main : theme.palette.primary.main
   })), [accounts, historicalAccounts, theme.palette]);

   return (
      <Trends
         extraInfo = {
            <Chip
               color = { getChipColor(percentageChange) }
               label = { `${ percentageChange >= 0 ? "+" : "" }${ displayPercentage(percentageChange) }` }
               size = "small"
            />
         }
         isCard = { isCard }
         subtitle = "Account balances"
         title = "Net Worth"
         value = { displayCurrency(netWorth) }
         years = { chartData }
      />
   );
};