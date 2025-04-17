import type { Account } from "./accounts";
import type { OrganizedBudgets } from "./budgets";
import type { Economy } from "./economy";
import type { Transaction } from "./transactions";
import type { UserDetails } from "./user";

/**
 * Represents complete dashboard data model containing all elements needed for the main view, which
 * integrates accounts, budgets, transactions, economy data, and user settings.
 *
 * @see {@link Economy} - The economy data model.
 * @see {@link Account} - The accounts data model.
 * @see {@link UserDetails} - The user settings data model.
 * @see {@link OrganizedBudgets} - The budgets data model.
 * @see {@link Transaction} - The transactions data model.
 */
export interface Dashboard {
   economy: Economy;
   accounts: Account[];
   settings: UserDetails;
   budgets: OrganizedBudgets;
   transactions: Transaction[];
}