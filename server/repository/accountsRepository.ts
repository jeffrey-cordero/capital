import { Account, AccountHistory } from "capital-types/accounts";
import { PoolClient } from "pg";

import { pool, query  } from "@/lib/database/client";

export async function findByUserId(user_id: string): Promise<Account[]> {
   const search = `
      SELECT a.*, ah.*
      FROM accounts as a
      INNER JOIN accounts_history as ah
      ON a.account_id = ah.account_id
      WHERE a.user_id = $1
      ORDER BY a.account_order ASC, ah.last_updated DESC;
   `;

   const positions: { [key: string]: number } = {};
   const accounts = await query(search, [user_id]) as (Account & AccountHistory)[];

   // Group by account's and collect their history of balances,
   return accounts.reduce((acc: Account[], row: Account & AccountHistory) => {
      // Assume accounts are ordered by `account_order` DESC then `last_updated` ASC
      const existing = positions[row.account_id as string];

      if (row.account_id as string in positions) {
         acc[existing].history?.push({
            balance: row.balance,
            last_updated: row.last_updated
         });
      } else {
         positions[row.account_id as string] = acc.length;

         acc.push({
            account_id: row.account_id,
            name: row.name,
            type: row.type,
            image: row.image,
            balance: row.balance,
            account_order: row.account_order,
            history: [{
               balance: row.balance,
               last_updated: row.last_updated
            }]
         });
      }

      return acc;
   }, []);
}

export async function create(user_id: string, account: Account): Promise<Account> {
   const client: PoolClient | null = await pool.connect();

   try {
      // Transactional insertion queries to create account and its history for data integrity
      await client.query("BEGIN");

      // Create the account
      const creation = `
         INSERT INTO accounts (user_id, name, type, image)
         VALUES ($1, $2, $3, $4)
         RETURNING account_id;
      `;
      const result = (
         await client.query(creation, [user_id, account.name, account.type, account.image])
      )?.rows as { account_id: string }[];

      // Initialize the account's history
      const history = `
         INSERT INTO accounts_history (account_id, balance, last_updated)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING last_updated;
      `;
      const insertion = (
         await client.query(history, [result[0].account_id, account.balance])
      )?.rows as { last_updated: string }[];

      await client.query("COMMIT");

      return {
         account_id: result[0].account_id,
         name: account.name,
         type: account.type,
         image: account.image,
         balance: account.balance,
         account_order: account.account_order,
         history: [{
            balance: account.balance,
            last_updated: new Date(insertion[0].last_updated)
         }]
      };
   } catch (error) {
      console.error(error);
      await client?.query("ROLLBACK");

      throw error;
   } finally {
      client?.release();
   }
}

export async function updateDetails(account_id: string, updates: Partial<Account & AccountHistory>): Promise<boolean> {
   // Update only the provided fields
   const fields: string[] = [];
   const values: any[] = [];
   let params = 1;

   if (updates.name) {
      fields.push(`name = $${params}`);
      values.push(updates.name);
      params++;
   }

   if (updates.type) {
      fields.push(`type = $${params}`);
      values.push(updates.type);
      params++;
   }

   if (updates.image) {
      fields.push(`image = $${params}`);
      values.push(updates.image);
      params++;
   }

   if (updates.account_order) {
      fields.push(`account_order = $${params}`);
      values.push(updates.account_order);
      params++;
   }

   // Handle updating most-recent balance
   if (updates.balance) {
      await updateHistory(account_id, updates.balance, new Date());
   }

   values.push(account_id);

   const updateQuery = `
      UPDATE accounts
      SET ${fields.join(", ")}
      WHERE account_id = $${params}
      RETURNING account_id;
   `;

   return (await query(updateQuery, values) as Account[]).length > 0;
}

export async function updateHistory(account_id: string, balance: number, last_updated: Date = new Date()): Promise<boolean> {
   const updateHistory = `
      INSERT INTO accounts_history (account_id, balance, last_updated)
      VALUES ($1, $2, $3)
      ON CONFLICT (account_id, year, month) 
      DO UPDATE SET
         balance = EXCLUDED.balance,
         last_updated = EXCLUDED.last_updated
      RETURNING account_id;
   `;

   return (await query(updateHistory, [account_id, balance, last_updated]) as any[])?.length > 0;
}

export async function updateOrdering(user_id: string, updates: Partial<Account>[]): Promise<boolean> {
   // Flatten array of parameters
   const values = updates.map((_, index) => `($${(index * 2) + 1}, $${(index * 2) + 2})`).join(", ");
   const params = updates.flatMap(update => [String(update.account_id), Number(update.account_order)]);

   // Update account orders in a single query
   const update = `
      UPDATE accounts
      SET account_order = v.account_order::int
      FROM (VALUES ${values}) AS v(account_id, account_order)
      WHERE accounts.account_id = v.account_id::uuid
      AND accounts.user_id = $${params.length + 1}
      RETURNING accounts.user_id;
   `;

   return (await query(update, [...params, user_id]) as any[]).length > 0;
}

export async function deleteAccount(user_id: string, account_id: string): Promise<boolean> {
   const deleteQuery = `
      DELETE FROM accounts
      WHERE account_id = $1 AND user_id = $2
      RETURNING account_id;
   `;
   return (await query(deleteQuery, [account_id, user_id]) as any[]).length > 0;
}