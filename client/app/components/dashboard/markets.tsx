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
import type { IndicatorTrend, MarketTrends, StockIndicator, StockTrends } from "capital/markets";
import { useSelector } from "react-redux";

import Graph from "@/components/global/graph";
import { getChipColor } from "@/lib/charts";
import { timeSinceLastUpdate } from "@/lib/dates";
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
 * @property {string} image - The image for the trend card
 */
interface TrendProps {
   title: string;
   data: StockIndicator[];
   image: string;
}

/**
 * The TrendCard component to render the trend card.
 *
 * @param {TrendProps} props - The props for the TrendCard component
 * @returns {React.ReactNode} The TrendCard component
 */
function StockTrendCard({ title, data, image }: TrendProps): React.ReactNode {
   return (
      <Card
         elevation = { 3 }
         sx = { { textAlign: "left", borderRadius: 2, px: 1 } }
         variant = "elevation"
      >
         <CardContent>
            <Box sx = { { textAlign: "center" } }>
               <Box
                  alt = "Stock"
                  component = "img"
                  src = { image }
                  sx = { { width: 200, height: "auto", mx: "auto", my: 0 } }
               />
               <Typography
                  sx = { { mb: 3, fontWeight: "bold" } }
                  variant = "h5"
               >
                  { title }
               </Typography>
            </Box>
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
                           ${ parseFloat(stock.price).toFixed(2) }
                           { " " }
                           ({ parseFloat(stock.change_amount) < 0 ? "-" : "+" }
                           { Math.abs(parseFloat(stock.change_amount)).toFixed(2) })
                        </Typography>
                        <Typography
                           fontWeight = "600"
                           variant = "body2"
                        >
                           { displayVolume(parseInt(stock.volume)) } shares
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
         sx = { { gap: 2, mt: 1, textAlign: "center", justifyContent: "center", alignItems: "center" } }
      >
         <Grid
            container = { true }
            direction = "row"
            spacing = { 2 }
            sx = { { width: "100%", mt: 2 } }
         >
            <Grid size = { { xs: 12, sm: 6, md: 4 } }>
               <StockTrendCard
                  data = { top_gainers }
                  image = "/svg/winners.svg"
                  title = "Top Gainers"
               />
            </Grid>
            <Grid size = { { xs: 12, sm: 6, md: 4 } }>
               <StockTrendCard
                  data = { top_losers }
                  image = "/svg/loss.svg"
                  title = "Top Losers"
               />
            </Grid>
            <Grid size = { { xs: 12, md: 4 } }>
               <StockTrendCard
                  data = { most_actively_traded }
                  image = "/svg/active.svg"
                  title = "Most Active"
               />
            </Grid>
         </Grid>
      </Stack>
   );
}

/**
 * The Markets component to render the market trends, such as indicators and stocks.
 *
 * @returns {React.ReactNode} The Markets component
 */
export default function Markets(): React.ReactNode {
   const trends: MarketTrends = useSelector((state: RootState) => state.markets.value.trends);

   // Extract and format indicators data
   const indicators = Object.keys(trends)
      .filter(key => key !== "Stocks")
      .reduce((acc: { [key: string]: IndicatorTrend[] }, record) => {
         acc[record] = trends[record] as IndicatorTrend[];
         return acc;
      }, {});

   // Extract stocks data and format last update time
   const stocks = trends["Stocks"] as StockTrends;
   const [date, time] = stocks.last_updated.split(" ");
   const timeSinceLastUpdated = timeSinceLastUpdate(`${date}:${time}`);

   return (
      <Stack
         direction = "column"
         id = "markets"
         sx = { { justifyContent: "space-between" } }
      >
         <Box className = "animation-container">
            <Box
               alt = "Stocks"
               className = "floating"
               component = "img"
               src = "/svg/economy.svg"
               sx = { { width: 390, height: "auto", mx: "auto" } }
            />
         </Box>
         <Box sx = { { mt: -3, mb: 3 } }>
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
         <Graph
            average = { true }
            card = { true }
            data = { indicators }
            defaultOption = "GDP"
            indicators = { true }
            title = "Indicators"
         />
         <Stocks data = { stocks } />
      </Stack>
   );
}