import type { Account } from "./accounts";
import type { OrganizedBudgets } from "./budgets";
import type { MarketTrends } from "./markets";
import type { News } from "./news";
import type { Transaction } from "./transactions";

/**
 * Represents the dashboard interface for the dashboard page
 */
export interface Dashboard {
   news: News;
   trends: MarketTrends;
   accounts: Account[];
   budgets: OrganizedBudgets;
   transactions: Transaction[];
}