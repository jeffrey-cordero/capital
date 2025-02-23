import type { Dispatch } from "@reduxjs/toolkit";
import type { Account } from "capital-types/accounts";
import type { MarketTrends } from "capital-types/marketTrends";
import type { News } from "capital-types/news";
import type { NavigateFunction } from "react-router";

import { sendApiRequest } from "@/lib/api";

interface Dashboard {
   accounts: Account[];
   financialNews: News;
   marketTrends: MarketTrends;
}

export async function fetchDashboard(dispatch: Dispatch<any>, navigate: NavigateFunction): Promise<Dashboard | null> {
   const dashboard = await sendApiRequest("dashboard", "GET", null, dispatch, navigate) as Dashboard;

   return dashboard ? {
      accounts: dashboard.accounts,
      financialNews: dashboard.financialNews,
      marketTrends: dashboard.marketTrends
   } : null;
}