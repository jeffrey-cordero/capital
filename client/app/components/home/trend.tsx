import { Box, Card, CardContent, Chip, Fade, FormControl, InputLabel, Link, NativeSelect, Slide, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useTheme } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts/LineChart";
import type { IndicatorTrend, StockIndictor, StockTrends } from "capital-types/marketTrends";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { timeSinceLastUpdate } from "@/components/home/news";

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

interface TrendChartProps {
   data: Record<string, IndicatorTrend[]>;
}

export function Indicators(props: TrendChartProps) {
   const { data } = props;
   const theme = useTheme();

   const {
      watch,
      control,
      formState: { errors }
   } = useForm();

   const view = watch("view", "QTD");
   const indicator = watch("indicator", "GDP");
   const from = watch("from", "");
   const to = watch("to", "");

   const sortedData = useMemo(() => {
      return data[indicator].filter((a) => {
         return (from !== "" ? new Date(a.date) >= new Date(from) : true) && (to !== "" ? new Date(a.date) <= new Date(to) : true);
      }).sort((a, b) => {
         return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
   }, [data, from, to, indicator]);

   const getFilteredData = useMemo(() => {
      switch (view) {
         case "QTD":
            // YYYY QX
            const quarters = ["Q1", "Q2", "Q3", "Q4"];
            const quarterData = sortedData.reduce((acc: IndicatorTrend[], d) => {
               const quarter = quarters[Math.floor(new Date(d.date).getMonth() / 3)];
               const title = quarter + " " + new Date(d.date).getFullYear().toString() + `(${d.date})`;

               acc.push({ date: title, value: d.value });
               return acc;
            }, []);

            return quarterData;
         case "YTD":
            // Get all unique years from the data
            const years = Array.from(new Set(sortedData.map(d => new Date(d.date).getFullYear())));

            // Bucket the data by year and calculate the average value for each year
            const bucketedData = years.map((year) => {
               // Filter data for the current year
               const yearData = sortedData.filter(d => new Date(d.date).getFullYear() === year);

               // Calculate the average value for the year
               const yearAverage = yearData.length > 0 ? yearData.reduce((sum, d) => sum + Number(d.value), 0) / yearData.length : 0;

               return {
                  date: year.toString(),
                  value: yearData.length > 0 ? yearAverage : 0
               };
            });

            return bucketedData;
         default:
            return sortedData;
      }
   }, [view, sortedData]);

   const filteredData = getFilteredData.length > 0 ? getFilteredData : [{ date: new Date().toISOString(), value: 0 }];
   const trend = filteredData.length > 0 ? (
      (Number(filteredData[filteredData.length - 1].value) - Number(filteredData[0].value))
      / (Number(filteredData[0].value) !== 0 ? Number(filteredData[0].value) : 1) * 100)
      : (0);
   const color = trend > 0 ? theme.palette.success.main : trend < 0 ? theme.palette.error.main : theme.palette.text.primary;
   const chip = trend > 0 ? "success" : trend < 0 ? "error" : "default";

   const fromValue = from === "" ? sortedData[0].date : from;
   const toValue = to === "" ? sortedData[sortedData.length - 1].date : to;

   return (
      <Card
         elevation = { 3 }
         id = "indicators"
         sx = { { height: "100%", flexGrow: 1, textAlign: "left", borderRadius: 2, py: 1, position: "relative" } }
         variant = "elevation"
      >
         <CardContent>
            <Stack
               direction = "row"
               sx = { { gap: 2, flexWrap: "wrap", alignContent: "center" } }
            >
               <Controller
                  control = { control }
                  name = "indicator"
                  render = {
                     ({ field }) => (
                        <FormControl error = { Boolean(errors.indicator) }>
                           <InputLabel
                              htmlFor = "indicator"
                              variant = "standard"
                           >
                              Indicator
                           </InputLabel>
                           <NativeSelect
                              { ...field }
                              error = { Boolean(errors.indicator) }
                              id = "indicator"
                           >
                              {
                                 Object.keys(data).map((key) => (
                                    <option
                                       key = { key }
                                       value = { key }
                                    >
                                       { key }
                                    </option>
                                 ))
                              }
                           </NativeSelect>
                        </FormControl>
                     )
                  }
               />
               <Controller
                  control = { control }
                  name = "view"
                  render = {
                     ({ field }) => (
                        <FormControl>
                           <InputLabel
                              htmlFor = "view"
                              variant = "standard"
                           >
                              View
                           </InputLabel>
                           <NativeSelect
                              { ...field }
                              id = "view"
                           >
                              <option value = "QTD">QTD</option>
                              <option value = "YTD">YTD</option>
                           </NativeSelect>
                        </FormControl>
                     )
                  }
               />
            </Stack>
            <Stack sx = { { justifyContent: "space-between", mt: 1 } }>
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
                     { indicator === "GDP" ? "$" : "" }
                     {
                        indicator === "GDP" ? (
                           new Intl.NumberFormat().format(Number(filteredData[filteredData.length - 1].value))
                        ) : (
                           Number(filteredData[filteredData.length - 1].value).toFixed(2)
                        )
                     }
                     { indicator === "GDP" ? " billion" : "%" }
                  </Typography>
                  <Chip
                     color = { chip }
                     label = { `${trend.toFixed(2)}%` }
                     size = "small"
                  />
               </Stack>
            </Stack>
            <LineChart
               colors = { [color] }
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
                        area: true,
                        data: filteredData.map(d => Number(d.value))

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
                     "& .MuiAreaElement-series-direct": {
                        fill: "url('#direct')"
                     }
                  }
               }
               xAxis = {
                  [
                     {
                        scaleType: "point",
                        data: filteredData.map(d => d.date)
                     }
                  ]
               }
            >
               <AreaGradient
                  color = { color }
                  id = "direct"
               />
            </LineChart>
            <Stack
               direction = "row"
               sx = { { gap: 2, mt: 2, justifyContent: "space-between", px: 4 } }
            >
               <Controller
                  control = { control }
                  name = "from"
                  render = {
                     ({ field }) => (
                        <FormControl>
                           <TextField
                              { ...field }
                              id = "from"
                              label = "From"
                              size = "small"
                              slotProps = {
                                 {
                                    htmlInput: { min: filteredData[0].date, max: filteredData[filteredData.length - 1].date },
                                    inputLabel: { shrink: true }
                                 }
                              }
                              sx = { { mt: 1 } }
                              type = "date"
                              value = { fromValue }
                           />
                        </FormControl>

                     )
                  }
               />
               <Controller
                  control = { control }
                  name = "to"
                  render = {
                     ({ field }) => (
                        <TextField
                           { ...field }
                           id = "to"
                           label = "To"
                           size = "small"
                           slotProps = {
                              {
                                 htmlInput: { min: filteredData[0].date, max: filteredData[filteredData.length - 1].date },
                                 inputLabel: { shrink: true }
                              }
                           }
                           sx = { { mt: 1 } }
                           type = "date"
                           value = { toValue }
                        />
                     )
                  }
               />
            </Stack>
         </CardContent>
      </Card>

   );
}

