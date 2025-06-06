import { Account } from "capital/accounts";

import { FIRST_PARAM, query } from "@/lib/database";

/** Updatable account fields */
const ACCOUNT_UPDATES = ["name", "type", "image", "account_order", "balance", "last_updated"] as const;

/**
 * Fetches all accounts for a user
 *
 * @param {string} user_id - User identifier
 * @returns {Promise<Account[]>} User's financial accounts
 */
export async function findByUserId(user_id: string): Promise<Account[]> {
   const search = `
      SELECT account_id, name, type, image, balance, last_updated, account_order
      FROM accounts
      WHERE user_id = $1
      ORDER BY account_order ASC;
   `;

   return await query(search, [user_id]);
}

/**
 * Creates a new account
 *
 * @param {string} user_id - User identifier
 * @param {Account} account - Account details to create
 * @returns {Promise<string>} Created account ID
 */
export async function create(user_id: string, account: Account): Promise<string> {
   // Create account record
   const creation = `
      INSERT INTO accounts (user_id, name, type, image, account_order, balance, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING account_id;
   `;
   const result = await query(creation, [
      user_id,
      account.name,
      account.type,
      account.image,
      account.account_order,
      account.balance,
      account.last_updated
   ]);

   return result[0].account_id;
}

/**
 * Updates account details
 *
 * @param {string} user_id - User identifier
 * @param {string} account_id - Account identifier
 * @param {Partial<Account>} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateDetails(user_id: string, account_id: string, updates: Partial<Account>): Promise<boolean> {
   let param: number = FIRST_PARAM;
   const fields: string[] = [];
   const values: any[] = [];

   ACCOUNT_UPDATES.forEach((field: string) => {
      if (field in updates) {
         fields.push(`${field} = $${param}`);
         values.push(updates[field as keyof Account]);
         param++;
      }
   });

   // Skip if no fields to update
   if (fields.length === 0) return true;

   // Add user and account IDs
   values.push(user_id, account_id);
   param++;

   const update = `
      UPDATE accounts
      SET ${fields.join(", ")}
      WHERE user_id = $${param - 1}
      AND account_id = $${param}
      RETURNING account_id;
   `;
   const result = await query(update, values);

   return result.length > 0;
}

/**
 * Updates account ordering
 *
 * @param {string} user_id - User identifier
 * @param {Partial<Account>[]} updates - Account order updates
 * @returns {Promise<boolean>} Success status
 */
export async function updateOrdering(user_id: string, updates: Partial<Account>[]): Promise<boolean> {
   // Format bulk update for multiple accounts
   const values = updates.map((_, index) => `($${(index * 2) + 1}, $${(index * 2) + 2})`).join(", ");
   const params = updates.flatMap(update => [
      String(update.account_id),
      Number(update.account_order)
   ]);

   const update = `
      UPDATE accounts
      SET account_order = v.account_order::int
      FROM (VALUES ${values}) AS v(account_id, account_order)
      WHERE accounts.account_id = v.account_id::uuid
      AND accounts.user_id = $${params.length + 1}
      RETURNING accounts.user_id;
   `;
   const result = await query(update, [...params, user_id]);

   return result.length > 0;
}

/**
 * Deletes an account
 *
 * @param {string} user_id - User identifier
 * @param {string} account_id - Account identifier
 * @returns {Promise<boolean>} Success status
 */
export async function deleteAccount(user_id: string, account_id: string): Promise<boolean> {
   const removal = `
      DELETE FROM accounts
      WHERE user_id = $1
      AND account_id = $2
      RETURNING account_id;
   `;
   const result = await query(removal, [user_id, account_id]);

   return result.length > 0;
}