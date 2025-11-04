import type { Account } from "../accounts";

/**
 * Valid account test data template
 */
export const VALID_ACCOUNT: Omit<Account, "account_id"> = {
   name: "Test Account",
   balance: 1000.00,
   last_updated: new Date().toISOString(),
   type: "Checking",
   account_order: 0
};

/**
 * Creates a valid account object for testing
 *
 * @param {Partial<Account>} [overrides] - Optional properties to override
 * @returns {Account} Valid account object
 */
export const createValidAccount = (overrides?: Partial<Account>): Account => {
   return {
      ...VALID_ACCOUNT,
      ...overrides
   };
};

/**
 * Creates an array of mock accounts for testing
 *
 * @param {number} [count] - Number of accounts to create (default `2`)
 * @returns {Account[]} Array of account objects
 */
export const createMockAccounts = (count: number = 2): Account[] => {
   const accounts: Account[] = [];
   const accountTypes: Account["type"][] = ["Checking", "Savings", "Credit Card", "Investment"];

   for (let i = 0; i < count; i++) {
      accounts.push({
         // Mock UUIDs to simplify testing
         account_id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
         name: `Account ${i + 1}`,
         balance: (i + 1) * 1000.00,
         last_updated: new Date().toISOString(),
         type: accountTypes[i % accountTypes.length],
         account_order: i,
         // Set a default image value for a single account to simplify testing
         image: i === 0 ? "checking" : null
      });
   }

   return accounts;
};

