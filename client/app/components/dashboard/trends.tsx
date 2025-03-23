import { faBackward, faForward } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Card,
   CardContent,
   Chip,
   IconButton,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { useCallback, useState } from "react";

import { getCurrentDate, getYearAbbreviations } from "@/lib/dates";
import { displayVolume, ellipsis } from "@/lib/display";

interface TrendProps {
   isCard: boolean;
   title: string;
   value: string;
   subtitle: string;
   years: {
      id: string;
      label: string;
      data: number[];
      stack: string;
      color: string;
   }[];
   extraInfo?: React.ReactNode;
}

export function Trends({ title, value, subtitle, isCard, years, extraInfo }: TrendProps) {
   const theme = useTheme();
   const [year, setYear] = useState<number>(getCurrentDate().getUTCFullYear());

   // Use theme colors for consistent styling
   const colorPalette = [
      theme.palette.primary.dark,
      theme.palette.primary.main,
      theme.palette.primary.light
   ];

   const changeYear = useCallback((direction: "previous" | "next") => {
      setYear(year + (direction === "previous" ? -1 : 1));
   }, [year]);

   // Create the chart content
   const chart = (
      <BarChart
         borderRadius = { 8 }
         colors = { colorPalette }
         grid = { { horizontal: true } }
         height = { isCard ? 300 : 450 }
         margin = { { left: 50, right: 0, top: 20, bottom: 30 } }
         resolveSizeBeforeRender = { true }
         series = { years }
         slotProps = { { legend: { hidden: true } } }
         xAxis = {
            [{
               scaleType: "band",
               categoryGapRatio: 0.5,
               data: getYearAbbreviations(year)
            }] as any
         }
         yAxis = {
            [{
               domainLimit: "nice",
               valueFormatter: displayVolume
            }]
         }
      />
   );

   return (
      <Box sx = { { position: "relative" } }>
         <Card
            elevation = { isCard ? 3 : 0 }
            sx = { { borderRadius: 2 } }
            variant = "elevation"
         >
            <CardContent sx = { { p: isCard ? 2.5 : 0, textAlign: isCard ? "left" : "center" } }>
               <Typography
                  component = "h2"
                  gutterBottom = { true }
                  variant = "subtitle2"
               >
                  { title } Trends
               </Typography>
               <Stack sx = { { justifyContent: "space-between" } }>
                  <Stack
                     direction = "row"
                     sx = {
                        {
                           justifyContent: isCard ? "flex-start" : "center",
                           alignContent: "center",
                           alignItems: "center",
                           gap: 1
                        }
                     }
                  >
                     <Typography
                        component = "p"
                        sx = { { ...ellipsis, maxWidth: "95%" } }
                        variant = "h4"
                     >
                        { value }
                     </Typography>
                     { extraInfo }
                  </Stack>
                  <Typography
                     sx = { { color: "text.secondary" } }
                     variant = "caption"
                  >
                     { subtitle }
                  </Typography>
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
                     onClick = { () => changeYear("previous") }
                     size = "medium"
                     sx = { { color: theme.palette.primary.main } }
                  >
                     <FontAwesomeIcon
                        icon = { faBackward }
                        size = "sm"
                     />
                  </IconButton>
                  <IconButton
                     disabled = { year === getCurrentDate().getUTCFullYear() }
                     onClick = { () => changeYear("next") }
                     size = "medium"
                     sx = { { color: theme.palette.primary.main } }
                  >
                     <FontAwesomeIcon
                        icon = { faForward }
                        size = "sm"
                     />
                  </IconButton>
               </Stack>
            )
         }
      </Box>
   );
}