import type { Account } from "./accounts";
import type { OrganizedBudgets } from "./budgets";
import type { MarketTrends } from "./marketTrends";
import type { News } from "./news";

/**
 * The dashboard interface for the dashboard page
 *
 * @see {Account}
 * @see {OrganizedBudgets}
 * @see {MarketTrends}
 * @see {News}
 * @description
 * - The dashboard interface is used to represent the dashboard data
 */
export interface Dashboard {
   news: News;
   trends: MarketTrends;
   accounts: Account[];
   budgets: OrganizedBudgets;
}
