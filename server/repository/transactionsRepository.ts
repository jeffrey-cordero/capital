import { Transaction } from "capital/transactions";

import { FIRST_PARAM, query } from "@/lib/database";

/**
 * The fields that can be updated for a transaction
 */
const TRANSACTION_UPDATES = [
   "amount",
   "description",
   "date",
   "account_id",
   "budget_category_id"
] as const;

/**
 * Fetches all transactions for a specific user, ordered by date descending.
 *
 * @param {string} user_id - The user ID
 * @returns {Promise<Transaction[]>} The transactions
 */
export async function findByUserId(user_id: string): Promise<Transaction[]> {
   const search = `
      SELECT transaction_id, amount, description, date, budget_category_id, account_id
      FROM transactions
      WHERE user_id = $1
      ORDER BY date DESC;
   `;
   const result = await query(search, [user_id]) as Transaction[];

   return result.map((transaction) => ({ ...transaction, amount: Number(transaction.amount) }));
}

/**
 * Creates a new transaction for a specific user.
 *
 * @param {string} user_id - The user ID
 * @param {Transaction} transaction - The transaction data to insert
 * @returns {Promise<string>} The inserted transaction ID
 */
export async function create(user_id: string, transaction: Transaction): Promise<string> {
   const creation = `
      INSERT INTO transactions (user_id, amount, description, date, budget_category_id, account_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING transaction_id;
   `;
   const result = await query(creation, [
      user_id,
      transaction.amount,
      transaction.description,
      transaction.date,
      transaction.budget_category_id || null,
      transaction.account_id || null
   ]);

   return result[0].transaction_id;
}

/**
 * Updates an existing transaction for a specific user.
 *
 * @param {string} user_id - The user ID
 * @param {string} transaction_id - The transaction ID to update
 * @param {Partial<Transaction>} updates - The fields to update
 * @returns {Promise<boolean>} True if the transaction was updated, false otherwise
 */
export async function update(user_id: string, transaction_id: string, updates: Partial<Transaction>): Promise<boolean> {
   // Build dynamic update query based on provided fields
   let param: number = FIRST_PARAM;
   const fields: string[] = [];
   const values: any[] = [];

   // Only include valid, updatable fields that are present in the updates
   TRANSACTION_UPDATES.forEach((field) => {
      const key = field as keyof typeof updates;

      if (key in updates && updates[key] !== undefined) {
         fields.push(`${field} = $${param}`);

         // Normalize optional foreign keys
         if (key === "budget_category_id" || key === "account_id") {
            values.push(updates[key] === "" ? null : updates[key]);
         } else {
            values.push(updates[key]);
         }

         param++;
      }
   });

   // Skip query if no valid fields to update were provided
   if (fields.length === 0) return true;

   // Append transaction ID and user ID to values array and increment the param index
   values.push(transaction_id, user_id);
   param++;

   const update = `
      UPDATE transactions
      SET ${fields.join(", ")}
      WHERE transaction_id = $${param - 1}
      AND user_id = $${param}
      RETURNING transaction_id;
   `;
   const result = await query(update, values);

   return result.length > 0;
}

/**
 * Deletes a list of transactions for a specific user.
 *
 * @param {string} user_id - The user ID
 * @param {string[]} transactionIds - The transaction IDs to delete
 * @returns {Promise<boolean>} True if any transactions were deleted, false otherwise
 */
export async function deleteTransactions(user_id: string, transactionIds: string[]): Promise<boolean> {
   const removal = `
      DELETE FROM transactions
      WHERE user_id = $1
      AND transaction_id = ANY($2)
      RETURNING transaction_id;
   `;
   const result = await query(removal, [user_id, transactionIds]);

   return result.length > 0;
}