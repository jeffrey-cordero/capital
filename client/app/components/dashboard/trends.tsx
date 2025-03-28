import { faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Card,
   CardContent,
   IconButton,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { useCallback, useMemo, useState } from "react";

import { getCurrentDate, getYearAbbreviations } from "@/lib/dates";
import { displayVolume, horizontalScroll } from "@/lib/display";

/**
 * The data for the year
 *
 * @type YearData
 * @property {string} id - The id of the yearly data
 * @property {string} label - The label of the yearly data
 * @property {number[]} data - The data for the given year
 * @property {string} color - The color for the given year
 */
type YearData = {
   id: string;
   label: string;
   data: number[];
   color: string;
}

/**
 * The props for the Trends component
 *
 * @interface TrendProps
 * @property {boolean} isCard - Whether the component is within a card or standalone
 * @property {string} title - The title of the component
 * @property {string} value - The value of the component
 * @property {string} subtitle - The subtitle of the component
 * @property {YearData[]} data - The yearly data for the component
 * @property {React.ReactNode} extraInfo - The extra info for the component
 */
interface TrendProps {
   isCard: boolean;
   title: string;
   value: string;
   data: YearData[];
   extraInfo?: React.ReactNode;
}

/**
 * The Trends component to display the trends of the given data
 *
 * @param {TrendProps} props - The props for the Trends component
 * @returns {React.ReactNode} The Trends component
 */
export function Trends({ title, value, isCard, data, extraInfo }: TrendProps): React.ReactNode {
   const theme = useTheme();
   const [year, setYear] = useState<number>(getCurrentDate().getUTCFullYear());

   const updateYear = useCallback((direction: "previous" | "next") => {
      setYear(prev => prev + (direction === "previous" ? -1 : 1));
   }, []);

   // Memoize the essential chart-related values
   const currentYear = useMemo(() => getCurrentDate().getUTCFullYear(), []);
   const yearAbbreviations = useMemo(() => getYearAbbreviations(year), [year]);
   const colorPalette = useMemo(() => [
      theme.palette.primary.dark,
      theme.palette.primary.main,
      theme.palette.primary.light
   ], [theme.palette.primary]);
   const chart = useMemo(() => (
      <BarChart
         borderRadius = { 8 }
         colors = { colorPalette }
         grid = { { horizontal: true } }
         height = { isCard ? 300 : 500 }
         margin = { { left: 50, right: 0, top: 20, bottom: 30 } }
         resolveSizeBeforeRender = { true }
         series = { data }
         slotProps = { { legend: { hidden: true } } }
         xAxis = { [{ scaleType: "band", categoryGapRatio: 0.5, data: yearAbbreviations }] as any }
         yAxis = { [{ domainLimit: "nice", valueFormatter: displayVolume }] }
      />
   ), [colorPalette, isCard, yearAbbreviations, data]);

   return (
      <Box sx = { { position: "relative" } }>
         <Card
            elevation = { isCard ? 3 : 0 }
            sx = { { borderRadius: 2, backgroundColor: isCard ? undefined : "transparent" } }
            variant = "elevation"
         >
            <CardContent sx = { { p: isCard ? 2.5 : 0, textAlign: isCard ? { xs: "center", lg: "left" } : "center" } }>
               <Typography
                  gutterBottom = { true }
                  sx = { { mb: 0, fontWeight: "600" } }
                  variant = "subtitle2"
               >
                  { title }
               </Typography>
               <Stack sx = { { justifyContent: "space-between" } }>
                  <Stack
                     direction = { isCard ? { xs: "column", lg: "row" } : "column" }
                     sx = {
                        {
                           ...horizontalScroll(theme),
                           maxWidth: "100%",
                           alignItems: "center",
                           textAlign: isCard ? "left" : "center",
                           columnGap: 1,
                           rowGap: 0.5,
                           mx: "auto",
                           ml: isCard ? { xs: "auto", lg: 0 } : "auto"
                        }
                     }
                  >
                     <Typography
                        component = "p"
                        variant = "h6"
                     >
                        { value }
                     </Typography>
                     { extraInfo }
                  </Stack>
               </Stack>
               { chart }
            </CardContent>
         </Card>
         {
            !isCard && (
               <Stack
                  direction = "row"
                  spacing = { 2 }
                  sx = { { justifyContent: "space-between", alignItems: "center", mt: -2, px: 1 } }
               >
                  <IconButton
                     disabled = { year === 1800 }
                     onClick = { () => updateYear("previous") }
                     size = "medium"
                     sx = { { color: theme.palette.primary.main } }
                  >
                     <FontAwesomeIcon
                        icon = { faAnglesLeft }
                        size = "sm"
                     />
                  </IconButton>
                  <IconButton
                     disabled = { year === currentYear }
                     onClick = { () => updateYear("next") }
                     size = "medium"
                     sx = { { color: theme.palette.primary.main } }
                  >
                     <FontAwesomeIcon
                        icon = { faAnglesRight }
                        size = "sm"
                     />
                  </IconButton>
               </Stack>
            )
         }
      </Box>
   );
}