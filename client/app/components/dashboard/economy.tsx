import {
   Box,
   Card,
   CardContent,
   Chip,
   Link,
   Stack,
   Typography
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { IndicatorTrends, StockIndicator, StockTrends, Trends } from "capital/economy";
import { useSelector } from "react-redux";

import Graph from "@/components/global/graph";
import { getChipColor } from "@/lib/charts";
import { displayVolume } from "@/lib/display";
import type { RootState } from "@/redux/store";

/**
 * The props for the Stocks component.
 *
 * @interface StocksProps
 * @property {StockTrends} data - The data for the stocks component
 */
interface StocksProps {
   data: StockTrends;
}

/**
 * The props for the TrendCard component.
 *
 * @interface TrendProps
 * @property {string} title - The title for the trend card
 * @property {StockIndicator[]} data - The data for the trend card
 */
interface TrendProps {
   title: string;
   data: StockIndicator[];
}

/**
 * The TrendCard component to render the trend card.
 *
 * @param {TrendProps} props - The props for the TrendCard component
 * @returns {React.ReactNode} The TrendCard component
 */
function StockTrendCard({ title, data }: TrendProps): React.ReactNode {
   return (
      <Card
         elevation = { 3 }
         sx = { { textAlign: "left", borderRadius: 2, px: 1, pt: 1.5 } }
         variant = "elevation"
      >
         <CardContent>
            <Typography
               sx = { { mb: 2.5, fontWeight: "bold", textAlign: "center" } }
               variant = "h5"
            >
               { title }
            </Typography>
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
                              { stock.ticker }
                           </Link>
                        </Typography>
                        <Chip
                           color = { getChipColor(parseFloat(stock.change_percentage)) as any }
                           label = { `${parseFloat(stock.change_percentage).toFixed(2)}%` }
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
                           ${ Number(stock.price).toFixed(2) }
                           { " " }
                           ({ Number(stock.change_amount) < 0 ? "-" : "+" }
                           { Math.abs(Number(stock.change_amount)).toFixed(2) })
                        </Typography>
                        <Typography
                           fontWeight = "600"
                           variant = "body2"
                        >
                           { displayVolume(Number(stock.volume)) } shares
                        </Typography>
                     </Stack>
                  </Stack>
               ))
            }
         </CardContent>
      </Card>
   );
}

/**
 * The Stocks component to render the stocks component.
 *
 * @param {StocksProps} props - The props for the Stocks component
 * @returns {React.ReactNode} The Stocks component
 */
function Stocks({ data }: StocksProps): React.ReactNode {
   const { top_gainers, top_losers, most_actively_traded } = data;

   return (
      <Stack
         direction = "column"
         id = "stocks"
         sx = { { gap: 2, textAlign: "center", justifyContent: "center", alignItems: "center" } }
      >
         <Grid
            container = { true }
            direction = "row"
            spacing = { 2 }
            sx = { { width: "100%" } }
         >
            <Grid size = { { xs: 12, sm: 6, md: 4 } }>
               <StockTrendCard
                  data = { top_gainers }
                  title = "Top Gainers"
               />
            </Grid>
            <Grid size = { { xs: 12, sm: 6, md: 4 } }>
               <StockTrendCard
                  data = { top_losers }
                  title = "Top Losers"
               />
            </Grid>
            <Grid size = { { xs: 12, md: 4 } }>
               <StockTrendCard
                  data = { most_actively_traded }
                  title = "Most Active"
               />
            </Grid>
         </Grid>
      </Stack>
   );
}

/**
 * The Economy component to render the economy trends, such as indicators and stocks.
 *
 * @returns {React.ReactNode} The Economy component
 */
export default function Economy(): React.ReactNode {
   const trends: Trends = useSelector((state: RootState) => state.economy.value.trends);

   // Extract and format indicators data
   const indicators: Record<string, IndicatorTrends[]> = Object.keys(trends)
      .filter(key => key !== "Stocks")
      .reduce((acc: { [key: string]: IndicatorTrends[] }, record) => {
         acc[record] = trends[record] as IndicatorTrends[];
         return acc;
      }, {});

   // Extract stocks data and format last update time
   const stocks = trends["Stocks"] as StockTrends;
   const [date, time] = stocks.last_updated.split(" ");
   const timeSinceLastUpdated = new Date(date + " " + time).toLocaleString();

   return (
      <Stack
         direction = "column"
         id = "economy"
         sx = { { justifyContent: "space-between", mt: 4 } }
      >
         <Stack
            direction = "column"
            sx = { { mb: 2 } }
         >
            <Box>
               <Typography
                  fontWeight = "bold"
                  sx = { { px: 2 } }
                  variant = "subtitle2"
               >
                  Last updated
               </Typography>
               <Typography
                  fontWeight = "bold"
                  sx = { { px: 2 } }
                  variant = "subtitle2"
               >
                  { timeSinceLastUpdated }
               </Typography>
            </Box>
         </Stack>
         <Stack
            direction = "column"
            sx = { { gap: 2.2 } }
         >
            <Graph
               average = { true }
               card = { true }
               data = { indicators as any }
               defaultOption = "GDP"
               indicators = { true }
               title = "Indicators"
            />
            <Stocks data = { stocks } />
         </Stack>
      </Stack>
   );
}