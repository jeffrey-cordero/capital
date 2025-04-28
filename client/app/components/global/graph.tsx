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
import { LineChart } from "@mui/x-charts/LineChart";
import { useCallback, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import ChartContainer from "@/components/global/chart-container";
import AreaGradient from "@/components/global/gradient";
import { calculatePercentageChange, getChipColor, getGraphColor } from "@/lib/charts";
import { normalizeDate } from "@/lib/dates";
import { displayNumeric, displayPercentage, displayVolume, formatNumber } from "@/lib/display";

/**
 * Props for the Graph component
 *
 * @property {string} title - Graph title
 * @property {boolean} isCard - Whether graph is displayed in a card container
 * @property {boolean} isAverage - Whether to display average value in the year view
 * @property {boolean} isIndicators - Whether to show indicator selection controls
 * @property {Record<string, { date: string, value: string }[]>} data - Chart data by category identifier
 * @property {string} defaultValue - Default selected option
 */
export interface GraphProps {
   title: string;
   isCard: boolean;
   isAverage: boolean;
   isIndicators: boolean;
   defaultValue: string;
   data: Record<string, { date: string, value: number }[]>;
}

/**
 * Graph component heights by breakpoint
 */
export const heights = {
   xss: 255,
   xs: 285,
   sm: 300,
   md: 315,
   lg: 335,
   xl: 365,
   xxl: 385
};

/**
 * Media query breakpoints for responsive graphs
 */
export const breakpoints = {
   "xss": "(max-width: 500px)",
   "xs": "(max-width: 600px)",
   "sm": "(max-width: 700px)",
   "md": "(max-width: 800px)",
   "lg": "(max-width: 915px)",
   "xl": "(max-width: 1100px)",
   "xll": "(max-width: 1200px)"
};

/**
 * Interactive chart with date filtering and view options
 *
 * @param {GraphProps} props - Graph component props
 * @returns {React.ReactNode} The Graph component
 */
export default function Graph({ title, isCard, isIndicators, isAverage, data, defaultValue }: GraphProps): React.ReactNode {
   const theme = useTheme();

   // Account for graph responsiveness
   const { xss, xs, sm, md, lg, xl } = {
      xss: useMediaQuery(breakpoints.xss),
      xs: useMediaQuery(breakpoints.xs),
      sm: useMediaQuery(breakpoints.sm),
      md: useMediaQuery(breakpoints.md),
      lg: useMediaQuery(breakpoints.lg),
      xl: useMediaQuery(breakpoints.xl)
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
         default:
            return heights.xxl;
      }
   }, [xss, xs, sm, md, lg, xl]);

   // Leverage react-hook-form to handle local graph state
   const { watch, control } = useForm();
   const { option, view, from, to } = {
      option: watch("option", defaultValue),
      view: watch("view", "Year"),
      from: watch("from", ""),
      to: watch("to", "")
   };

   // Sort the provided data by date in ascending order
   const sorted = useMemo(() => {
      return [...data[option]].sort(
         (a, b) => normalizeDate(a.date).getTime() - normalizeDate(b.date).getTime()
      );
   }, [data, option]);

   // Filter and normalize the sorted data based on the date range
   const range = useMemo(() => {
      const [fromDate, toDate] = [normalizeDate(from), normalizeDate(to)];

      return sorted.reduce((acc, record) => {
         // Normalize the date
         const date = normalizeDate(record.date);

         // Filter based on the current date range
         if ((from === "" || date >= fromDate) && (to === "" || date <= toDate)) {
            acc.push({ ...record, date: date });
         }

         return acc;
      }, [] as { date: Date, value: number }[]);
   }, [sorted, from, to]);

   const fetchGraphData = useCallback(() => {
      switch (view) {
         // Format the yearly view as YYYY
         case "Year": {
            // Extract all unique years from the filtered data
            const years = Array.from(new Set(range.map(d => d.date.getUTCFullYear())));

            const data = years.map((year) => {
               // Gather all data points for the current year
               const yearlyData = range.filter(d => d.date.getUTCFullYear() === year);

               // Calculate value based on average vs. last value
               const value = yearlyData.length === 0 ? 0
                  : isAverage ? yearlyData.reduce((acc, record) => acc + record.value, 0) / yearlyData.length
                     : yearlyData[yearlyData.length - 1].value;

               return {
                  date: year.toString(),
                  value: yearlyData.length === 0 ? 0 : Number(value)
               };
            });

            // Add a previous year data point to prevent empty graph
            if (data.length === 1) {
               data.unshift({
                  date: String(Number(data[0].date) - 1),
                  value: data[0].value
               });
            }

            return data;
         }
         case "Month": {
            // Format the monthly view as MM/YYYY
            const months: Record<string, number> = {};
            const data = range.reduce((acc, record) => {
               const date = record.date;
               const title = (date.getUTCMonth() + 1).toString().padStart(2, "0") + "/" + (date.getUTCFullYear().toString());

               // Update or create the month data point
               if (title in months) {
                  acc[months[title]].value = Number(record.value);
               } else {
                  months[title] = acc.length;
                  acc.push({ date: title, value: Number(record.value) });
               }

               return acc;
            }, [] as { date: string, value: number }[]);

            if (data.length === 1) {
               const monthYear = data[0].date.split("/");

               // Handle a potential year rollover when fetching the previous month for singular data point cases
               if (monthYear[0] !== "01") {
                  data.unshift({
                     date: (Number(monthYear[0]) - 1).toString().padStart(2, "0") + "/" + monthYear[1],
                     value: data[0].value
                  });
               } else {
                  data.unshift({
                     date: "12/" + (Number(monthYear[1]) - 1),
                     value: data[0].value
                  });
               }
            }

            return data;
         }
         default: {
            return range;
         }
      }
   }, [range, view, isAverage]);

   // Process data and handle empty datasets
   const filtered = fetchGraphData();

   // Calculate the percent change for the graph based on current vs. initial value
   const trend = filtered.length === 0 ? 0 : calculatePercentageChange(
      Number(filtered[filtered.length - 1].value),
      Number(filtered[0].value)
   );

   // Visual styling based on the trend direction
   const color = getGraphColor(theme, trend);
   const chip = getChipColor(trend);

   // Fetch the minimum and maximum dates for the date range picker
   const [minDate, maxDate] = useMemo(() => {
      return [
         sorted.length > 0 ? normalizeDate(sorted[0].date).toISOString().split("T")[0] : "",
         sorted.length > 0 ? normalizeDate(sorted[sorted.length - 1].date).toISOString().split("T")[0] : ""
      ];
   }, [sorted]);

   const chart = useMemo(() => (
      <ChartContainer height = { height }>
         {
            filtered.length > 0 ? (
               <LineChart
                  colors = { [color] }
                  experimentalMarkRendering = { true }
                  grid = { { horizontal: true } }
                  height = { height }
                  margin = { { left: isCard ? 45 : 40, right: 25, top: 20, bottom: 20 } }
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
                           valueFormatter: (value) => formatNumber(value || 0, 2, 2, false) + (isAverage && view === "Year" ? " (avg)" : "")
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
      </ChartContainer>
   ), [filtered, height, color, isAverage, view, isCard]);

   return (
      <Card
         elevation = { isCard ? 3 : 0 }
         sx = {
            {
               height: "100%",
               flexGrow: 1,
               textAlign: "left",
               borderRadius: 2,
               position: "relative",
               background: isCard ? "" : "transparent"
            }
         }
         variant = "elevation"
      >
         <CardContent sx = { { position: "relative", px: isCard ? 0.25 : 0, py: isCard ? 2.5 : 0 } }>
            <Stack sx = { { justifyContent: "space-between" } }>
               <Stack
                  direction = "column"
                  sx = {
                     {
                        justifyContent: isCard ? { xs: "center", lg: "flex-start" } : "center",
                        flexWrap: "wrap",
                        columnGap: 1,
                        textAlign: isCard ? { xs: "center", lg: "left" } : "center",
                        mt: isCard ? { xs: 1.5, sm: 0.5 } : 1,
                        mb: 0,
                        px: isCard ? 2.25 : 0
                     }
                  }
               >
                  {
                     isIndicators && (
                        <Typography
                           gutterBottom = { true }
                           sx = { { fontWeight: "600", mb: "-3px" } }
                           variant = "subtitle2"
                        >
                           { title }
                        </Typography>
                     )
                  }
                  <Stack
                     direction = { { xs: "column", lg: isCard ? "row" : "column" } }
                     spacing = { 0.75 }
                     sx = { { alignItems: "center", justifyContent: { xs: "center", lg: isCard ? "flex-start" : "center" } } }
                  >
                     {
                        filtered.length > 0 && (
                           <>
                              <Typography
                                 sx = { { whiteSpace: "pre-wrap", wordBreak: "break-all", fontWeight: "600" } }
                                 variant = "subtitle1"
                              >
                                 { option === "GDP" || !isIndicators ? "$" : "" }
                                 { displayNumeric(Number(filtered[filtered.length - 1].value)) }
                                 { isIndicators ? option === "GDP" ? "B" : "%" : "" }
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
            <ChartContainer height = { height }>
               { chart }
            </ChartContainer>
            <Stack
               direction = { { xs: "column", sm: "row" } }
               sx = { { gap: 2, flexWrap: "wrap", justifyContent: "center", alignContent: "center", mt: 3.5, px: isCard ? 2.25 : 0 } }
            >
               {
                  isIndicators && (
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