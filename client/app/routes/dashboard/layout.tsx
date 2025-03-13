import type { Dispatch } from "@reduxjs/toolkit";
import { useQuery } from "@tanstack/react-query";
import type { Account } from "capital/accounts";
import type { MarketTrends } from "capital/marketTrends";
import type { News } from "capital/news";
import { useDispatch } from "react-redux";
import type { NavigateFunction } from "react-router";
import { Outlet, useNavigate } from "react-router";

import Loading from "@/components/global/loading";
import { sendApiRequest } from "@/lib/api";
import { setAccounts } from "@/redux/slices/accounts";
import { setMarkets } from "@/redux/slices/markets";

interface Dashboard {
   news: News;
   trends: MarketTrends;
   accounts: Account[];
}

export async function fetchDashboard(
   dispatch: Dispatch<any>,
   navigate: NavigateFunction
): Promise<Dashboard | null> {
   const dashboard = await sendApiRequest<Dashboard>(
      "dashboard", "GET", null, dispatch, navigate
   );

   if (typeof dashboard === "object" && dashboard !== null) {
      dispatch(setAccounts(dashboard.accounts));
      dispatch(setMarkets({
         news: dashboard.news,
         trends: dashboard.trends
      }));

      return dashboard;
   } else {
      return null;
   }
}

export default function Layout() {
   // Fetch the dashboard content to be shared amongst the pages with a 15 minute refresh interval
   const dispatch = useDispatch(), navigate = useNavigate();
   const { data, isError, isLoading } = useQuery({
      queryKey: ["dashboard"],
      queryFn: () => fetchDashboard(dispatch, navigate),
      staleTime: 15 * 60 * 1000,
      gcTime: 30 * 60 * 1000
   });

   if (isLoading || isError || data === null) {
      return <Loading />;
   } else {
      return <Outlet />;
   }
}