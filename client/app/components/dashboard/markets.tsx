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
import type { IndicatorTrend, MarketTrends, StockIndicator, StockTrends } from "capital/marketTrends";

import Graph, { getChipColor } from "@/components/global/graph";
import { timeSinceLastUpdate } from "@/lib/dates";
import { displayVolume } from "@/lib/display";

function Stocks({ data }: { data: StockTrends }) {
   const { top_gainers, top_losers, most_actively_traded } = data;

   // Helper function to render a single stock trend
   const renderTrend = (
      title: string,
      data: StockIndicator[],
      image: string
   ) => {
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
                                 { stock.ticker } { }
                              </Link>
                           </Typography>
                           <Chip
                              color = { getChipColor(parseFloat(stock.change_percentage)) }
                              label = { parseFloat(stock.change_percentage).toFixed(2) + "%" }
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
   };

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
               { renderTrend("Top Gainers", top_gainers, "/svg/winners.svg") }
            </Grid>
            <Grid size = { { xs: 12, sm: 6, md: 4 } }>
               { renderTrend("Top Losers", top_losers, "/svg/loss.svg") }
            </Grid>
            <Grid size = { { xs: 12, md: 4 } }>
               { renderTrend("Most Active", most_actively_traded, "/svg/active.svg") }
            </Grid>
         </Grid>
      </Stack>
   );
}

export default function Markets({ data }: { data: MarketTrends }) {
   const indicators = Object.keys(data).filter(key => key !== "Stocks")
      .reduce((acc: { [key: string]: IndicatorTrend[] }, record) => {
         acc[record] = data[record] as IndicatorTrend[];

         return acc;
      }, {});
   const stocks = data["Stocks"] as StockTrends;
   const lastUpdatedDate = stocks.last_updated.split(" ");
   const timeSinceLastUpdated = timeSinceLastUpdate(lastUpdatedDate[0] + ":" + lastUpdatedDate[1]);

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
               sx = { { width: 406, height: "auto", mx: "auto" } }
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
            title = "Indicator"
         />
         <Stocks
            data = { stocks }
         />
      </Stack>
   );
}