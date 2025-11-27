import type { Transaction } from "../transactions";

/**
 * Test transaction ID for unit tests
 */
export const TEST_TRANSACTION_ID: string = "550e8400-e29b-41d4-a716-446655440020";

/**
 * Test transaction IDs array for unit tests
 */
export const TEST_TRANSACTION_IDS: string[] = [
   "550e8400-e29b-41d4-a716-446655440021",
   "550e8400-e29b-41d4-a716-446655440022",
   "550e8400-e29b-41d4-a716-446655440023"
];

/**
 * Valid transaction test data template
 */
export const VALID_TRANSACTION: Omit<Transaction, "transaction_id"> = {
   amount: 100.00,
   description: "Test Transaction",
   type: "Income",
   date: new Date().toISOString(),
   budget_category_id: null,
   account_id: null
};

/**
 * Creates a valid transaction object for testing
 *
 * @param {Partial<Transaction>} [overrides] - Optional properties to override
 * @returns {Transaction} Valid transaction object
 */
export const createValidTransaction = (overrides?: Partial<Transaction>): Transaction => {
   return { ...VALID_TRANSACTION, ...overrides };
};

/**
 * Creates an array of mock transactions for testing
 *
 * @param {number} [count] - Number of transactions to create (default `2`)
 * @returns {Transaction[]} Array of transaction objects
 */
export const createMockTransactions = (count: number = 2): Transaction[] => {
   const transactions: Transaction[] = [];
   const types: Transaction["type"][] = ["Income", "Expenses"];

   for (let i = 0; i < count; i++) {
      transactions.push({
         // Mock UUIDs to simplify testing
         transaction_id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
         amount: (i + 1) * 100.00,
         description: `Transaction ${i + 1}`,
         type: types[i % types.length],
         date: new Date().toISOString(),
         budget_category_id: i % 3 === 0 ? null : `00000000-0000-0000-0001-${String(i + 1).padStart(12, "0")}`,
         account_id: i % 2 === 0 ? null : `00000000-0000-0000-0002-${String(i + 1).padStart(12, "0")}`
      });
   }

   return transactions;
};