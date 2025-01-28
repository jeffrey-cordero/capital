import "@/styles/home.scss";

import { Box, Container } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import type { Feed } from "capital-types/news";
import type { Stocks } from "capital-types/stocks";
import { useDispatch } from "react-redux";

import Loading from "@/components/global/loading";
import Finances from "@/components/home/finances";
import News from "@/components/home/news";
import Quotes from "@/components/home/quotes";
import MonthlyStocks from "@/components/home/stocks";
import { sendApiRequest } from "@/lib/server";

async function fetchNews(): Promise<Feed> {
   return (await sendApiRequest("home/news", "GET", null))?.data.news as Feed;
}

async function fetchStocks(): Promise<Stocks> {
   return (await sendApiRequest("home/stocks", "GET", null))?.data.stocks as Stocks;
}

export default function Home() {
   const homeQueries = useQueries({
      queries: [
         { queryKey: ["stocks"], queryFn: fetchStocks, staleTime: 60 * 60 * 1000, gcTime: 60 * 60 * 1000 },
         { queryKey: ["news"], queryFn: fetchNews, staleTime: 60 * 60 * 1000, gcTime: 60 * 60 * 1000 }
      ]
   });

   const [stocks, news] = homeQueries;
   const isLoading: boolean = stocks.isLoading || news.isLoading;

   return (
      !isLoading ? (
         <Box
            sx = { { margin: "auto", py: 6 } }
            width = { { xs: "95%", sm: "90%", md: "85%", lg: "80%", xl: "75%" } }
         >
            <Grid
               columnSpacing = { 8 }
               container = { true }
               sx = { { width: "100%", height: "100%" } }
            >
               <Grid size = { { xs: 12, lg: 8 } }>
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
                     <Finances />
                     <Quotes />
                  </Box>
               </Grid>
               <Grid size = { { xs: 12, lg: 4 } }>
                  <News news = { news.data as Feed } />
               </Grid>
            </Grid>
         </Box>
      ) : (
         <Loading />
      )
   );
}