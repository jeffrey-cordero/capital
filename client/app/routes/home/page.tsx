import { Box, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useQueries } from "@tanstack/react-query";
import { type IndicatorTrend, type MarketTrends, type StockTrends } from "capital-types/marketTrends";
import { type News } from "capital-types/news";

import Loading from "@/components/global/loading";
import Finances from "@/components/home/finances";
import { Markets, Stocks } from "@/components/home/indicators";
import Stories, { timeSinceLastUpdate } from "@/components/home/news";
import Quotes from "@/components/home/quotes";
import { sendApiRequest } from "@/lib/server";

async function fetchNews(): Promise<News> {
   return (await sendApiRequest("home/news", "GET", null))?.data.news;
}

async function fetchMarketTrends(): Promise<MarketTrends> {
   return (await sendApiRequest("home/marketTrends", "GET", null))?.data.marketTrends;
}

export default function Home() {
   const homeQueries = useQueries({
      queries: [
         // Cache the market trends result for 24 hours
         { queryKey: ["marketTrends"], queryFn: fetchMarketTrends, staleTime: 24 * 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000 },
         // Cache the news result for 15 minutes
         { queryKey: ["news"], queryFn: fetchNews, staleTime: 15 * 60 * 1000, gcTime: 15 * 60 * 1000 }
      ]
   });

   const [marketTrends, newsData] = homeQueries;
   const isLoading: boolean = marketTrends.isLoading || newsData.isLoading;

   const trends = marketTrends.data as MarketTrends;
   const stocks = trends["Stocks"] as StockTrends;
   const news = newsData.data as News;

   const lastUpdatedDate = stocks.last_updated.split(" ");
   const timeSinceLastUpdated = timeSinceLastUpdate(lastUpdatedDate[0] + ":" + lastUpdatedDate[1]);

   return (
      !isLoading ? (
         <Box
            sx = { { margin: "auto", py: 6 } }
            width = { { xs: "90%" } }
         >
            <Grid
               columnSpacing = { 4 }
               container = { true }
               sx = { { width: "100%", height: "100%" } }
            >
               <Grid size = { { xs: 12, xl: 8 } }>
                  <Box
                     sx = {
                        {
                           display: "flex",
                           flexDirection: "column",
                           justifyContent: "start",
                           alignItems: "center",
                           height: "100%",
                           gap: "2rem",
                           textAlign: "center"
                        }
                     }
                  >
                     <Grid size = { { xs: 12 } }>
                        <Finances />
                     </Grid>
                     <Grid size = { { xs: 12 } }>
                        <Stack direction="column" spacing={1}>
                           <Box className = "animation-container">
                              <Box
                                 alt = "Stocks"
                                 className = "floating"
                                 component = "img"
                                 src = "stocks.svg"
                                 sx = { { width: 400, height: "auto", mx: "auto" } }
                              />
                           </Box>
                           <Box>
                           <Typography
                              fontStyle = "italic"
                              fontWeight = "bold"
                              variant = "subtitle2"
                              sx={{ mb: 2}}
                           >
                              Last updated { timeSinceLastUpdated }
                           </Typography>
                           </Box>
                           
                              <Markets
                                 data =  {
                                    Object.keys(trends)
                                       .filter(key => key !== "Stocks")
                                       .reduce((acc: { [key: string]: IndicatorTrend[] }, key) => {
                                          acc[key] = trends[key] as IndicatorTrend[];
                                          return acc;
                                       }, {})
                                 }
                              />
                              <Stocks { ...stocks } />
                        </Stack>
                     </Grid>
                  </Box>
               </Grid>
               <Grid size = { { xs: 12, xl: 4 } }>
                  <Stories news = { news } />
               </Grid>
               <Grid size = { { xs: 12 } }>
                  <Quotes />
               </Grid>
            </Grid>
         </Box>
      ) : (
         <Loading />
      )
   );
}