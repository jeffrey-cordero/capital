import { Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useQueries } from "@tanstack/react-query";
import { type MarketTrends } from "capital-types/marketTrends";
import { type News } from "capital-types/news";

import Loading from "@/components/global/loading";
import Finances from "@/components/home/finances";
import { Indicators  } from "@/components/home/indicators";
import Stories from "@/components/home/news";
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

   if (isLoading) return <Loading />;

   return (
      <Box
         sx = { { margin: "auto", py: 6 } }
         width = { { xs: "90%" } }
      >
         <Grid
            columnSpacing = { 0 }
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
                     <Indicators data = { marketTrends.data as MarketTrends } />
                  </Grid>
               </Box>
            </Grid>
            <Grid size = { { xs: 12, xl: 4 } }>
               <Stories data = { newsData.data as News } />
            </Grid>
            <Grid size = { { xs: 12 } }>
               <Quotes />
            </Grid>
         </Grid>
      </Box>
   );
}