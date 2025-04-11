import type { Account } from "./accounts";
import type { OrganizedBudgets } from "./budgets";
import type { MarketTrends } from "./markets";
import type { News } from "./news";
import type { Transaction } from "./transactions";

/**
 * Represents the external API data for the dashboard page
 */
export interface ExternalAPIs {
   news: News;
   trends: MarketTrends;
}

/**
 * Represents the dashboard interface for the dashboard page
 */
export interface Dashboard {
   externalAPIs: ExternalAPIs;
   accounts: Account[];
   budgets: OrganizedBudgets;
   transactions: Transaction[];
}