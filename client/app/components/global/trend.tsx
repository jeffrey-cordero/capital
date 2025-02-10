
import { Box, Card, CardContent, Chip, FormControl, Input, InputLabel, Link, NativeSelect, OutlinedInput, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useTheme } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts/LineChart";
import type { IndicatorTrend, StockIndictor, StockTrends } from "capital-types/marketTrends";
import { useMemo, useState } from "react";

import { timeSinceLastUpdate } from "@/components/home/news";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const indicatorSchema = z.object({
   indicator: z.string().regex(/^(GDP|Inflation|Unemployment|Treasury Yield|Federal Interest)$/),
   view: z.string().regex(/^(QTD|YTD)$/)
});

export function AreaGradient({ color, id }: { color: string; id: string }) {
   return (
      <defs>
         <linearGradient
            id={id}
            x1="50%"
            x2="50%"
            y1="0%"
            y2="100%"
         >
            <stop
               offset="0%"
               stopColor={color}
               stopOpacity={0.3}
            />
            <stop
               offset="100%"
               stopColor={color}
               stopOpacity={0}
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
      handleSubmit,
      formState: { errors }
   } = useForm({
      resolver: zodResolver(indicatorSchema)
   });

   const indicator = watch("indicator", "GDP");
   const view = watch("view", "QTD");

   console.log(indicator, errors.indicator, indicatorSchema.shape.indicator.safeParse(indicator));

   const colorPalette = [
      theme.palette.success.light,
      theme.palette.success.main,
      theme.palette.success.dark
   ];

   const sortedData = useMemo(
      () => data[indicator].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ), [data, indicator]);

   const getFilteredData = useMemo(() => {
      switch (view) {
         case "QTD":
            return sortedData;
         case "YTD":
            // Get all unique years from the data
            const years = Array.from(new Set(sortedData.map(d => new Date(d.date).getFullYear())));

            // Bucket the data by year and calculate the average value for each year
            const bucketedData = years.map(year => {
               // Filter data for the current year
               const yearData = sortedData.filter(d => new Date(d.date).getFullYear() === year);

               // Calculate the average value for the year
               const yearAverage = yearData.length > 0 ? yearData.reduce((sum, d) => sum + Number(d.value), 0) / yearData.length : 0;

               return {
                  date: year,
                  value: yearData.length > 0 ? yearAverage : 0
               };
            });

            return bucketedData;
         default:
            return sortedData;
      }
   }, [view, sortedData]);

   const filteredData = getFilteredData;
   const trend = filteredData.length > 0 ? ((Number(filteredData[filteredData.length - 1].value) - Number(filteredData[0].value)) / Number(filteredData[0].value) * 100) : 0;

   return (
      filteredData.length > 0 && (
         <Card
            id="indicators"
            elevation={3}
            sx={{ height: "100%", flexGrow: 1, textAlign: "left", borderRadius: 2, py: 1, position: "relative" }}
            variant="elevation"
         >
            <CardContent>
            <form onSubmit={handleSubmit((e) => e.preventDefault())}>
               <Stack
                  direction="row"
                  sx={{ gap: 2, flexWrap: "wrap" }}
               >
                  
                     <Controller
                        control={control}
                        name="indicator"
                        render={
                           ({ field }) => (
                              <FormControl error={Boolean(errors.indicator)}>
                                 <InputLabel
                                    htmlFor="indicator"
                                    variant="standard"
                                 >
                                    Indicator
                                 </InputLabel>
                                 <NativeSelect
                                    {...field}
                                    id="indicator"
                                 >
                                    {
                                       Object.keys(data).map((key) => (
                                          <option
                                             key={key}
                                             value={key}
                                          >
                                             {key}
                                          </option>
                                       ))
                                    }
                                 </NativeSelect>
                              </FormControl>
                           )
                        }
                     />
                     <Controller
                        control={control}
                        name="view"
                        render={
                           ({ field }) => (
                              <FormControl>
                                 <InputLabel
                                    htmlFor="view-native"
                                    variant="standard"
                                 >
                                    View
                                 </InputLabel>
                                 <NativeSelect
                                    id="view-native"
                                    {...field}
                                 >
                                    <option value="QTD">QTD</option>
                                    <option value="YTD">YTD</option>
                                 </NativeSelect>
                              </FormControl>
                           )
                        }
                     />
                  
                  
               </Stack>
               </form>
               <Stack sx={{ justifyContent: "space-between", mt: 1 }}>
                  <Stack
                     direction="row"
                     sx={
                        {
                           alignContent: { xs: "center", sm: "flex-start" },
                           alignItems: "center",
                           gap: 1
                        }
                     }
                  >
                     <Typography
                        component="p"
                        variant="h4"
                     >
                        {indicator === "GDP" ? "$" : ""}
                        {
                           indicator === "GDP" ? (
                              new Intl.NumberFormat().format(Number(filteredData[filteredData.length - 1].value))
                           ) : (
                              Number(filteredData[filteredData.length - 1].value).toFixed(2)
                           )
                        }
                        {indicator === "GDP" ? " billion" : "%"}
                     </Typography>
                     <Chip
                        color={trend > 0 ? "success" : "error"}
                        label={`${trend.toFixed(2)}%`}
                        size="small"
                     />
                  </Stack>
                  <Typography
                     sx={{ color: "text.secondary" }}
                     variant="caption"
                  >
                     U.S. {indicator} from {new Date(filteredData[0].date).toLocaleDateString()} to {new Date(filteredData[filteredData.length - 1].date).toLocaleDateString()}
                  </Typography>
               </Stack>
               <LineChart
                  colors={colorPalette}
                  grid={{ horizontal: true }}
                  height={250}
                  margin={{ left: 50, right: 20, top: 20, bottom: 20 }}
                  series={
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
                  slotProps={
                     {
                        legend: {
                           hidden: true
                        }
                     }
                  }
                  sx={
                     {
                        "& .MuiAreaElement-series-direct": {
                           fill: "url('#direct')"
                        }
                     }
                  }
                  xAxis={
                     [
                        {
                           scaleType: "point",
                           data: filteredData.map(d => d.date.toString())
                        }
                     ]
                  }
               >
                  { /* TODO: success vs. error (TREND BASED) */}
                  <AreaGradient
                     color={theme.palette.success.light}
                     id="direct"
                  />
               </LineChart>
            </CardContent>
         </Card>
      )
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
            elevation={3}
            sx={{ textAlign: "left", borderRadius: 2, mb: 2, px: 2 }}
            variant="elevation"
         >
            <CardContent>
               <Box sx={{ textAlign: "center" }}>
                  <Box
                     alt="Stock"
                     component="img"
                     src={image}
                     sx={{ width: 125, height: "auto", mx: "auto", my: 0 }}
                  />
                  <Typography
                     sx={{ mb: 3, fontWeight: "bold" }}
                     variant="h5"
                  >
                     {title}
                  </Typography>
               </Box>
               {
                  data.map((stock, index) => (
                     <Stack
                        direction="column"
                        key={index}
                        sx={{ gap: 1, mb: 2 }}
                     >
                        <Stack
                           direction="row"
                           sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
                        >
                           <Typography
                              component="p"
                              sx={{ fontWeight: "bold" }}
                              variant="h6"
                           >
                              <Link
                                 href={`https://www.google.com/search?q=${stock.ticker}+stock`}
                                 target="_blank"
                                 underline="none"
                              >
                                 {stock.ticker} { }
                              </Link>
                           </Typography>
                           <Chip
                              color={color}
                              label={stock.change_percentage}
                              size="small"
                           />
                        </Stack>
                        <Stack
                           direction="column"
                           sx={{ gap: 1 }}
                        >
                           <Typography
                              fontWeight="600"
                              variant="body2"
                           >
                              ${parseFloat(stock.price).toFixed(2)}
                              {" "}
                              ({parseFloat(stock.change_amount) < 0 ? "-" : "+"}
                              {Math.abs(parseFloat(stock.change_amount)).toFixed(2)})
                           </Typography>
                           <Typography
                              fontWeight="600"
                              variant="body2"
                           >
                              {new Intl.NumberFormat().format(parseInt(stock.volume))} transactions
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
      <Stack
         id="stocks"
         direction="column"
         sx={{ gap: 2, py: 6, textAlign: "center", justifyContent: "center", alignItems: "center" }}
      >
         <Box className="animation-container">
            <Box
               alt="Stocks"
               className="floating"
               component="img"
               src="stocks.svg"
               sx={{ width: 400, height: "auto", mx: "auto" }}
            />
         </Box>
         <Typography
            fontStyle="italic"
            fontWeight="bold"
            variant="subtitle2"
         >
            Last updated {timeSinceLastUpdated}
         </Typography>
         <Grid sx={{ width: "100%" }} direction="row" spacing={2} container>
            <Grid size={{ xs: 12, md: 6, lg: 4, xl: 12 }}>
               {renderTrend("Top Gainers", top_gainers, "up", "rocket.svg")}
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4, xl: 12 }}>
               {renderTrend("Top Losers", top_losers, "down", "loss.svg")}
            </Grid>
            <Grid size={{ xs: 12, lg: 4, xl: 12 }}>
               {renderTrend("Most Actively Traded", most_actively_traded, "neutral", "active.svg")}
            </Grid>
         </Grid>
      </Stack>
   );
}