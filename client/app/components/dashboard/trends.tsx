import { faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Card,
   CardContent,
   IconButton,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { liabilities } from "capital/accounts";
import {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState
} from "react";
import { useSelector } from "react-redux";

import { getCurrentDate, getYearAbbreviations } from "@/lib/dates";
import { displayVolume, horizontalScroll } from "@/lib/display";
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
   const [year, setYear] = useState<number>(getCurrentDate().getUTCFullYear());
   const lastValidYear = useRef<number>(year);
   const validYears = useRef<Record<number, number>>({ [year]: year });

   const transactions = useSelector((state: RootState) => state.transactions.value);
   const accounts = useSelector((state: RootState) => state.accounts.value);

   const updateYear = useCallback((direction: "previous" | "next") => {
      setYear(prev => prev + (direction === "previous" ? -1 : 1));
   }, []);

   const trends = useMemo(() => {
      const empty = [].concat(...new Array(12).fill([0]));
      const currentMonth = getCurrentDate().getUTCMonth() + 1;
      return transactions.reduce((acc, record) => {
         const period: string = record.date.substring(0, 7);
         const year: number = Number(record.date.substring(0, 4));
         const month: number = Number(record.date.substring(5, 7));

         // Store the balances, indices, and visited periods for the accounts
         const balances = accounts.reduce((acc, record, index) => {
            acc[record.account_id] = {
               balance: Number(record.balance),
               index: index,
               periods: {}
            };

            return acc;
         }, {} as Record<string, { balance: number; index: number; periods: Record<string, boolean> }>);

         if (!acc[year]) {
            // Initialize the chart settings for the year
            acc[year] = {};
            acc[year].budgets = [{
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

            // Format the default account data, where array is based on most recent balance
            acc[year].accounts = accounts.map(account => ({
               id: account.account_id,
               label: account.name,
               data: [].concat(...new Array(12).fill([balances[account.account_id].balance])),
               stack: account.account_id,
               color: liabilities.has(account.type) ? theme.palette.error.main : theme.palette.primary.main
            }));
         }

         // Increment the budget-based data
         const amount: number = Math.abs(record.amount);
         acc[year].budgets[record.amount >= 0 ? 0 : 1].data[month - 1] += amount;

         // Update the account-based data, if applicable
         if (record.account_id) balances[record.account_id].balance += record.amount;
         
         if (record.account_id && month !== currentMonth) {
            // Extend the most recent balance to the start of the year
            for (let i = 0; i < month - 1; i++) {
               console.log(i, balances[record.account_id].balance);
               acc[year].accounts[balances[record.account_id].index].data[i] = balances[record.account_id].balance;
            }

            balances[record.account_id].periods[period] = true;
         }

         return acc;
      }, {} as Record<string, Record<string, ChartData[]>>);
   }, [transactions, accounts, theme]);

   useEffect(() => {
      if (year in trends) {
         // Update the last valid year for account balances
         lastValidYear.current = year;
      }

      if (!(year in validYears.current)) {
         // Store the index to the next valid set of account balances
         validYears.current[year] = lastValidYear.current;
      }
   }, [year, trends]);

   // Memoize the essential chart-related values
   const currentYear = useMemo(() => getCurrentDate().getUTCFullYear(), []);
   const yearAbbreviations = useMemo(() => getYearAbbreviations(year), [year]);
   const colorPalette = useMemo(() => [
      theme.palette.primary.dark,
      theme.palette.primary.main,
      theme.palette.primary.light
   ], [theme.palette.primary]);
   const chart = useMemo(() => (
      <BarChart
         borderRadius = { 8 }
         colors = { colorPalette }
         grid = { { horizontal: true } }
         height = { isCard ? 300 : 500 }
         margin = { { left: 50, right: 0, top: 20, bottom: 30 } }
         resolveSizeBeforeRender = { true }
         series = { 
            // Account values should be the same as the next year for missing years
            type === "accounts" ? (trends[year] || trends[validYears.current[year] || lastValidYear.current]).accounts || []
            // Missing budget years should be empty
            : trends[year]?.budgets || []
         }
         slotProps = { { legend: { hidden: true } } }
         xAxis = { [{ scaleType: "band", categoryGapRatio: 0.5, data: yearAbbreviations }] as any }
         yAxis = { [{ domainLimit: "nice", valueFormatter: displayVolume }] }
      />
   ), [colorPalette, isCard, yearAbbreviations, trends, year, type]);

   return (
      <Box sx = { { position: "relative" } }>
         <Card
            elevation = { isCard ? 3 : 0 }
            sx = { { borderRadius: 2, backgroundColor: isCard ? undefined : "transparent" } }
            variant = "elevation"
         >
            <CardContent sx = { { p: isCard ? 2.5 : 0, textAlign: isCard ? { xs: "center", lg: "left" } : "center" } }>
               <Typography
                  gutterBottom = { true }
                  sx = { { mb: 0, fontWeight: "600" } }
                  variant = "subtitle2"
               >
                  { type === "accounts" ? "Net Worth" : "Budgets" }
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
                     <Typography
                        component = "p"
                        variant = "h6"
                     >
                        { "$0.00" }
                     </Typography>
                  </Stack>
               </Stack>
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
                     disabled = { year === currentYear }
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