import { Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useQuery } from "@tanstack/react-query";
import type { Account } from "capital-types/accounts";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Accounts from "@/components/dashboard/accounts/accounts";
import Transactions from "@/components/dashboard/accounts/transactions";
import Loading from "@/components/global/loading";
import { fetchAccounts } from "@/tanstack/queries/dashboard";

export default function Page() {
   const dispatch = useDispatch();
   const navigate = useNavigate();

   const { data, isLoading } = useQuery({
      queryKey: ["dashboard"],
      queryFn: () => fetchAccounts(dispatch, navigate),
      staleTime: 1 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000
   });

   if (isLoading || data === null) {
      return <Loading />;
   } else {
      const accounts = data as Account[];

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