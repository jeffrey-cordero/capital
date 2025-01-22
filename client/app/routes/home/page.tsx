import "@/styles/home.scss";

import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Container } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import type { Feed } from "capital-types/news";
import type { Stocks } from "capital-types/stocks";
import { useDispatch } from "react-redux";

import Loading from "@/components/global/loading";
import News from "@/components/home/news";
import Quotes from "@/components/home/quotes";
import MonthlyStocks from "@/components/home/stocks";
import { clearAuthentication } from "@/lib/auth";
import { logout } from "@/redux/slices/auth";
import { sendApiRequest } from "@/lib/server";
import MainGrid from "@/components/home/grid";


async function fetchNews(): Promise<Feed> {
   return (await sendApiRequest("home/news", "GET", null))?.data.news as Feed;
}

async function fetchStocks(): Promise<Stocks> {
   return (await sendApiRequest("home/stocks", "GET", null))?.data.stocks as Stocks;
}

export default function Home() {
   const dispatch = useDispatch();
   const queryClient = useQueryClient();

   const homeQueries = useQueries({
      queries: [
         { queryKey: ["stocks"], queryFn: fetchStocks, staleTime: 60 * 60 * 1000, gcTime: 60 * 60 * 1000 },
         { queryKey: ["news"], queryFn: fetchNews, staleTime: 60 * 60 * 1000, gcTime: 60 * 60 * 1000 }
      ]
   });

   const mutation = useMutation({
      mutationFn: clearAuthentication,
      onSuccess: () => {
         // Update cached authentication status
         queryClient.setQueriesData({ queryKey: "auth" }, false);

         // Update Redux store
         dispatch(logout());

         // Navigate to the login page
         window.location.reload();
      },
      onError: (error: any) => {
         console.error(error);
      }
   });

   const [stocks, news] = homeQueries;
   const isLoading: boolean = stocks.isLoading || news.isLoading;

   return (
      !isLoading ? (
         <Container sx= {{ py: 6}}>
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
                     {/* <MonthlyStocks stocks = { JSON.parse(stocks.data as unknown as string ) } /> */}
                     <MainGrid />
                     <Quotes />
                     <Grid
                        alignItems = "center"
                        container = { true }
                        direction = "row"
                        justifyContent = "center"
                        spacing = { 3 }
                     >
                        <Button
                           color = "error"
                           onClick = {
                              () => {
                                 mutation.mutate();
                                 window.location.reload();
                              }
                           }
                           startIcon = { <FontAwesomeIcon icon = { faRightFromBracket } /> }
                           variant = "contained"
                        >
                           Logout
                        </Button>
                     </Grid>
                  </Box>
               </Grid>
               <Grid size = { { xs: 12, lg: 4 } }>
                  <News news = { news.data as Feed } />
               </Grid>
            </Grid>
         </Container>
      ) : (
         <Loading />
      )
   );
}