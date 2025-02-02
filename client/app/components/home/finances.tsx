import { CardContent, Fade, Slide, Typography, useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import { BarChart } from "@mui/x-charts";
import { LineChart } from "@mui/x-charts/LineChart";

import { AreaGradient, getDaysInMonth, StatCard, type StatCardProps } from "@/components/global/stat-card";

const data: StatCardProps[] = [
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

function AccountsParChart() {
   const theme = useTheme();
   const colorPalette = [
      theme.palette.primary.dark,
      theme.palette.primary.main,
      theme.palette.primary.light
   ];

   return (
      <Card
         sx = { { height: "100%", flexGrow: 1, textAlign: "left" } }
         variant = "elevation"
         elevation={3}
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
                     1.3M
                  </Typography>
                  <Chip
                     color = "error"
                     label = "-8%"
                     size = "small"
                  />
               </Stack>
               <Typography
                  sx = { { color: "text.secondary" } }
                  variant = "caption"
               >
                  Account values for the last 6 months
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
                        id: "account1",
                        label: "Account 1",
                        data: [2234, 3872, 2998, 4125, 3357, 2789, 2998],
                        stack: "A"
                     },
                     {
                        id: "account2",
                        label: "Account 2",
                        data: [3098, 4215, 2384, 2101, 4752, 3593, 2384],
                        stack: "B"
                     },
                     {
                        id: "account3",
                        label: "Account 3",
                        data: [4051, 2275, 3129, 4693, 3904, 2038, 2275],
                        stack: "C"
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
                        data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
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
         sx = { { height: "100%", flexGrow: 1, textAlign: "left" } }
         variant = "elevation"
         elevation={3}
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
                     100K
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
                     },
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
                        data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
                     }
                  ] as any
               }
            />
         </CardContent>
      </Card>
   );
}

function SessionsChart() {
   const theme = useTheme();
   const data = getDaysInMonth(4, 2024);

   const colorPalette = [
      theme.palette.primary.light,
      theme.palette.primary.main,
      theme.palette.primary.dark
   ];

   return (
      <Card
         sx = { { height: "100%", flexGrow: 1, textAlign: "left" } }
         variant = "elevation"
         elevation={3}
      >
         <CardContent>
            <Typography
               component = "h2"
               gutterBottom = { true }
               variant = "subtitle2"
            >
               Sessions
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
                     13,277
                  </Typography>
                  <Chip
                     color = "success"
                     label = "+35%"
                     size = "small"
                  />
               </Stack>
               <Typography
                  sx = { { color: "text.secondary" } }
                  variant = "caption"
               >
                  Sessions per day for the last 30 days
               </Typography>
            </Stack>
            <LineChart
               colors = { colorPalette }
               grid = { { horizontal: true } }
               height = { 250 }
               margin = { { left: 50, right: 20, top: 20, bottom: 20 } }
               series = {
                  [
                     {
                        id: "direct",
                        label: "Direct",
                        showMark: false,
                        curve: "linear",
                        stack: "total",
                        area: true,
                        stackOrder: "ascending",
                        data: [
                           300, 900, 600, 1200, 1500, 1800, 2400, 2100, 2700, 3000, 1800, 3300,
                           3600, 3900, 4200, 4500, 3900, 4800, 5100, 5400, 4800, 5700, 6000,
                           6300, 6600, 6900, 7200, 7500, 7800, 8100
                        ]
                     },
                     {
                        id: "referral",
                        label: "Referral",
                        showMark: false,
                        curve: "linear",
                        stack: "total",
                        area: true,
                        stackOrder: "ascending",
                        data: [
                           500, 900, 700, 1400, 1100, 1700, 2300, 2000, 2600, 2900, 2300, 3200,
                           3500, 3800, 4100, 4400, 2900, 4700, 5000, 5300, 5600, 5900, 6200,
                           6500, 5600, 6800, 7100, 7400, 7700, 8000
                        ]
                     },
                     {
                        id: "organic",
                        label: "Organic",
                        showMark: false,
                        curve: "linear",
                        stack: "total",
                        stackOrder: "ascending",
                        data: [
                           1000, 1500, 1200, 1700, 1300, 2000, 2400, 2200, 2600, 2800, 2500,
                           3000, 3400, 3700, 3200, 3900, 4100, 3500, 4300, 4500, 4000, 4700,
                           5000, 5200, 4800, 5400, 5600, 5900, 6100, 6300
                        ],
                        area: true
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
               sx = {
                  {
                     "& .MuiAreaElement-series-organic": {
                        fill: "url('#organic')"
                     },
                     "& .MuiAreaElement-series-referral": {
                        fill: "url('#referral')"
                     },
                     "& .MuiAreaElement-series-direct": {
                        fill: "url('#direct')"
                     }
                  }
               }
               xAxis = {
                  [
                     {
                        scaleType: "point",
                        data,
                        tickInterval: (index, i) => (i + 1) % 5 === 0
                     }
                  ]
               }
            >
               <AreaGradient
                  color = { theme.palette.primary.dark }
                  id = "organic"
               />
               <AreaGradient
                  color = { theme.palette.primary.main }
                  id = "referral"
               />
               <AreaGradient
                  color = { theme.palette.primary.light }
                  id = "direct"
               />
            </LineChart>
         </CardContent>
      </Card>
   );
}

export default function Finances() {
   return (
      <Box
         id = "finances"
         sx = { { width: "100%", mt: "-20px" } }
      >
         <Fade
            in = { true }
            mountOnEnter = { true }
            timeout = { 1000 }
            unmountOnExit = { true }
         >
            <Box>
               <Slide
                  direction = "down"
                  in = { true }
                  mountOnEnter = { true }
                  timeout = { 1000 }
                  unmountOnExit = { true }
               >
                  <Stack
                     direction = "column"
                     sx = { { justifyContent: "center", alignItems: "center", gap: 2 } }
                  >
                     <Box
                        alt = "Finances"
                        component = "img"
                        src = "finances.svg"
                        sx = { { width: 525, height: "auto" } }
                     />
                     <Grid size = { 12 }>
                        <AccountsParChart />
                     </Grid>
                     <Grid size = { 12 }>
                        <BudgetBarChart />
                     </Grid>
                     {
                        data.map((card, index) => (
                           <Grid
                              key = { index }
                              size = { 12 }
                           >
                              <StatCard { ...card } />
                           </Grid>
                        ))
                     }
                     <Grid size = { 12 }>
                        <SessionsChart />
                     </Grid>
                  </Stack>
               </Slide>
            </Box>
         </Fade>
      </Box>
   );
}