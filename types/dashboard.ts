import type { Account } from "./accounts";
import type { OrganizedBudgets } from "./budgets";
import type { Economy } from "./economy";
import type { Transaction } from "./transactions";
import type { UserDetails } from "./user";

/**
 * Complete dashboard data model containing all elements needed for the main view,
 * integrating accounts, budgets, transactions, economy data, and user settings.
 *
 * @see {@link economy} - The economy data model.
 * @see {@link accounts} - The accounts data model.
 * @see {@link settings} - The user settings data model.
 * @see {@link budgets} - The budgets data model.
 * @see {@link transactions} - The transactions data model.
 */
export interface Dashboard {
   economy: Economy;
   accounts: Account[];
   settings: UserDetails;
   budgets: OrganizedBudgets;
   transactions: Transaction[];
}