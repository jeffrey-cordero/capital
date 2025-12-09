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
 * Props for the Stocks component
 *
 * @property {StockTrends} data - Stock trend data
 */
interface StocksProps {
   data: StockTrends;
}

/**
 * Props for the TrendCard component
 *
 * @property {string} title - Card title
 * @property {StockIndicator[]} data - Stock indicators data
 * @property {string} type - Type identifier for data-testid (e.g., "top-gainers")
 */
interface TrendProps {
   title: string;
   data: StockIndicator[];
   type: string;
}

/**
 * Displays stock trends in a card format
 *
 * @param {TrendProps} props - Trend card component props
 * @returns {React.ReactNode} The StockTrendCard component
 */
function StockTrendCard({ title, data, type }: TrendProps): React.ReactNode {
   return (
      <Card
         data-testid = { `stocks-${type}-container` }
         elevation = { 3 }
         sx = { { textAlign: "left", borderRadius: 2, px: 1, pt: 1.5, pb: 0.5 } }
         variant = "elevation"
      >
         <CardContent>
            <Typography
               sx = { { mb: 2.5, fontWeight: "bold", textAlign: "center" } }
               variant = "h5"
            >
               { title }
            </Typography>
            <Stack
               direction = "column"
               spacing = { 2 }
            >
               {
                  data.map((stock, index) => {
                     const chipColor = getChipColor(parseFloat(stock.change_percentage));
                     return (
                        <Stack
                           data-testid = { `stock-item-${index}` }
                           direction = "column"
                           key = { index }
                        >
                           <Stack
                              direction = "row"
                              sx = { { justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: 1, mb: 0.5 } }
                           >
                              <Typography
                                 component = "p"
                                 sx = { { fontWeight: "bold" } }
                                 variant = "h6"
                              >
                                 <Link
                                    data-testid = { `stock-link-${type}-${index}` }
                                    href = { `https://www.google.com/search?q=${stock.ticker}+stock` }
                                    target = "_blank"
                                    underline = "none"
                                 >
                                    { stock.ticker }
                                 </Link>
                              </Typography>
                              <Chip
                                 color = { chipColor as any }
                                 data-chip-color = { chipColor }
                                 data-testid = { `stock-percent-chip-${chipColor}-${index}` }
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
                     );
                  })
               }
            </Stack>
         </CardContent>
      </Card>
   );
}

/**
 * Renders stock information grouped by performance categories
 *
 * @param {StocksProps} props - Stocks component props
 * @returns {React.ReactNode} The Stocks component
 */
function Stocks({ data }: StocksProps): React.ReactNode {
   const { top_gainers, top_losers, most_actively_traded } = data;

   return (
      <Stack
         direction = "column"
         id = "stocks"
         sx = { { textAlign: "center", justifyContent: "center", alignItems: "center" } }
      >
         <Grid
            columnSpacing = { 1.5 }
            container = { true }
            direction = "row"
            sx = { { width: "100%" } }
         >
            <Grid size = { { xs: 12, sm: 6, md: 4 } }>
               <StockTrendCard
                  data = { top_gainers }
                  title = "Top Gainers"
                  type = "top-gainers"
               />
            </Grid>
            <Grid size = { { xs: 12, sm: 6, md: 4 } }>
               <StockTrendCard
                  data = { top_losers }
                  title = "Top Losers"
                  type = "top-losers"
               />
            </Grid>
            <Grid size = { { xs: 12, md: 4 } }>
               <StockTrendCard
                  data = { most_actively_traded }
                  title = "Most Active"
                  type = "most-active"
               />
            </Grid>
         </Grid>
      </Stack>
   );
}

/**
 * Displays economic indicators and stock market trends
 *
 * @returns {React.ReactNode} The Economy component
 */
export default function Economy(): React.ReactNode {
   const trends: Trends = useSelector((state: RootState) => state.economy.value.trends);

   // Extract and format indicators data for the graph
   const indicators: Record<string, IndicatorTrends[]> = Object.keys(trends)
      .reduce((acc: { [key: string]: IndicatorTrends[] }, record) => {
         if (record === "Stocks") {
            // Skip stocks indicators
            return acc;
         }

         acc[record] = trends[record] as IndicatorTrends[];
         return acc;
      }, {});

   // Format stock data and last update timestamp
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
            sx = { { mb: 4 } }
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
               data = { indicators as any }
               defaultValue = "Federal Interest Rate"
               isAverage = { false }
               isCard = { true }
               isIndicators = { true }
               title = "Indicators"
            />
            <Stocks data = { stocks } />
         </Stack>
      </Stack>
   );
}