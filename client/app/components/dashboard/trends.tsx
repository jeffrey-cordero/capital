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
import { type Account, LIABILITIES } from "capital/accounts";
import {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState
} from "react";
import { useSelector } from "react-redux";

import ChartContainer from "@/components/global/chart-container";
import { breakpoints, heights } from "@/components/global/graph";
import { getCurrentDate, getYearAbbreviations } from "@/lib/dates";
import { displayCurrency, displayVolume, horizontalScroll } from "@/lib/display";
import type { RootState } from "@/redux/store";

/**
 * Data structure for chart visualization
 *
 * @property {string} id - Chart data identifier
 * @property {string} label - Display label
 * @property {number[]} data - Data points for visualization
 * @property {string} stack - Stack identifier for grouped data
 * @property {string} color - Visual color for the data series
 */
type ChartData = {
   id: string;
   label: string;
   data: number[];
   stack: string;
   color: string;
}

/**
 * Props for the Trends component
 *
 * @property {boolean} isCard - Whether component is displayed in card format
 * @property {string} type - Data type to display ("accounts" or "budgets")
 */
interface TrendProps {
   isCard: boolean;
   type: "accounts" | "budgets";
}

/**
 * Displays account or budget trends with interactive year navigation
 *
 * @param {TrendProps} props - Trends component props
 * @returns {React.ReactNode} The Trends component
 */
