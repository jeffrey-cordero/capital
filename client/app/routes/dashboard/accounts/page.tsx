import { Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useQuery } from "@tanstack/react-query";
import type { Account } from "capital/accounts";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import Accounts from "@/components/dashboard/accounts/accounts";
import Transactions from "@/components/dashboard/accounts/all-transactions";
import Loading from "@/components/global/loading";
import { setAccounts } from "@/redux/slices/accounts";
import type { RootState } from "@/redux/store";
import { fetchAccounts } from "@/tanstack/queries/dashboardQueries";

export default function Page() {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { data, isLoading, isError } = useQuery({
      queryKey: ["dashboard"],
      queryFn: () => fetchAccounts(dispatch, navigate),
      staleTime: 1 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000
   });
   const accounts = useSelector((root: RootState) => root.accounts.value) as Account[];

   useEffect(() => {
      if (!isLoading && !isError) {
         dispatch(setAccounts(data as Account[]));
      }
   }, [isLoading, isError, data, dispatch]);

   if (isLoading || data === null) {
      return <Loading />;
   } else {
      return (
         <Stack
            direction = "column"
            sx = { {  width: { xs: "90%" }, margin: "auto", py: 6, textAlign: "center" } }
         >
            <Grid size = { { xs: 12, xl: 8 } }>
               <Accounts accounts = { accounts } />
            </Grid>
            <Grid size = { { xs: 12, xl: 4 } }>
               <Transactions />
            </Grid>
         </Stack>
      );
   }
}