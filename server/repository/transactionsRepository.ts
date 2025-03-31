import { Transaction } from "capital/transactions";

import { FIRST_PARAM, query } from "@/lib/database";

/**
 * The fields that can be updated for a transaction
 */
const TRANSACTION_UPDATES = [
   "title",
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
      SELECT t.*
      FROM transactions t
      WHERE t.user_id = $1
      ORDER BY t.date DESC;
   `;

   const result = await query(search, [user_id]) as Transaction[];

   return result.map(transaction => ({
      ...transaction,
      amount: Number(transaction.amount)
   }));
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
      INSERT INTO transactions (user_id, title, amount, description, date, budget_category_id, account_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING transaction_id;
   `;
   const result = await query(creation, [
      user_id,
      transaction.title,
      transaction.amount,
      transaction.description,
      transaction.date,
      transaction.budget_category_id || null,
      transaction.account_id || null
   ]) as { transaction_id: string }[];

   return result[0].transaction_id;
}

/**
 * Updates an existing transaction for a specific user.
 *
 * @param {string} user_id - The user ID (for authorization)
 * @param {string} transaction_id - The transaction ID to update
 * @param {Partial<Transaction>} updates - The fields to update
 * @returns {Promise<boolean>} True if the transaction was updated, false otherwise
 */
export async function update(user_id: string, transaction_id: string, updates: Partial<Transaction>): Promise<boolean> {
   const fields: string[] = [];
   const values: any[] = [];
   let params = FIRST_PARAM;

   // Only include valid, updatable fields that are present in the updates
   TRANSACTION_UPDATES.forEach((field) => {
      const key = field as keyof typeof updates;

      if (key in updates && updates[key] !== undefined) {
         fields.push(`${field} = $${params}`);

         if (typeof updates[key] === "string" && (key === "title" || key === "description")) {
            // Normalize strings
            values.push(String(updates[key]));
         } else if ((key === "budget_category_id" || key === "account_id") && updates[key] === "") {
            // Handle optional foreign keys
            values.push(null);
         } else {
            // Handle other types
            values.push(updates[key]);
         }

         params++;
      }
   });

   // Skip query if no valid fields to update were provided
   if (fields.length === 0) return true;

   // Append transaction_id and user_id to values and increment the params index
   values.push(transaction_id);
   params++;
   values.push(user_id);

   const updateQuery = `
      UPDATE transactions
      SET ${fields.join(", ")}
      WHERE transaction_id = $${params - 1}
      AND user_id = $${params}
      RETURNING transaction_id;
   `;
   console.log(updateQuery);

   const result = await query(updateQuery, values) as { transaction_id: string }[];

   return result.length > 0;
}

/**
 * Deletes a transaction for a specific user.
 *
 * @param {string} user_id - The user ID (for authorization)
 * @param {string} transaction_id - The transaction ID to delete
 * @returns {Promise<boolean>} True if the transaction was deleted, false otherwise
 */
export async function deleteTransaction(user_id: string, transaction_id: string): Promise<boolean> {
   const removal = `
      DELETE FROM transactions
      WHERE user_id = $1
      AND transaction_id = $2
      RETURNING transaction_id;
   `;
   const result = await query(removal, [user_id, transaction_id]) as { transaction_id: string }[];

   return result.length > 0;
}