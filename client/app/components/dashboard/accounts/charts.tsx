import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { type Account, liabilityTypes } from "capital/accounts";
import { useSelector } from "react-redux";

import { Trends } from "@/components/dashboard/trends";
import { getCurrentDate, normalizeDate } from "@/lib/dates";
import { displayCurrency } from "@/lib/display";
import { type RootState } from "@/redux/store";

export function AccountTrends({ isCard }: { isCard: boolean }) {
   const theme = useTheme();
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

   return (
      <Trends
         extraInfo = {
            <Chip
               color = "error"
               label = "-12%"
               size = "small"
            />
         }
         isCard = { isCard }
         subtitle = "Account balances"
         title = "Net Worth"
         value = { displayCurrency(netWorth) }
         years = {
            accounts.map((account, index) => ({
               id: account.account_id || String(index),
               label: account.name,
               data: historicalAccounts[index].map(acc => acc.balance),
               stack: String(index),
               color: liabilityTypes.has(account.type) ? theme.palette.error.main : theme.palette.primary.main
            }))
         }
      />
   );
}