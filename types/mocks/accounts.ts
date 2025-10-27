import type { Account } from "../accounts";

/**
 * Default balances for different account types
 */
const DEFAULT_BALANCES: Record<string, number> = {
   "Checking": 1000.00,
   "Savings": 5000.00,
   "Credit Card": -500.00,
   "Debt": -2000.00,
   "Retirement": 25000.00,
   "Investment": 15000.00,
   "Loan": -10000.00,
   "Property": 200000.00,
   "Other": 1000.00
};

/**
 * Creates a mock account with the specified type
 *
 * @param {string} type - Account type
 * @param {Partial<Account>} overrides - Properties to override
 * @returns {Partial<Account>} Mock account data
 */
export const createMockAccount = (type: string, overrides: Partial<Account> = {}): Partial<Account> => ({
   name: `${type}-${Date.now()}`,
   type: type as any,
   balance: DEFAULT_BALANCES[type] || 0.00,
   last_updated: new Date().toISOString(),
   ...overrides
});