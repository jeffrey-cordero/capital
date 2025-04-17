import type { Account } from "./accounts";
import type { OrganizedBudgets } from "./budgets";
import type { Economy } from "./economy";
import type { Transaction } from "./transactions";
import type { UserDetails } from "./user";

/**
 * Represents the dashboard interface for the dashboard page
 */
export interface Dashboard {
   economy: Economy;
   accounts: Account[];
   budgets: OrganizedBudgets;
   transactions: Transaction[];
   settings: UserDetails;
}