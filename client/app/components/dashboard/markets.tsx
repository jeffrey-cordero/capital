import { Box, Card, CardContent, Chip, Link, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { IndicatorTrend, MarketTrends, StockIndictor, StockTrends } from "capital/marketTrends";

import Graph, { getChipColor } from "@/components/global/graph";
import { timeSinceLastUpdate } from "@/lib/dates";

function Stocks({ data }: { data: StockTrends }) {
   const { top_gainers, top_losers, most_actively_traded } = data;

   // Helper function to render a single stock trend
   const renderTrend = (
      title: string,
      data: StockIndictor[],
      trend: "up" | "down" | "neutral",
      image: string
   ) => {
      return (
         <Card
            elevation = { 3 }
            sx = { { textAlign: "left", borderRadius: 2, mb: 2, px: 2 } }
            variant = "elevation"
         >
            <CardContent>
               <Box sx = { { textAlign: "center" } }>
                  <Box
                     alt = "Stock"
                     component = "img"
                     src = { image }
                     sx = { { width: 125, height: "auto", mx: "auto", my: 0 } }
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
                              { new Intl.NumberFormat().format(parseInt(stock.volume)) } shares
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
            <Grid size = { { xs: 12, md: 6, lg: 4 } }>
               { renderTrend("Top Gainers", top_gainers, "up", "/svg/rocket.svg") }
            </Grid>
            <Grid size = { { xs: 12, md: 6, lg: 4 } }>
               { renderTrend("Top Losers", top_losers, "down", "/svg/loss.svg") }
            </Grid>
            <Grid size = { { xs: 12, lg: 4 } }>
               { renderTrend("Most Active", most_actively_traded, "neutral", "/svg/active.svg") }
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
      >
         <Box className = "animation-container">
            <Box
               alt = "Stocks"
               className = "floating"
               component = "img"
               src = "/svg/stocks.svg"
               sx = { { width: 400, height: "auto", mx: "auto" } }
            />
         </Box>
         <Box>
            <Typography
               fontStyle = "italic"
               fontWeight = "bold"
               sx = { { mb: 2, mt: -5, px: 2 } }
               variant = "subtitle2"
            >
               Last updated { timeSinceLastUpdated }
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