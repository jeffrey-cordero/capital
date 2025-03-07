import { Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useQuery } from "@tanstack/react-query";
import type { Account } from "capital/accounts";
import { type MarketTrends } from "capital/marketTrends";
import { type News } from "capital/news";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import Finances from "@/components/dashboard/finances";
import Markets from "@/components/dashboard/markets";
import Stories from "@/components/dashboard/news";
import Loading from "@/components/global/loading";
import type { RootState } from "@/redux/store";
import { fetchDashboard } from "@/tanstack/queries/dashboardQueries";

export default function Page() {
   const dispatch = useDispatch(), navigate = useNavigate();
   const accounts: Account[] = useSelector(
      (root: RootState) => root.accounts.value
   ) as Account[];
   const { data, isError, isLoading } = useQuery({
      queryKey: ["dashboard"],
      queryFn: () => fetchDashboard(dispatch, navigate),
      staleTime: 15 * 1000,
      gcTime: 30 * 60 * 60 * 1000
   });

   if (isLoading || isError || data === null) {
      return <Loading />;
   } else {
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
            </Grid>
         </Box>
      );
   }
}