export function Trends({ type, isCard }: TrendProps): React.ReactNode {
   const theme = useTheme();
   const transactions = useSelector((state: RootState) => state.transactions.value);
   const accounts = useSelector((state: RootState) => state.accounts.value);
   const [year, setYear] = useState<number>(getCurrentDate().getFullYear());

   // Hold references to the last valid year and the backup account indices for missing years
   const lastValidYear = useRef<number>(year);
   const backupAccountIndices = useRef<Record<string, number>>({});

   // Account for graph responsiveness
   const { xss, xs, sm, md, lg, xl, xll } = {
      xss: useMediaQuery(breakpoints.xss),
      xs: useMediaQuery(breakpoints.xs),
      sm: useMediaQuery(breakpoints.sm),
      md: useMediaQuery(breakpoints.md),
      lg: useMediaQuery(breakpoints.lg),
      xl: useMediaQuery(breakpoints.xl),
      xll: useMediaQuery(breakpoints.xll)
   };
   const height = useMemo(() => {
      switch (true) {
         case xss:
            return heights.xss;
         case xs:
            return heights.xs;
         case sm:
            return heights.sm;
         case md:
            return heights.md;
         case lg:
            return heights.lg;
         case xl:
            return heights.xl;
         case xll:
            return heights.xxl;
         default:
            return isCard ? heights.sm : heights.xxl;
      }
   }, [xss, xs, sm, md, lg, xl, xll, isCard]);

   // Memoize the current year and year update handler
   const today = useMemo(() => getCurrentDate(), []);
   const updateYear = useCallback((direction: "previous" | "next") => {
      setYear(prev => prev + (direction === "previous" ? -1 : 1));
   }, []);

   // Bar chart normalization handlers
   const formatAccounts = useCallback((account: Account, balance: number, year: number) => {
      const points: number[] = [].concat(...new Array(12).fill([balance]));

      if (year === today.getFullYear()) {
         // Ensure future months are nulled out
         for (let i = today.getMonth() + 1; i < 12; i++) {
            points[i] = null as unknown as number;
         }
      }

      return {
         id: account.account_id || "",
         label: account.name,
         data: points,
         stack: account.account_id || "",
         color: LIABILITIES.has(account.type || "") ? theme.palette.error.main : theme.palette.primary.main
      };
   }, [today, theme]);

   const formatBudgets = useCallback(() => {
      const empty = [].concat(...new Array(12).fill([0]));

      return [{
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

   }, [theme]);

   const trends = useMemo(() => {
      // Store the rolling account balances and indices
      const balances = accounts.reduce((acc, record, index) => {
         acc[record.account_id || ""] = {
            balance: record.balance,
            index: index
         };

         return acc;
      }, {} as Record<string, { balance: number; index: number; }>);

      const trends = transactions.reduce((acc, record) => {
         const year: number = Number(record.date!.substring(0, 4));
         const month: number = Number(record.date!.substring(5, 7));

         if (!acc[year]) {
            // Format the respective trends object
            acc[year] = {};
            acc[year].budgets = type === "budgets" && transactions.length > 0 ? formatBudgets() : [];
            acc[year].accounts = type !== "accounts" ? [] : accounts.map((account) => {
               return formatAccounts(account, balances[account.account_id || ""].balance, year);
            });
         }

         const amount: number = Math.abs(record.amount);

         // Increment Income/Expense stack based on the absolute transaction amount
         if (type === "budgets") {
            acc[year].budgets[record.type! === "Income" ? 0 : 1].data[month - 1] += amount;
         }

         // Decrement the potential account balance based on the real transaction amount
         if (type === "accounts") {
            if (record.account_id && balances[record.account_id] !== undefined) {
               // Generally, income-related transactions should decrement the balance, while expenses should increment it
               balances[record.account_id].balance += record.type! === "Income" ? -amount : amount;

               for (let i = 0; i < month - 1; i++) {
                  // Propagate the new balance to the previous months
                  acc[year].accounts[balances[record.account_id].index].data[i] = balances[record.account_id].balance;
               }
            }
         }

         return acc;
      }, {} as Record<string, Record<string, ChartData[]>>);

      if (type === "accounts" && accounts.length > 0 && !trends[year]) {
         // Default to display the current balance of the accounts
         trends[year] = {
            accounts: accounts.map((account) => formatAccounts(account, balances[account.account_id || ""].balance, year))
         };
      }

      return trends;
   }, [transactions, accounts, year, type, formatAccounts, formatBudgets]);

   const series = useMemo(() => {
      if (type === "budgets") {
         // Trends will be based on the existing year
         return trends[year]?.budgets || [];
      } else {
         // Trends will be based on the existing year or backup data for last valid year in the future
         if (year in trends) {
            lastValidYear.current = year;
         } else if (!(year in backupAccountIndices.current)) {
            backupAccountIndices.current[year] = lastValidYear.current;
         }

         const backupIndex = backupAccountIndices.current[year] || lastValidYear.current;

         if (Object.keys(trends).length > 0) {
            // Available transactions for existing accounts
            return (trends[year]?.accounts) || (trends[backupIndex]?.accounts || [])?.map((account) => ({
               ...account,
               data: [].concat(...new Array(12).fill([account.data[0]]))
            }));
         } else {
            // No available transactions tied to existing accounts
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

         // Base the net worth on the current month of the current year or the last month of the year
         return acc + (multiplier * (year === today.getFullYear() ? record.data[today.getMonth()] : record.data[11]));
      }, 0);
   }, [series, year, type, today, theme.palette.error.main]);

   // Memoize the essential chart-related attributes
   const yearAbbreviations = useMemo(() => getYearAbbreviations(year), [year]);
   const colorPalette = useMemo(() => [
      theme.palette.primary.dark,
      theme.palette.primary.main,
      theme.palette.primary.light
   ], [theme.palette.primary]);
   const chart = useMemo(() => (
      <ChartContainer height = { height }>
         {
            series.length > 0 ? (
               <BarChart
                  borderRadius = { 8 }
                  colors = { colorPalette }
                  grid = { { horizontal: true } }
                  height = { height }
                  margin = { { left: isCard ? 50 : 40, right: 20, top: 20, bottom: 20 } }
                  resolveSizeBeforeRender = { true }
                  series = { series }
                  slotProps = { { legend: { hidden: true } } }
                  xAxis = { [{ scaleType: "band", categoryGapRatio: 0.2, data: yearAbbreviations }] as any }
                  yAxis = { [{ domainLimit: "nice", valueFormatter: displayVolume }] }
               />
            ) : (
               <Stack
                  sx = { { height: "100%", width: "100%", alignItems: "center", justifyContent: "center" } }
               >
                  <Typography
                     data-testid = { `empty-${type}-trends-overview` }
                     sx = { { fontWeight: "600" } }
                     variant = "subtitle2"
                  >
                     No available { type === "accounts" ? "accounts" : "transactions" }
                  </Typography>
               </Stack>
            )
         }
      </ChartContainer>
   ), [colorPalette, isCard, type, yearAbbreviations, series, height]);

   useEffect(() => {
      const timeout = setTimeout(() => {
         series.forEach((value) => {
            const id: string = value.id;
            const bars: NodeListOf<SVGRectElement> = document.querySelectorAll(`.MuiBarElement-series-${id}`);

            bars.forEach((barEl: SVGRectElement, barIndex: number) => {
               barEl.setAttribute("data-testid", `${type}-${id}-bar-${barIndex}`);
               barEl.setAttribute("data-bar-chart-color", value.color);
               barEl.setAttribute("data-bar-chart-value", value.data[barIndex]?.toString() || "null");
            });
         });
      }, 0);

      return () => clearTimeout(timeout);
   }, [series, type, year]);

   return (
      <Box
         data-testid = { `${type}-trends-container` }
         data-year = { year }
         sx = { { position: "relative" } }
      >
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
                                 data-testid = "accounts-net-worth"
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
                        data-testid = { `${type}-navigate-back` }
                        icon = { faAnglesLeft }
                        size = "sm"
                     />
                  </IconButton>
                  <Typography
                     sx = { { fontWeight: "600" } }
                     variant = "subtitle2"
                  >
                     { year }
                  </Typography>
                  <IconButton
                     disabled = { year === today.getFullYear() }
                     onClick = { () => updateYear("next") }
                     size = "medium"
                     sx = { { color: theme.palette.primary.main } }
                  >
                     <FontAwesomeIcon
                        data-testid = { `${type}-navigate-forward` }
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