export function Stocks(props: StockTrends) {
   const { top_gainers, top_losers, most_actively_traded, last_updated } = props;
   const lastUpdatedDate = last_updated.split(" ");
   const timeSinceLastUpdated = timeSinceLastUpdate(lastUpdatedDate[0] + ":" + lastUpdatedDate[1]);

   const colors = {
      up: "success" as const,
      down: "error" as const,
      neutral: "default" as const
   };

   // Helper function to render a single stock trend
   const renderTrend = (
      title: string,
      data: StockIndictor[],
      trend: "up" | "down" | "neutral",
      image: string
   ) => {
      const color = colors[trend];

      return (
         <Card
            elevation = { 3 }
            sx = { { textAlign: "left", borderRadius: 2, mb: 2, px: 2 } }
            variant = "elevation"
         >
            <CardContent>
               <Box sx = { { textAlign: "center" } }>
                  <Box
                     alt = "Stock"
                     component = "img"
                     src = { image }
                     sx = { { width: 125, height: "auto", mx: "auto", my: 0 } }
                  />
                  <Typography
                     sx = { { mb: 3, fontWeight: "bold" } }
                     variant = "h5"
                  >
                     { title }
                  </Typography>
               </Box>
               {
                  data.map((stock, index) => (
                     <Stack
                        direction = "column"
                        key = { index }
                        sx = { { gap: 1, mb: 2 } }
                     >
                        <Stack
                           direction = "row"
                           sx = { { justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: 1 } }
                        >
                           <Typography
                              component = "p"
                              sx = { { fontWeight: "bold" } }
                              variant = "h6"
                           >
                              <Link
                                 href = { `https://www.google.com/search?q=${stock.ticker}+stock` }
                                 target = "_blank"
                                 underline = "none"
                              >
                                 { stock.ticker } { }
                              </Link>
                           </Typography>
                           <Chip
                              color = { color }
                              label = { stock.change_percentage }
                              size = "small"
                           />
                        </Stack>
                        <Stack
                           direction = "column"
                           sx = { { gap: 1 } }
                        >
                           <Typography
                              fontWeight = "600"
                              variant = "body2"
                           >
                              ${ parseFloat(stock.price).toFixed(2) }
                              { " " }
                              ({ parseFloat(stock.change_amount) < 0 ? "-" : "+" }
                              { Math.abs(parseFloat(stock.change_amount)).toFixed(2) })
                           </Typography>
                           <Typography
                              fontWeight = "600"
                              variant = "body2"
                           >
                              { new Intl.NumberFormat().format(parseInt(stock.volume)) } transactions
                           </Typography>
                        </Stack>
                     </Stack>
                  ))
               }
            </CardContent>
         </Card>
      );
   };

   return (
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
            ><Stack
               direction = "column"
               id = "stocks"
               sx = { { gap: 2, py: 6, textAlign: "center", justifyContent: "center", alignItems: "center" } }
            >
                  <Box className = "animation-container">
                  <Box
                        alt = "Stocks"
                        className = "floating"
                        component = "img"
                        src = "stocks.svg"
                        sx = { { width: 400, height: "auto", mx: "auto" } }
                     />
               </Box>
                  <Typography
                  fontStyle = "italic"
                  fontWeight = "bold"
                  variant = "subtitle2"
               >
                     Last updated { timeSinceLastUpdated }
               </Typography>
                  <Grid
                  container = { true }
                  direction = "row"
                  spacing = { 2 }
                  sx = { { width: "100%" } }
               >
                  <Grid size = { { xs: 12, md: 6, lg: 4, xl: 12 } }>
                        { renderTrend("Top Gainers", top_gainers, "up", "rocket.svg") }
                     </Grid>
                  <Grid size = { { xs: 12, md: 6, lg: 4, xl: 12 } }>
                        { renderTrend("Top Losers", top_losers, "down", "loss.svg") }
                     </Grid>
                  <Grid size = { { xs: 12, lg: 4, xl: 12 } }>
                        { renderTrend("Most Actively Traded", most_actively_traded, "neutral", "active.svg") }
                     </Grid>
               </Grid>
               </Stack>

            </Slide>
         </Box>
      </Fade>

   );
}