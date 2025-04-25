import {
   Card,
   CardContent,
   Chip,
   FormControl,
   InputLabel,
   MenuItem,
   Select,
   Stack,
   TextField,
   Typography,
   useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts";
import { LineChart } from "@mui/x-charts/LineChart";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { AreaGradient } from "@/components/global/gradient";
import ResponsiveChartContainer from "@/components/global/responsive";
import { calculatePercentageChange, getChipColor, getGraphColor } from "@/lib/charts";
import { normalizeDate } from "@/lib/dates";
import { displayNumeric, displayPercentage, displayVolume } from "@/lib/display";

/**
 * The props for the Graph component.
 *
 * @interface GraphProps
 * @property {string} title - The title of the graph
 * @property {boolean} card - Whether the graph is within a card to handle styling cases
 * @property {boolean} average - Whether the graph should display the average value or the last value within the year view
 * @property {boolean} indicators - Whether the graph should display the indicators (GDP, etc.) or hide the selection input
 * @property {string} defaultOption - The default option for the graph
 * @property {Record<string, { date: string, value: string }[]>} data - The data for the graph
 */
export interface GraphProps {
   title: string;
   card: boolean;
   average: boolean;
   indicators: boolean;
   defaultOption: string;
   data: Record<string, { date: string, value: number }[]>;
}

/**
 * The heights for graph components across the application based on breakpoints
 */
export const heights = {
   xss: 265,
   xs: 285,
   sm: 300,
   md: 315,
   lg: 335,
   xl: 365,
   xxl: 385
};

/**
 * The breakpoints for graph components across the application
 */
export const breakpoints = {
   "xss": "(max-width: 375px)",
   "xs": "(max-width: 475px)",
   "sm": "(max-width: 600px)",
   "md": "(max-width: 750px)",
   "lg": "(max-width: 850px)",
   "xl": "(max-width: 1100px)",
   "xll": "(max-width: 1200px)"
};

/**
 * The Graph component.
 *
 * @param {GraphProps} props - The props for the Graph component
 * @returns {React.ReactNode} The Graph component
 */
export default function Graph({ title, card, defaultOption, indicators, average, data }: GraphProps): React.ReactNode {
   const theme = useTheme();
   const { xss, xs, sm, md, lg, xl } = {
      xss: useMediaQuery(breakpoints.xss),
      xs: useMediaQuery(breakpoints.xs),
      sm: useMediaQuery(breakpoints.sm),
      md: useMediaQuery(breakpoints.md),
      lg: useMediaQuery(breakpoints.lg),
      xl: useMediaQuery(breakpoints.xl)
   };
   const graphHeight = xss ? heights.xss : (xs ? heights.xs : (sm ? heights.sm : (md ? heights.md : (lg ? heights.lg : xl ? heights.xl : heights.xxl))));
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
   const range = useMemo(() => {
      return sorted.filter((a) => {
         const date = normalizeDate(a.date);
         return (from !== "" ? date >= normalizeDate(from) : true)
            && (to !== "" ? date <= normalizeDate(to) : true);
      });
   }, [sorted, from, to]);

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
                     ? yearData.reduce((acc, record) => acc + Number(record.value), 0) / yearData.length // average value
                     : yearData[yearData.length - 1].value; // last value

               return {
                  date: year.toString(),
                  value: yearData.length === 0 ? 0 : Number(value)
               };
            });

            // For line charts with single data point, add a previous year data point to prevent empty graph
            if (yearlyData.length === 1 && graph === "Line") {
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
            if (monthlyData.length === 1 && graph === "Line") {
               const monthYear = monthlyData[0].date.split("/");

               // Handle month rollover, accounting for year change when month is January
               if (monthYear[0] !== "01") {
                  monthlyData.unshift({
                     date: (Number(monthYear[0]) - 1).toString().padStart(2, "0") + "/" + monthYear[1], // previous month
                     value: monthlyData[0].value
                  });
               } else {
                  monthlyData.unshift({
                     date: "12/" + (Number(monthYear[1]) - 1), // previous year
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
   const filtered = constructGraphData();

   // Calculate growth trend as percentage change from start to end
   const trend = filtered.length === 0 ? 0 : calculatePercentageChange(
      Number(filtered[filtered.length - 1].value),
      Number(filtered[0].value)
   );

   // Visual styling based on trend direction
   const color = getGraphColor(theme, trend);
   const chip = getChipColor(trend);

   const minDate = sorted.length > 0 ? normalizeDate(sorted[0].date).toISOString().split("T")[0] : ""; // oldest date
   const maxDate = sorted.length > 0 ? normalizeDate(sorted[sorted.length - 1].date).toISOString().split("T")[0] : ""; // newest date

   const chart = useMemo(() => (
      <ResponsiveChartContainer height = { graphHeight }>
         {
            filtered.length > 0 ? (
               graph === "Line" ? (
                  <LineChart
                     colors = { [color] }
                     experimentalMarkRendering = { true }
                     grid = { { horizontal: true } }
                     height = { graphHeight }
                     margin = { { left: 45, right: 20, top: 20, bottom: 20 } }
                     resolveSizeBeforeRender = { true }
                     series = {
                        [
                           {
                              id: "value",
                              label: "Value",
                              showMark: false,
                              curve: "linear",
                              area: true,
                              data: filtered.map(d => Number(d.value)),
                              valueFormatter: (value) => displayNumeric(value || 0) + (average && view === "Year" ? " (avg)" : "")
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
                           "& .MuiAreaElement-series-value": {
                              fill: "url('#value')"
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
                        id = "value"
                     />
                  </LineChart>
               ) : (
                  <BarChart
                     borderRadius = { 8 }
                     grid = { { horizontal: true } }
                     height = { graphHeight }
                     margin = { { left: 45, right: 20, top: 20, bottom: 20 } }
                     resolveSizeBeforeRender = { true }
                     series = {
                        [
                           {
                              id: "value",
                              label: "Value",
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
            ) : (
               <Stack
                  sx = { { height: "100%", width: "100%", alignItems: "center", justifyContent: "center" } }
               >
                  <Typography
                     sx = { { fontWeight: "600" } }
                     variant = "subtitle2"
                  >
                     No available data
                  </Typography>
               </Stack>
            )
         }
      </ResponsiveChartContainer>
   ), [filtered, graphHeight, graph, color, average, view]);

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
         <CardContent sx = { { position: "relative", px: card ? 0.25 : 0, py: card ? 2.5 : 0 } }>
            <Stack sx = { { justifyContent: "space-between" } }>
               <Stack
                  direction = "column"
                  sx = {
                     {
                        justifyContent: card ? { xs: "center", lg: "flex-start" } : "center",
                        flexWrap: "wrap",
                        columnGap: 1,
                        rowGap: 0,
                        textAlign: card ? { xs: "center", lg: "left" } : "center",
                        mt: { xs: 1.5, sm: 0.5 },
                        mb: -0.25,
                        px: card ? 2.25 : 0
                     }
                  }
               >
                  {
                     indicators && (
                        <Typography
                           gutterBottom = { true }
                           sx = { { mb: 0, fontWeight: "600" } }
                           variant = "subtitle2"
                        >
                           { title }
                        </Typography>
                     )
                  }
                  <Stack
                     direction = { { xs: "column", lg: card ? "row" : "column" } }
                     spacing = { 0.75 }
                     sx = { { alignItems: "center", justifyContent: { xs: "center", lg: card ? "flex-start" : "center" } } }
                  >
                     {
                        filtered.length > 0 && (
                           <>
                              <Typography
                                 sx = { { whiteSpace: "pre-wrap", wordBreak: "break-all", fontWeight: "600" } }
                                 variant = "subtitle1"
                              >
                                 { option === "GDP" || !indicators ? "$" : "" }
                                 { displayNumeric(Number(filtered[filtered.length - 1].value)) }
                                 { indicators ? option === "GDP" ? "B" : "%" : "" }
                              </Typography>
                              <Chip
                                 color = { chip as any }
                                 label = { displayPercentage(Number(trend.toFixed(2))) }
                                 size = "small"
                                 sx = { { mt: "2px !important" } }
                              />
                           </>
                        )
                     }
                  </Stack>
               </Stack>
            </Stack>
            <ResponsiveChartContainer height = { graphHeight }>
               { chart }
            </ResponsiveChartContainer>
            <Stack
               direction = { { xs: "column", sm: "row" } }
               sx = { { gap: 2, flexWrap: "wrap", justifyContent: "center", alignContent: "center", mt: 3.5, px: card ? 2.25 : 0 } }
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
                                    variant = "outlined"
                                 >
                                    { title }
                                 </InputLabel>
                                 <Select
                                    { ...field }
                                    label = { title }
                                    size = "small"
                                    slotProps = {
                                       {
                                          input: {
                                             id: "option"
                                          }
                                       }
                                    }
                                    sx = { { height: "2.7rem" } }
                                    value = { option }
                                    variant = "outlined"
                                 >
                                    {
                                       Object.keys(data).map((key) => (
                                          <MenuItem
                                             key = { key }
                                             value = { key }
                                          >
                                             { key }
                                          </MenuItem>
                                       ))
                                    }
                                 </Select>
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
                              variant = "outlined"
                           >
                              View
                           </InputLabel>
                           <Select
                              { ...field }
                              label = "View"
                              size = "small"
                              slotProps = {
                                 {
                                    input: {
                                       id: "view"
                                    }
                                 }
                              }
                              sx = { { height: "2.7rem" } }
                              value = { view }
                              variant = "outlined"
                           >
                              <MenuItem value = "Month">
                                 Month
                              </MenuItem>
                              <MenuItem value = "Year">
                                 Year
                              </MenuItem>
                           </Select>
                        </FormControl>
                     )
                  }
               />
               <Controller
                  control = { control }
                  defaultValue = "Line"
                  name = "graph"
                  render = {
                     ({ field }) => (
                        <FormControl
                           sx = { { width: { xs: "100%", sm: "auto" } } }
                        >
                           <InputLabel
                              htmlFor = "graph"
                              variant = "outlined"
                           >
                              Type
                           </InputLabel>
                           <Select
                              { ...field }
                              label = "Type"
                              size = "small"
                              slotProps = {
                                 {
                                    input: {
                                       id: "graph"
                                    }
                                 }
                              }
                              sx = { { height: "2.7rem" } }
                              value = { graph }
                              variant = "outlined"
                           >
                              <MenuItem value = "Line">
                                 Line
                              </MenuItem>
                              <MenuItem value = "Bar">
                                 Bar
                              </MenuItem>
                           </Select>
                        </FormControl>
                     )
                  }
               />
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
                                    colorScheme: theme.palette.mode === "dark" ? "dark" : "inherit",
                                    height: "2.7rem"
                                 }
                              }
                              type = "date"
                              value = { field.value || minDate }
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
                                 colorScheme: theme.palette.mode === "dark" ? "dark" : "inherit",
                                 height: "2.7rem"
                              }
                           }
                           type = "date"
                           value = { field.value || maxDate }
                        />
                     )
                  }
               />
            </Stack>
         </CardContent>
      </Card>
   );
}