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
};

export function getChipColor(trend: number) {
   if (trend === 0) {
      return "default" as const;
   } else if (trend > 0) {
      return "success" as const;
   } else {
      return "error" as const;
   }
};

export default function Graph({ title, card, defaultOption, indicators, average, data }: GraphProps) {
   const theme = useTheme();
   const {
      watch,
      control
   } = useForm();
   const { option, view, graph, from, to } = {
      option: watch("option", defaultOption),
      view: watch("view", "Year"),
      graph: watch("graph", "Line"),
      from: watch("from", ""),
      to: watch("to", "")
   };

   const sorted = useMemo(() => {
      return [...data[option]].sort(
         (a, b) => normalizeDate(a.date).getTime() - normalizeDate(b.date).getTime()
      );
   }, [data, option]);

   const range = useMemo(() => {
      return sorted.filter((a) => {
         const date = normalizeDate(a.date);

         return (from !== "" ? date >= normalizeDate(from) : true)
            && (to !== "" ? date <= normalizeDate(to) : true);
      });
   }, [sorted, from, to]);

   const getFiltered = useMemo(() => {
      switch (view) {
         case "Year": {
            // Format the yearly view (YYYY)
            const years = Array.from(
               new Set(range.map(d => normalizeDate(d.date).getUTCFullYear()))
            );

            const yearlyData = years.map((year) => {
               // Bucket the data by year and calculate the average or fetch the last value for each year
               const data = range.filter(d => normalizeDate(d.date).getUTCFullYear() === year);
               const value = data.length > 0 ?
                  average ?
                     data.reduce((acc, record) => acc + Number(record.value), 0) / data.length
                     : data[data.length - 1].value
                  : 0;

               return {
                  date: year.toString(),
                  value: data.length > 0 ? value : 0
               };
            });

            if (yearlyData.length === 1 && graph !== "Bar") {
               // Append the same value for the next previous to prevent an empty LineChart component
               yearlyData.unshift({
                  date: String(Number(yearlyData[0].date) - 1),
                  value: yearlyData[0].value
               });
            }

            return yearlyData;
         }
         case "Month": {
            // Format the monthly view (MM/YYYY)
            const buckets: Record<string, number> = {};
            const monthlyData = range.reduce((acc: { date: string, value: string }[], record) => {
               const date = normalizeDate(record.date);
               const title = (date.getUTCMonth() + 1).toString().padStart(2, "0") + "/" + (date.getUTCFullYear().toString());
               // Each bucket represents the final value in the dataset tied to that time period
               if (title in buckets) {
                  acc[buckets[title]].value = record.value;
               } else {
                  buckets[title] = acc.length;
                  acc.push({ date: title, value: record.value });
               }

               return acc;
            }, []);

            if (monthlyData.length === 1 && graph !== "Bar") {
               // Append the same value for the next previous to prevent an empty LineChart component
               const monthYear = monthlyData[0].date.split("/");

               // Account for rotating to the previous year
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
   }, [view, range, graph, average]);

   const filtered = getFiltered.length > 0 ? getFiltered : [{ date: normalizeDate(new Date().toISOString(), view), value: 0 }];

   // Growth from start to end of range
   const trend = filtered.length > 0 ? (
      (Number(filtered[filtered.length - 1].value) - Number(filtered[0].value))
      / (Number(filtered[0].value) !== 0 ? Number(filtered[0].value) : 1) * 100) : (0);

   // Coloring parameters
   const color = getGraphColor(theme, trend);
   const chip = getChipColor(trend);

   // Range parameters
   const fromValue = from === "" ? range[0].date : from;
   const toValue = to === "" ? range[range.length - 1].date : to;
   const minDate = normalizeDate(sorted[0].date).toISOString().split("T")[0];
   const maxDate = normalizeDate(sorted[sorted.length - 1].date).toISOString().split("T")[0];

   return (
      <Card
         elevation = { card ? 3 : 0 }
         sx = { { height: "100%", flexGrow: 1, textAlign: "left", borderRadius: 2, position: "relative", background: "transparent" } }
         variant = "elevation"
      >
         <CardContent sx = { { p: card ? 2.5 : 0 } }>
            <Stack
               direction = { { xs: "column", sm: "row" } }
               sx = { { gap: 2, flexWrap: "wrap", alignContent: "center", mb: 1, py: card ? 0.5 : 0, px: 1 } }
            >
               {
                  indicators && (
                     <Controller
                        control = { control }
                        name = "option"
                        render = {
                           ({ field }) => (
                              <FormControl
                                 sx = { { width: { xs: "100%", sm: "auto" } } }
                              >
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
                        <FormControl
                           sx = { { width: { xs: "100%", sm: "auto" } } }
                        >
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
                        <FormControl
                           sx = { { width: { xs: "100%", sm: "auto" } } }
                        >
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
            <Stack sx = { { justifyContent: "space-between"  } }>
               <Stack
                  direction = "row"
                  sx = {
                     {
                        justifyContent: { xs: "center", sm: "flex-start" },
                        alignContent: "center",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1,
                        px: 1,
                        mt: { xs: 1, sm: 0 }
                     }
                  }
               >
                  <Typography
                     component = "p"
                     variant = "h4"
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
            <Stack
               direction = { { xs: "column", sm: "row" } }
               sx = { { gap: 1, mt: 3, justifyContent: "space-between", px: 1, pb: 1 } }
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