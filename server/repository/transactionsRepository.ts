import { Transaction } from "capital/transactions";

import { FIRST_PARAM, query } from "@/lib/database";

/**
 * Updatable transaction fields
 */
const TRANSACTION_UPDATES = [
   "amount",
   "description",
   "date",
   "account_id",
   "budget_category_id"
] as const;

/**
 * Fetches user transactions
 *
 * @param {string} user_id - User identifier
 * @returns {Promise<Transaction[]>} User's transactions
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
 * Creates a new transaction
 *
 * @param {string} user_id - User identifier
 * @param {Transaction} transaction - Transaction details
 * @returns {Promise<string>} Created transaction ID
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
 * Updates a transaction
 *
 * @param {string} user_id - User identifier
 * @param {string} transaction_id - Transaction identifier
 * @param {Partial<Transaction>} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function update(user_id: string, transaction_id: string, updates: Partial<Transaction>): Promise<boolean> {
   // Build dynamic update query
   let param: number = FIRST_PARAM;
   const fields: string[] = [];
   const values: any[] = [];

   // Include only valid fields present in updates
   TRANSACTION_UPDATES.forEach((field) => {
      const key = field as keyof typeof updates;

      if (key in updates && updates[key] !== undefined) {
         fields.push(`${field} = $${param}`);

         // Handle optional foreign keys
         if (key === "budget_category_id" || key === "account_id") {
            values.push(updates[key] === "" ? null : updates[key]);
         } else {
            values.push(updates[key]);
         }

         param++;
      }
   });

   // Skip if no fields to update
   if (fields.length === 0) return true;

   // Add transaction and user IDs
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
 * Deletes transactions
 *
 * @param {string} user_id - User identifier
 * @param {string[]} transactionIds - Transaction identifiers to delete
 * @returns {Promise<boolean>} Success status
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