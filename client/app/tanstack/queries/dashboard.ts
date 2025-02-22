import { sendApiRequest } from "@/lib/server";
import type { Account } from "capital-types/accounts";
import type { MarketTrends } from "capital-types/marketTrends";
import type { News } from "capital-types/news";

interface Dashboard {
   accounts: Account[];
   financialNews: News;
   marketTrends: MarketTrends;
}

export async function fetchDashboard(): Promise<Dashboard> {
   // const dashboard = await sendApiRequest("dashboard", "GET", null);
   const [dashboard, accounts] = await Promise.all([
      sendApiRequest("dashboard", "GET", null),
      sendApiRequest("dashboard/accounts", "GET", null)
   ]);

   return {
      accounts: accounts ? accounts.data.accounts : [],
      financialNews: dashboard ? dashboard.data.financialNews : {},
      marketTrends: dashboard ? dashboard.data.marketTrends : {}
   }
}