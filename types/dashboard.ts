import type { Account } from "./accounts";
import type { OrganizedBudgets } from "./budgets";
import type { Economy } from "./economy";
import type { Transaction } from "./transactions";
import type { UserDetails } from "./user";

/**
 * Dashboard data model that integrates all core user and economic components
 *
 * @see {@link Economy} - Economy data model
 * @see {@link Account} - Accounts data model
 * @see {@link UserDetails} - User settings data model
 * @see {@link OrganizedBudgets} - Budgets data model
 * @see {@link Transaction} - Transactions data model
 */
export interface Dashboard {
   economy: Economy;
   accounts: Account[];
   settings: UserDetails;
   budgets: OrganizedBudgets;
   transactions: Transaction[];
}