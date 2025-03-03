import { Card, CardContent, Chip, FormControl, InputLabel, NativeSelect, Stack, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts";
import { LineChart } from "@mui/x-charts/LineChart";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { AreaGradient } from "@/components/global/graphs";
import { constructDate } from "@/lib/dates";

interface GraphProps {
   title: string;
   card: boolean;
   indicators: boolean;
   defaultOption: string;
   data: Record<string, { date: string, value: string }[]>;
}

export default function Graph({ title, card, defaultOption, indicators, data }: GraphProps) {
   const theme = useTheme();
   const {
      watch,
      control
   } = useForm();
   const { option, view, graph, from, to } = {
      option: watch("option", defaultOption),
      view: watch("view", "YTD"),
      graph: watch("graph", "Line"),
      from: watch("from", ""),
      to: watch("to", "")
   };

   const sorted = useMemo(() => {
      return data[option].sort(
         (a, b) => constructDate(a.date).getTime() - constructDate(b.date).getTime()
      );
   }, [data, option]);

   const range = useMemo(() => {
      return sorted.filter((a) => {
         const date = constructDate(a.date);

         return (from !== "" ? date >= constructDate(from) : true)
            && (to !== "" ? date <= constructDate(to) : true);
      });
   }, [sorted, from, to]);

   const getFiltered = useMemo(() => {
      switch (view) {
         case "YTD": {
            // Format the yearly view (YYYY)
            const years = Array.from(
               new Set(range.map(d => constructDate(d.date).getFullYear()))
            );

            const yearlyData = years.map((year) => {
               // Bucket the data by year and calculate the average value for each year
               const data = range.filter(d => constructDate(d.date).getFullYear() === year);
               const average = data.length > 0 ? data.reduce((sum, d) => sum + Number(d.value), 0) / data.length : 0;

               return {
                  date: year.toString(),
                  value: data.length > 0 ? average : 0
               };
            });

            return yearlyData;
         }
         case "MTD": {
            // Format the monthly view (MM/YYYY)
            const monthlyData = range.reduce((acc: { date: string, value: string }[], d) => {
               const date = constructDate(d.date);
               const title = (date.getMonth() + 1).toString().padStart(2, "0") + "/" + (date.getFullYear().toString());

               acc.push({ date: title, value: d.value });
               return acc;
            }, []);

            return monthlyData;
         }
         default: {
            return range;
         }
      }
   }, [view, range]);

   const getColor = (value: number) => {
      if (value === 0) {
         return theme.palette.text.primary;
      } else if (value > 0) {
         return theme.palette.success.main;
      } else {
         return theme.palette.error.main;
      }
   };

   const filtered = getFiltered.length > 0 ? getFiltered : [{ date: constructDate(new Date().toISOString(), view), value: 0 }];

   // Growth from start to end of range
   const trend = filtered.length > 0 ? (
      (Number(filtered[filtered.length - 1].value) - Number(filtered[0].value))
      / (Number(filtered[0].value) !== 0 ? Number(filtered[0].value) : 1) * 100) : (0);

   // Coloring parameters
   const color = getColor(trend);
   const chip = trend > 0 ? "success" : trend < 0 ? "error" : "default";

   // Range parameters
   const fromValue = from === "" ? range[0].date : from;
   const toValue = to === "" ? range[range.length - 1].date : to;
   const minDate = constructDate(sorted[0].date).toISOString().split("T")[0];
   const maxDate = constructDate(sorted[sorted.length - 1].date).toISOString().split("T")[0];

   return (
      <Card
         elevation = { card ? 3 : 0 }
         sx = { { height: "100%", flexGrow: 1, textAlign: "left", borderRadius: 2, position: "relative" } }
         variant = "elevation"
      >
         <CardContent>
            <Stack
               direction = { { xs: "column", sm: "row" } }
               sx = { { gap: 2, flexWrap: "wrap", alignContent: "center", mb: 1, py: card ? 1 : 0, px: 1 } }
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
                           sx = { { width: { xs: "100%", sm: "auto" } } }>
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
                              <option value = "MTD">MTD</option>
                              <option value = "YTD">YTD</option>
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
                           sx = { { width: { xs: "100%", sm: "auto" } } }>
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
            <Stack sx = { { justifyContent: "space-between", mt: 1, px: 1 } }>
               <Stack
                  direction = "row"
                  sx = {
                     {
                        alignContent: "center",
                        alignItems: "center",
                        gap: 1,
                        mt: { xs: 1, sm: 0 }
                     }
                  }
               >
                  <Typography
                     component = "p"
                     variant = "h4"
                  >
                     { option === "GDP" || !indicators ? "$" : "" }
                     {
                        option === "GDP" ? (
                           new Intl.NumberFormat().format(Number(filtered[filtered.length - 1].value))
                        ) : (
                           Number(filtered[filtered.length - 1].value).toFixed(2)
                        )
                     }
                     { indicators ? option === "GDP" ? "B" : "%" : "" }
                  </Typography>
                  <Chip
                     color = { chip }
                     label = { `${trend.toFixed(2)}%` }
                     size = "small"
                  />
               </Stack>
            </Stack>
            {
               graph === "Line" ? (
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
                     height = { 250 }
                     margin = { { left: 50, right: 20, top: 20, bottom: 20 } }
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
               sx = { { gap: 1, mt: 3, justifyContent: "space-between", px: 1 } }
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
                                 htmlInput: {
                                    min: minDate,
                                    max: maxDate
                                 },
                                 inputLabel: {
                                    shrink: true
                                 }
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