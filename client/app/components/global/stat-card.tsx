import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { areaElementClasses } from "@mui/x-charts/LineChart";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";

export type StatCardProps = {
   title: string;
   value: string;
   interval: string;
   trend: "up" | "down" | "neutral";
   data: number[];
};

export function getDaysInMonth(month: number, year: number) {
   const date = new Date(year, month, 0);
   const monthName = date.toLocaleDateString("en-US", {
      month: "short"
   });
   const daysInMonth = date.getDate();
   const days = [];
   let i = 1;
   while (days.length < daysInMonth) {
      days.push(`${monthName} ${i}`);
      i += 1;
   }
   return days;
}

export function AreaGradient({ color, id }: { color: string; id: string }) {
   return (
      <defs>
         <linearGradient
            id = { id }
            x1 = "50%"
            x2 = "50%"
            y1 = "0%"
            y2 = "100%"
         >
            <stop
               offset = "0%"
               stopColor = { color }
               stopOpacity = { 0.3 }
            />
            <stop
               offset = "100%"
               stopColor = { color }
               stopOpacity = { 0 }
            />
         </linearGradient>
      </defs>
   );
}

export function StatCard(props: StatCardProps) {
   const { title, value, interval, trend, data } = props;
   const theme = useTheme();
   const daysInWeek = getDaysInMonth(4, 2024);

   const trendColors = {
      up:
         theme.palette.mode === "light"
            ? theme.palette.success.main
            : theme.palette.success.dark,
      down:
         theme.palette.mode === "light"
            ? theme.palette.error.main
            : theme.palette.error.dark,
      neutral:
         theme.palette.mode === "light"
            ? theme.palette.info.main
            : theme.palette.info.dark
   };

   const labelColors = {
      up: "success" as const,
      down: "error" as const,
      neutral: "default" as const
   };

   const color = labelColors[trend];
   const chartColor = trendColors[trend];
   const trendValues = { up: "+25%", down: "-25%", neutral: "+5%" };

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
               { title }
            </Typography>
            <Stack
               direction = "column"
               sx = { { justifyContent: "space-between", flexGrow: "1", gap: 1 } }
            >
               <Stack sx = { { justifyContent: "space-between" } }>
                  <Stack
                     direction = "row"
                     sx = { { justifyContent: "space-between", alignItems: "center" } }
                  >
                     <Typography
                        component = "p"
                        variant = "h4"
                     >
                        { value }
                     </Typography>
                     <Chip
                        color = { color }
                        label = { trendValues[trend] }
                        size = "small"
                     />
                  </Stack>
                  <Typography
                     sx = { { color: "text.success" } }
                     variant = "caption"
                  >
                     { interval }
                  </Typography>
               </Stack>
               <Box sx = { { width: "100%", height: 50 } }>
                  <SparkLineChart
                     area = { true }
                     colors = { [chartColor] }
                     data = { data }
                     showHighlight = { true }
                     showTooltip = { true }
                     sx = {
                        {
                           [`& .${areaElementClasses.root}`]: {
                              fill: `url(#area-gradient-${value})`
                           }
                        }
                     }
                     xAxis = {
                        {
                           scaleType: "band",
                           data: daysInWeek
                        }
                     }
                  >
                     <AreaGradient
                        color = { chartColor }
                        id = { `area-gradient-${value}` }
                     />
                  </SparkLineChart>
               </Box>
            </Stack>
         </CardContent>
      </Card>
   );
}