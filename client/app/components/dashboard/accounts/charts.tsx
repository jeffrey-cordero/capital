import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { type Account, liabilities } from "capital/accounts";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";

import { Trends } from "@/components/dashboard/trends";
import { calculatePercentageChange, getChipColor } from "@/lib/charts";
import { getCurrentDate, normalizeDate } from "@/lib/dates";
import { displayCurrency, displayPercentage } from "@/lib/display";
import { type RootState } from "@/redux/store";

/**
 * The AccountTrends component to display the account trends in the dashboard
 *
 * @param {boolean} isCard - Whether the component is within a card or standalone
 * @returns {React.ReactNode} The AccountTrends component
 */
export default function AccountTrends({ isCard }: { isCard: boolean }): React.ReactNode {
   const theme = useTheme();
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);

   // Process account data with memoization
   const { historicalAccounts, netWorth, percentageChange } = useMemo(() => {
      const today = getCurrentDate();

      // Generate data points for the last 12 months with accounts.history until transactions are implemented
      const historicalAccounts = accounts.map((account) => {
         // Convert history entries to normalized format with proper date objects
         const history = account.history.map(entry => ({
            date: normalizeDate(entry.last_updated.split("T")[0]),
            balance: Number(entry.balance || 0)
         }));
         let lastValidBalance = Number(account.balance || 0);
         let index = 0;
         const historicalData = [];

         for (let i = 12; i >= 0; i--) {
            // Create date for previous month
            const monthDate = new Date(today.getUTCFullYear(), i, 1);

            // Skip future months relative to current data
            if (i > today.getUTCMonth()) {
               historicalData.unshift({ date: monthDate, balance: 0 });
               continue;
            }

            // Find the closest historical record for the current month within the same year
            while ((index < history.length - 1)
               && (history[index].date.getFullYear() === monthDate.getFullYear())
               && (history[index].date.getUTCMonth() > monthDate.getUTCMonth())
            ) index++;

            // Get the balance for the current month
            const balance = history[index]?.balance ?? lastValidBalance;
            historicalData.unshift({ date: monthDate, balance });

            // Update last valid balance
            lastValidBalance = balance;
         }

         return historicalData;
      });

      // Calculate net worth considering account types (assets vs. liabilities)
      const netWorth = accounts.reduce((acc, record) => {
         const multiplier = liabilities.has(record.type) ? -1 : 1;

         return acc + (multiplier * Number(record.balance || 0));
      }, 0);

      // Calculate percentage change from beginning of the year to the current month
      const oldestNetWorth = accounts.reduce((acc, account, index) => {
         const oldest = historicalAccounts[index][0];
         const multiplier = liabilities.has(account.type) ? -1 : 1;

         return acc + (multiplier * oldest.balance);
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
      color: liabilities.has(account.type) ? theme.palette.error.main : theme.palette.primary.main
   })), [accounts, historicalAccounts, theme.palette]);

   return (
      <Trends
         data = { chartData }
         extraInfo = {
            <Chip
               color = { getChipColor(percentageChange) as any }
               label = { `${ percentageChange >= 0 ? "+" : "" }${ displayPercentage(percentageChange) }` }
               size = "small"
            />
         }
         isCard = { isCard }
         subtitle = "Account balances"
         title = "Net Worth"
         value = { displayCurrency(netWorth) }
      />
   );
};