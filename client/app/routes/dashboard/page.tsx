import { Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useQuery } from "@tanstack/react-query";
import type { Account } from "capital-types/accounts";
import { type MarketTrends } from "capital-types/marketTrends";
import { type News } from "capital-types/news";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Finances from "@/components/dashboard/finances";
import Markets from "@/components/dashboard/markets";
import Stories from "@/components/dashboard/news";
import Quotes from "@/components/dashboard/quotes";
import Loading from "@/components/global/loading";
import { fetchDashboard } from "@/tanstack/queries/dashboard";

export default function Page() {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { data, isLoading } = useQuery({
      queryKey: ["dashboard"],
      queryFn: () => fetchDashboard(dispatch, navigate),
      staleTime: 15 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000
   });

   if (isLoading || data === null) {
      return <Loading />;
   } else {
      const accounts = data?.accounts as Account[];
      const marketTrends = data?.marketTrends as MarketTrends;
      const financialNews = data?.financialNews as News;

      return (
         <Box
            sx = { { margin: "auto", py: 6 } }
            width = { { xs: "90%" } }
         >
            <Grid
               columnSpacing = { 4 }
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
                     <Grid size = { { xs: 12 } }>
                        <Finances accounts = { accounts } />
                     </Grid>
                     <Grid size = { { xs: 12 } }>
                        <Markets data = { marketTrends } />
                     </Grid>
                  </Box>
               </Grid>
               <Grid size = { { xs: 12, lg: 4 } }>
                  <Stories data = { financialNews } />
               </Grid>
               <Grid size = { { xs: 12 } }>
                  <Quotes />
               </Grid>
            </Grid>
         </Box>
      );
   }
}