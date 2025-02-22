import { Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useQuery } from "@tanstack/react-query";
import { type MarketTrends } from "capital-types/marketTrends";
import { type News } from "capital-types/news";

import Loading from "@/components/global/loading";
import Finances from "@/components/dashboard/finances";
import { Indicators } from "@/components/dashboard/indicators";
import Stories from "@/components/dashboard/news";
import Quotes from "@/components/dashboard/quotes";
import { sendApiRequest } from "@/lib/server";

async function fetchHomeData(): Promise<{ marketTrends: MarketTrends, financialNews: News }> {
   return (await sendApiRequest("dashboard", "GET", null))?.data;
}

export default function Page() {
   const { data, isLoading } = useQuery({
      queryKey: ["dashboard"],
      queryFn: fetchHomeData,
      staleTime: 15 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000
   });

   if (isLoading) return <Loading />;

   const marketTrends = data?.marketTrends as MarketTrends;
   const financialNews = data?.financialNews as News;

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
                     <Indicators data = { marketTrends } />
                  </Grid>
               </Box>
            </Grid>
            <Grid size = { { xs: 12, xl: 4 } }>
               <Stories data = { financialNews } />
            </Grid>
            <Grid size = { { xs: 12 } }>
               <Quotes />
            </Grid>
         </Grid>
      </Box>
   );
}