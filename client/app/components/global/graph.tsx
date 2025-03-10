import {
   Card,
   CardContent,
   Chip,
   FormControl,
   InputLabel,
   NativeSelect,
   Stack,
   TextField,
   Typography
} from "@mui/material";
import { type Theme, useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts";
import { LineChart } from "@mui/x-charts/LineChart";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { AreaGradient } from "@/components/global/graphs";
import { normalizeDate } from "@/lib/dates";
import { displayNumeric, displayPercentage, displayVolume } from "@/lib/display";

interface GraphProps {
   title: string;
   card: boolean;
   average: boolean;
   indicators: boolean;
   defaultOption: string;
   data: Record<string, { date: string, value: string }[]>;
}

export function getGraphColor(theme: Theme, value: number) {
   if (value === 0) {
      return theme.palette.text.primary;
   } else if (value > 0) {
      return theme.palette.success.main;
   } else {
      return theme.palette.error.main;
   }
}

export function getChipColor(trend: number) {
   if (trend === 0) {
      return "info" as const;
   } else if (trend > 0) {
      return "success" as const;
   } else {
      return "error" as const;
   }
}

export default function Graph({ title, card, defaultOption, indicators, average, data }: GraphProps) {
   const theme = useTheme();
   const { watch, control } = useForm();

   // Form control values with defaults
   const { option, view, graph, from, to } = {
      option: watch("option", defaultOption),
      view: watch("view", "Year"),
      graph: watch("graph", "Line"),
      from: watch("from", ""),
      to: watch("to", "")
   };

   // Sort data by date in ascending order
   const sorted = useMemo(() => {
      return [...data[option]].sort(
         (a, b) => normalizeDate(a.date).getTime() - normalizeDate(b.date).getTime()
      );
   }, [data, option]);

   // Filter data based on date range
   const range = sorted.filter((a) => {
      const date = normalizeDate(a.date);
      return (from !== "" ? date >= normalizeDate(from) : true)
         && (to !== "" ? date <= normalizeDate(to) : true);
   });

   const constructGraphData = () => {
      // Supports Year and Month views with special handling for single data points
      switch (view) {
         case "Year": {
            // Extract all unique years from the filtered data
            const years = Array.from(
               new Set(range.map(d => normalizeDate(d.date).getUTCFullYear()))
            );

            const yearlyData = years.map((year) => {
               // Get all data points for this year
               const yearData = range.filter(d => normalizeDate(d.date).getUTCFullYear() === year);

               // Calculate value based on average setting
               const value = yearData.length === 0 ? 0
                  : average
                     ? yearData.reduce((acc, record) => acc + Number(record.value), 0) / yearData.length
                     : yearData[yearData.length - 1].value;

               return {
                  date: year.toString(),
                  value: yearData.length === 0 ? 0 : Number(value)
               };
            });

            // For line charts with single data point, add a previous year data point to prevent empty graph
            if (yearlyData.length === 1 && graph !== "Bar") {
               yearlyData.unshift({
                  date: String(Number(yearlyData[0].date) - 1),
                  value: yearlyData[0].value
               });
            }

            return yearlyData;
         }
         case "Month": {
            // Format the monthly view as MM/YYYY
            const buckets: Record<string, number> = {};
            const monthlyData = range.reduce((acc: { date: string, value: number }[], record) => {
               const date = normalizeDate(record.date);
               const title = (date.getUTCMonth() + 1).toString().padStart(2, "0") + "/" + (date.getUTCFullYear().toString());

               // Update existing bucket or create new one
               if (title in buckets) {
                  acc[buckets[title]].value = Number(record.value);
               } else {
                  buckets[title] = acc.length;
                  acc.push({ date: title, value: Number(record.value) });
               }

               return acc;
            }, []);

            // For line charts with single data point, add previous month to prevent empty graph
            if (monthlyData.length === 1 && graph !== "Bar") {
               const monthYear = monthlyData[0].date.split("/");

               // Handle month rollover, accounting for year change when month is January
               if (monthYear[0] !== "01") {
                  monthlyData.unshift({
                     date: (Number(monthYear[0]) - 1).toString().padStart(2, "0") + "/" + monthYear[1],
                     value: monthlyData[0].value
                  });
               } else {
                  monthlyData.unshift({
                     date: "12/" + (Number(monthYear[1]) - 1),
                     value: monthlyData[0].value
                  });
               }
            }

            return monthlyData;
         }
         default: {
            return range;
         }
      }
   };

   // Process data and handle empty datasets
   const filteredRange = constructGraphData();
   const filtered = filteredRange.length > 0 ?
      filteredRange : [{ date: normalizeDate(new Date().toISOString(), view), value: 0 }];

   // Calculate growth trend as percentage change from start to end
   const trend = filtered.length > 0 ? (
      (Number(filtered[filtered.length - 1].value) - Number(filtered[0].value))
      / (Number(filtered[0].value) !== 0 ? Number(filtered[0].value) : 1) * 100) : (0);

   // Visual styling based on trend direction
   const color = getGraphColor(theme, trend);
   const chip = getChipColor(trend);

   // Date range for filter controls
   const fromValue = from === "" ? range[0]?.date : from;
   const toValue = to === "" ? range[range.length - 1]?.date : to;
   const minDate = normalizeDate(sorted[0].date).toISOString().split("T")[0];
   const maxDate = normalizeDate(sorted[sorted.length - 1].date).toISOString().split("T")[0];

   return (
      <Card
         elevation = { card ? 3 : 0 }
         sx = {
            {
               height: "100%",
               flexGrow: 1,
               textAlign: "left",
               borderRadius: 2,
               position: "relative",
               background: card ? "" : "transparent"
            }
         }
         variant = "elevation"
      >
         <CardContent sx = { { p: card ? 2.5 : 0 } }>
            { /* Controls for graph type, view and data selection */ }
            <Stack
               direction = { { xs: "column", sm: "row" } }
               sx = { { gap: 2, flexWrap: "wrap", alignContent: "center", mb: 1, py: card ? 0.5 : 0, px: card ? 0 : 1 } }
            >
               {
                  indicators && (
                     <Controller
                        control = { control }
                        name = "option"
                        render = {
                           ({ field }) => (
                              <FormControl sx = { { width: { xs: "100%", sm: "auto" } } }>
                                 <InputLabel
                                    htmlFor = "option"
                                    variant = "standard"
                                 >
                                    { title }
                                 </InputLabel>
                                 <NativeSelect
                                    { ...field }
                                    id = "option"
                                    value = { option }
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
                  )
               }

               <Controller
                  control = { control }
                  name = "view"
                  render = {
                     ({ field }) => (
                        <FormControl sx = { { width: { xs: "100%", sm: "auto" } } }>
                           <InputLabel
                              htmlFor = "view"
                              variant = "standard"
                           >
                              View
                           </InputLabel>
                           <NativeSelect
                              { ...field }
                              id = "view"
                              value = { view }
                           >
                              <option value = "Month">Month</option>
                              <option value = "Year">Year</option>
                           </NativeSelect>
                        </FormControl>
                     )
                  }
               />
               <Controller
                  control = { control }
                  name = "graph"
                  render = {
                     ({ field }) => (
                        <FormControl sx = { { width: { xs: "100%", sm: "auto" } } }>
                           <InputLabel
                              htmlFor = "graph"
                              variant = "standard"
                           >
                              Type
                           </InputLabel>
                           <NativeSelect
                              { ...field }
                              id = "graph"
                              value = { graph }
                           >
                              <option value = "Line">Line</option>
                              <option value = "Bar">Bar</option>
                           </NativeSelect>
                        </FormControl>
                     )
                  }
               />
            </Stack>
            { /* Current value and trend display */ }
            <Stack sx = { { justifyContent: "space-between", px: card ? 0 : 1 } }>
               <Stack
                  direction = "row"
                  sx = {
                     {
                        justifyContent: "flex-start",
                        alignContent: "center",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1,
                        my: { xs: 2, sm: 1 }
                     }
                  }
               >
                  <Typography
                     component = "p"
                     sx = { { whiteSpace: "pre-wrap", wordBreak: "break-all" } }
                     variant = "h5"
                  >
                     { option === "GDP" || !indicators ? "$" : "" }
                     { displayNumeric(Number(filtered[filtered.length - 1].value)) }
                     { indicators ? option === "GDP" ? "B" : "%" : "" }
                  </Typography>
                  <Chip
                     color = { chip }
                     label = { displayPercentage(Number(trend.toFixed(2))) }
                     size = "small"
                  />
               </Stack>
            </Stack>
            { /* Chart display based on selected type */ }
            {
               graph === "Line" ? (
                  <LineChart
                     colors = { [color] }
                     experimentalMarkRendering = { true }
                     grid = { { horizontal: true } }
                     height = { 365 }
                     margin = { { left: 50, right: 20, top: 20, bottom: 20 } }
                     resolveSizeBeforeRender = { true }
                     series = {
                        [
                           {
                              id: "direct",
                              label: "Direct",
                              showMark: false,
                              curve: "linear",
                              area: true,
                              data: filtered.map(d => Number(d.value)),
                              valueFormatter: (date) => date?.toFixed(2) + (average && view === "Year" ? " (avg)" : "")
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
                              data: filtered.map(d => d.date)
                           }
                        ]
                     }
                     yAxis = {
                        [{
                           domainLimit: "nice",
                           valueFormatter: (value) => displayVolume(value)
                        }]
                     }
                  >
                     <AreaGradient
                        color = { color }
                        id = "direct"
                     />
                  </LineChart>
               ) : (
                  <BarChart
                     borderRadius = { 8 }
                     grid = { { horizontal: true } }
                     height = { 375 }
                     margin = { { left: 50, right: 20, top: 20, bottom: 20 } }
                     resolveSizeBeforeRender = { true }
                     series = {
                        [
                           {
                              id: "direct",
                              label: "Direct",
                              data: filtered.map(d => Number(d.value))
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
                              data: filtered.map(d => d.date)
                           }
                        ]
                     }
                     yAxis = {
                        [{
                           domainLimit: "nice",
                           valueFormatter: (value) => displayVolume(value),
                           colorMap: {
                              type: "piecewise",
                              thresholds: [0],
                              colors: ["hsl(0, 90%, 50%)", "hsl(210, 98%, 50%)"]
                           }
                        }]
                     }
                  />
               )
            }
            { /* Date range filter controls */ }
            <Stack
               direction = { { xs: "column", sm: "row" } }
               sx = { { gap: 1, mt: 3, justifyContent: "space-between", px: card ? 0 : 1 } }
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
                                    htmlInput: {
                                       min: minDate,
                                       max: maxDate
                                    },
                                    inputLabel: {
                                       shrink: true
                                    }
                                 }
                              }
                              sx = {
                                 {
                                    mt: 1,
                                    colorScheme: theme.palette.mode === "dark" ? "dark" : "inherit"
                                 }
                              }
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
                                 htmlInput: {
                                    min: minDate,
                                    max: maxDate
                                 },
                                 inputLabel: {
                                    shrink: true
                                 }
                              }
                           }
                           sx = {
                              {
                                 mt: 1,
                                 colorScheme: theme.palette.mode === "dark" ? "dark" : "inherit"
                              }
                           }
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