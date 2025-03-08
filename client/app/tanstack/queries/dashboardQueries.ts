import type { Dispatch } from "@reduxjs/toolkit";
import type { Account } from "capital/accounts";
import type { MarketTrends } from "capital/marketTrends";
import type { News } from "capital/news";
import type { NavigateFunction } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { setAccounts } from "@/redux/slices/accounts";
import { setEconomy } from "@/redux/slices/economy";

interface Dashboard {
   accounts: Account[];
   news: News;
   marketTrends: MarketTrends;
}

export async function fetchDashboard(
   dispatch: Dispatch<any>,
   navigate: NavigateFunction
): Promise<Dashboard | null> {
   const dashboard: Dashboard = await sendApiRequest(
      "dashboard", "GET", null, dispatch, navigate
   );

   dispatch(setAccounts(dashboard.accounts));
   dispatch(setEconomy({
      news: dashboard.news,
      marketTrends: dashboard.marketTrends
   }));

   return dashboard ?? null;
}