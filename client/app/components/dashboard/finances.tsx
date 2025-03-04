import { CardContent, Fade, Slide, Typography, useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import { BarChart } from "@mui/x-charts";
import type { Account } from "capital/accounts";
import { useMemo } from "react";

import { Trend, type TrendProps } from "@/components/global/trend";
import { constructDate, formatDate, getLastSixMonths, today } from "@/lib/dates";

const data: TrendProps[] = [
   {
      title: "Income",
      value: "100k",
      interval: "Last 30 days",
      trend: "up",
      data: [
         200, 24, 220, 260, 240, 380, 100, 240, 280, 240, 300, 340, 320, 360, 340, 380,
         360, 400, 380, 420, 400, 640, 340, 460, 440, 480, 460, 600, 880, 920
      ]
   },
   {
      title: "Expenses",
      value: "325",
      interval: "Last 30 days",
      trend: "down",
      data: [
         1640, 1250, 970, 1130, 1050, 900, 720, 1080, 900, 450, 920, 820, 840, 600, 820,
         780, 800, 760, 380, 740, 660, 620, 840, 500, 520, 480, 400, 360, 300, 220
      ]
   },
   {
      title: "Net Worth",
      value: "200k",
      interval: "Last 30 days",
      trend: "neutral",
      data: [
         500, 400, 510, 530, 520, 600, 530, 520, 510, 730, 520, 510, 530, 620, 510, 530,
         520, 410, 530, 520, 610, 530, 520, 610, 530, 420, 510, 430, 520, 510
      ]
   }
];

function AccountsParChart({ accounts }: { accounts: Account[] }) {
   const historicalAccounts = useMemo(() => {
      return accounts.map((account) => {
         // Format the history array into the proper types
         const history = account.history.map(entry => ({
            date: formatDate(entry.last_updated),
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
   }, [accounts]);

   const total = useMemo(() => {
      return accounts.reduce((acc, record) => acc + Number(record.balance || 0), 0);
   }, [accounts]);

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
               Accounts
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
                     variant = "h4"
                  >
                     ${
                        new Intl.NumberFormat("en-US", {
                           minimumFractionDigits: 2, maximumFractionDigits: 2
                        }).format(total)
                     }
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
               colors = { ["hsl(210, 98%, 48%)"] }
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
                     }
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

function BudgetBarChart() {
   const theme = useTheme();
   const colorPalette = [
      theme.palette.primary.dark,
      theme.palette.primary.main,
      theme.palette.primary.light
   ];

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
               Budget
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
                     variant = "h4"
                  >
                     $0.00
                  </Typography>
                  <Chip
                     color = "success"
                     label = "+52%"
                     size = "small"
                  />
               </Stack>
               <Typography
                  sx = { { color: "text.secondary" } }
                  variant = "caption"
               >
                  Income vs. Expenses for the last 6 months
               </Typography>
            </Stack>
            <BarChart
               borderRadius = { 8 }
               colors = { colorPalette }
               grid = { { horizontal: true } }
               height = { 250 }
               margin = { { left: 50, right: 0, top: 20, bottom: 20 } }
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

export default function Finances({ accounts }: { accounts: Account[] }) {
   return (
      <Box
         id = "marketTrends"
         sx = { { width: "100%" } }
      >
         <Fade
            in = { true }
            mountOnEnter = { true }
            timeout = { 1000 }
            unmountOnExit = { true }
         >
            <Box>
               <Slide
                  direction = "up"
                  in = { true }
                  mountOnEnter = { true }
                  timeout = { 1000 }
                  unmountOnExit = { true }
               >
                  <Stack
                     direction = "column"
                     sx = { { justifyContent: "center", alignItems: "center", gap: 2 } }
                  >
                     <Box className = "animation-container">
                        <Box
                           alt = "Finances"
                           className = "floating"
                           component = "img"
                           src = "/svg/finances.svg"
                           sx = { { width: 435, height: "auto" } }
                        />
                     </Box>
                     <Grid size = { 12 }>
                        <AccountsParChart accounts = { accounts } />
                     </Grid>
                     <Grid size = { 12 }>
                        <BudgetBarChart />
                     </Grid>
                     <Grid
                        container = { true }
                        direction = "column"
                        spacing = { 2 }
                        sx = { { width: "100%" } }
                     >
                        {
                           data.map((card, index) => (
                              <Grid
                                 key = { `stat-${index}` }
                                 size = { { xs: 12 } }
                              >
                                 <Trend { ...card } />
                              </Grid>
                           ))
                        }
                     </Grid>
                  </Stack>
               </Slide>
            </Box>
         </Fade>
      </Box>
   );
}