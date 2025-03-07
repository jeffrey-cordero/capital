import type { Dispatch } from "@reduxjs/toolkit";
import type { Account } from "capital/accounts";
import type { MarketTrends } from "capital/marketTrends";
import type { News } from "capital/news";
import type { NavigateFunction } from "react-router";

import { sendApiRequest } from "@/lib/api";

interface Dashboard {
   accounts: Account[];
   financialNews: News;
   marketTrends: MarketTrends;
}

export async function fetchDashboard(
   dispatch: Dispatch<any>,
   navigate: NavigateFunction
): Promise<Dashboard | null> {
   const dashboard: Dashboard = await sendApiRequest(
      "dashboard", "GET", null, dispatch, navigate
   );

   return dashboard ?? null;
}

export async function fetchAccounts(
   dispatch: Dispatch<any>,
   navigate: NavigateFunction
): Promise<Account[] | null> {
   const accounts: Account[] = await sendApiRequest(
      "dashboard/accounts", "GET", null, dispatch, navigate
   );

   return accounts ?? null;
}