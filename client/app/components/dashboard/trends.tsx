import { faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Card,
   CardContent,
   IconButton,
   Stack,
   Typography,
   useMediaQuery,
   useTheme
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { type Account, liabilities } from "capital/accounts";
import { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import ResponsiveChartContainer from "@/components/global/responsive";
import { getCurrentDate, getYearAbbreviations } from "@/lib/dates";
import { displayCurrency, displayVolume, horizontalScroll } from "@/lib/display";
import type { RootState } from "@/redux/store";

/**
 * The data for the chart
 *
 * @type ChartData
 * @property {string} id - The id of the chart data
 * @property {string} label - The label of the chart data
 * @property {number[]} data - The data for the chart
 * @property {string} stack - The stack for the chart
 * @property {string} color - The color for the chart
 */
type ChartData = {
   id: string;
   label: string;
   data: number[];
   stack: string;
   color: string;
}

/**
 * The props for the Trends component
 *
 * @interface TrendProps
 * @property {boolean} isCard - Whether the component is within a card or standalone
 * @property {string} type - The type of the component
 */
interface TrendProps {
   isCard: boolean;
   type: "accounts" | "budgets";
}

/**
 * The Trends component to display the trends of the given data
 *
 * @param {TrendProps} props - The props for the Trends component
 * @returns {React.ReactNode} The Trends component
 */
export function Trends({ type, isCard }: TrendProps): React.ReactNode {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   const graphHeight = isCard ? 300 : (isMobile ? 400 : 500);
   const [year, setYear] = useState<number>(getCurrentDate().getUTCFullYear());
   const transactions = useSelector((state: RootState) => state.transactions.value);
   const accounts = useSelector((state: RootState) => state.accounts.value);

   // Hold references to the last valid year and the backup account indices for missing years
   const lastValidYear = useRef<number>(year);
   const backupAccountIndices = useRef<Record<string, number>>({});

   const today = useMemo(() => getCurrentDate(), []);
   const updateYear = useCallback((direction: "previous" | "next") => {
      setYear(prev => prev + (direction === "previous" ? -1 : 1));
   }, []);

   const formatAccounts = useCallback((account: Account, balance: number, year: number) => {
      const points: number[] = [].concat(...new Array(12).fill([balance]));

      if (year === today.getFullYear()) {
         for (let i = today.getMonth() + 1; i < 12; i++) {
            // Future months are not known yet
            points[i] = null as unknown as number;
         }
      }

      return {
         id: account.account_id || "",
         label: account.name,
         data: points,
         stack: account.account_id || "",
         color: liabilities.has(account.type) ? theme.palette.error.main : theme.palette.primary.main
      };
   }, [today, theme]);

   const trends = useMemo(() => {
      const empty = [].concat(...new Array(12).fill([0]));

      // Store the propagating account balances and indices
      const balances = accounts.reduce((acc, record, index) => {
         acc[record.account_id || ""] = {
            balance: Number(record.balance),
            index: index
         };

         return acc;
      }, {} as Record<string, { balance: number; index: number; }>);

      return transactions.reduce((acc, record) => {
         const year: number = Number(record.date.substring(0, 4));
         const month: number = Number(record.date.substring(5, 7));

         if (!acc[year]) {
            acc[year] = {};

            // Format the budget trends
            acc[year].budgets = type !== "budgets" ? [] : [{
               id: "Income",
               label: "Income",
               data: [...empty],
               stack: "A",
               color: theme.palette.success.main
            }, {
               id: "Expenses",
               label: "Expenses",
               data: [...empty],
               stack: "B",
               color: theme.palette.error.main
            }];

            // Format the account trends
            acc[year].accounts = type !== "accounts" ? [] : accounts.map((account) => {
               return formatAccounts(account, balances[account.account_id || ""].balance, year);
            });
         }

         const amount: number = Math.abs(record.amount);

         // Increment Income or Expense stack based on the transaction amount
         if (type === "budgets") {
            acc[year].budgets[record.amount >= 0 ? 0 : 1].data[month - 1] += amount;
         }

         // Decrement account balance based on the transaction amount as we are going back in time
         if (type === "accounts") {
            if (record.account_id && balances[record.account_id] !== undefined) {
               balances[record.account_id].balance -= record.amount;

               for (let i = 0; i < month - 1; i++) {
                  // Propagate the new balance to the previous months
                  acc[year].accounts[balances[record.account_id].index].data[i] = balances[record.account_id].balance;
               }
            }
         }

         return acc;
      }, {} as Record<string, Record<string, ChartData[]>>);
   }, [transactions, accounts, theme, type, formatAccounts]);

   const series = useMemo(() => {
      if (type === "budgets") {
         // Budgets will always be based on existing year
         return trends[year]?.budgets || [];
      } else {
         // Handle years with no transactions
         if (year in trends) {
            lastValidYear.current = year;
         } else if (!(year in backupAccountIndices.current)) {
            backupAccountIndices.current[year] = lastValidYear.current;
         }

         // Accounts will be based on the existing year or backup data for last valid year
         const backupIndex = backupAccountIndices.current[year] || lastValidYear.current;

         if (Object.keys(trends).length > 0) {
            return trends[year]?.accounts || trends[backupIndex]?.accounts.map((account) => ({
               ...account,
               data: [].concat(...new Array(12).fill([account.data[0]]))
            })) || [];
         } else {
            // Handle missing accounts / transactions
            return accounts.map((account) => {
               return formatAccounts(account, account.balance, year);
            });
         }
      }
   }, [trends, year, type, accounts, formatAccounts]);

   const netWorth = useMemo(() => {
      return (type === "accounts" ? series : []).reduce((acc, record) => {
         // Account for assets vs. liabilities
         const multiplier = record.color === theme.palette.error.main ? -1 : 1;

         return acc + (multiplier * (year === today.getFullYear() ? record.data[today.getMonth()] : record.data[11]));
      }, 0);
   }, [series, year, type, today, theme.palette.error.main]);

   // Memoize the essential chart-related values
   const yearAbbreviations = useMemo(() => getYearAbbreviations(year), [year]);
   const colorPalette = useMemo(() => [
      theme.palette.primary.dark,
      theme.palette.primary.main,
      theme.palette.primary.light
   ], [theme.palette.primary]);
   const chart = useMemo(() => (
      <ResponsiveChartContainer height = { graphHeight }>
         {
            series.length > 0 ? (
               <BarChart
                  borderRadius = { 8 }
                  colors = { colorPalette }
                  grid = { { horizontal: true } }
                  height = { graphHeight }
                  margin = { { left: isCard ? 50 : 40, right: 20, top: 20, bottom: 20 } }
                  resolveSizeBeforeRender = { true }
                  series = { series }
                  slotProps = { { legend: { hidden: true } } }
                  xAxis = { [{ scaleType: "band", categoryGapRatio: 0.3, data: yearAbbreviations }] as any }
                  yAxis = { [{ domainLimit: "nice", valueFormatter: displayVolume }] }
               />
            ) : (
               <Stack
                  sx = { { height: "100%", width: "100%", alignItems: "center", justifyContent: "center" } }
               >
                  <Typography
                     sx = { { fontWeight: "600" } }
                     variant = "subtitle2"
                  >
                     No available data
                  </Typography>
               </Stack>
            )
         }
      </ResponsiveChartContainer>
   ), [colorPalette, isCard, yearAbbreviations, series, graphHeight]);

   return (
      <Box sx = { { position: "relative" } }>
         <Card
            elevation = { isCard ? 3 : 0 }
            sx = { { borderRadius: 2, backgroundColor: isCard ? undefined : "transparent" } }
            variant = "elevation"
         >
            <CardContent sx = { { py: isCard ? 2.5 : 0, px: isCard ? 0.25 : 0, textAlign: isCard ? { xs: "center", lg: "left" } : "center" } }>
               <Box sx = { { px: isCard ? 2.25 : 0, mb: -0.25 } }>
                  <Typography
                     gutterBottom = { true }
                     sx = { { mb: 0, fontWeight: "600" } }
                     variant = "subtitle2"
                  >
                     { type === "accounts" ? "Accounts" : "Budgets" }
                  </Typography>
                  <Stack sx = { { justifyContent: "space-between" } }>
                     <Stack
                        direction = { isCard ? { xs: "column", lg: "row" } : "column" }
                        sx = {
                           {
                              ...horizontalScroll(theme),
                              maxWidth: "100%",
                              alignItems: "center",
                              textAlign: isCard ? "left" : "center",
                              columnGap: 1,
                              rowGap: 0.5,
                              mx: "auto",
                              ml: isCard ? { xs: "auto", lg: 0 } : "auto"
                           }
                        }
                     >
                        {
                           type === "accounts" ? (
                              <Typography
                                 sx = { { fontWeight: "600" } }
                                 variant = "subtitle1"
                              >
                                 { displayCurrency(netWorth) }
                              </Typography>
                           ) : (
                              <Typography
                                 sx = { { fontWeight: "600", pb: { xs: 0, lg: 0.7 } } }
                                 variant = "subtitle2"
                              >
                                 Income vs. Expenses
                              </Typography>
                           )
                        }
                     </Stack>
                  </Stack>
               </Box>
               { chart }
            </CardContent>
         </Card>
         {
            !isCard && (
               <Stack
                  direction = "row"
                  spacing = { 2 }
                  sx = { { justifyContent: "space-between", alignItems: "center", mt: -2, px: 1 } }
               >
                  <IconButton
                     disabled = { year === 1800 }
                     onClick = { () => updateYear("previous") }
                     size = "medium"
                     sx = { { color: theme.palette.primary.main } }
                  >
                     <FontAwesomeIcon
                        icon = { faAnglesLeft }
                        size = "sm"
                     />
                  </IconButton>
                  <IconButton
                     disabled = { year === today.getFullYear() }
                     onClick = { () => updateYear("next") }
                     size = "medium"
                     sx = { { color: theme.palette.primary.main } }
                  >
                     <FontAwesomeIcon
                        icon = { faAnglesRight }
                        size = "sm"
                     />
                  </IconButton>
               </Stack>
            )
         }
      </Box>
   );
}