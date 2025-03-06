import { Account, AccountHistory } from "capital/accounts";
import { PoolClient } from "pg";

import { query, transaction  } from "@/lib/database";

export async function findByUserId(user_id: string): Promise<Account[]> {
   const search = `
      SELECT a.*, ah.*
      FROM accounts as a
      INNER JOIN accounts_history as ah
      ON a.account_id = ah.account_id
      WHERE a.user_id = $1
      ORDER BY a.account_order ASC, ah.last_updated DESC;
   `;
   const result: (Account & AccountHistory)[] = await query(search, [user_id]);

   // Group account's by their ID's, formatting their respective history array
   const positions: { [key: string]: number } = {};

   return result.reduce((acc: Account[], record: Account & AccountHistory) => {
      const existing = positions[record.account_id as string];

      if (record.account_id in positions) {
         acc[existing].history.push({
            balance: record.balance,
            last_updated: record.last_updated
         });
      } else {
         positions[record.account_id as string] = acc.length;

         acc.push({
            account_id: record.account_id,
            name: record.name,
            type: record.type,
            image: record.image,
            balance: record.balance,
            account_order: record.account_order,
            history: [{
               balance: record.balance,
               last_updated: record.last_updated
            }]
         });
      }

      return acc;
   }, []);
}

export async function create(user_id: string, account: Account): Promise<string> {
   return await transaction(async(client: PoolClient) => {
      // Create the account
      const creation = `
         INSERT INTO accounts (user_id, name, type, image, account_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING account_id;
      `;
      const result: { account_id: string }[] = (await client.query(
         creation, [user_id, account.name, account.type, account.image, account.account_order]
      ))?.rows;

      // Insert the initial account history record
      const history = `
         INSERT INTO accounts_history (account_id, balance, last_updated)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING last_updated;
      `;
      await client.query(history, [result[0].account_id, account.balance]);

      return result[0].account_id;
   }) as string;
}

export async function updateDetails(
   user_id: string,
   account_id: string,
   updates: Partial<Account & AccountHistory>
): Promise<boolean> {
   const fields: string[] = [];
   const values: any[] = [];
   let params = 1;

   ["name", "type", "image", "account_order"].forEach((field: string) => {
      if (field in updates) {
         fields.push(`${field} = $${params}`);
         values.push(updates[field as keyof (Account & AccountHistory)]);
         params++;
      }
   });

   // Handle updating the most-recent balance
   if (updates.balance) {
      await updateHistory(user_id, account_id, updates.balance, new Date());
   }

   // Update the provided account details
   if (fields.length > 0) {
      values.push(user_id, account_id);

      const updateQuery = `
         UPDATE accounts
         SET ${fields.join(", ")}
         WHERE user_id = $${params}
         AND account_id = $${params + 1}
         RETURNING account_id;
      `;

      return (await query(updateQuery, values) as Account[]).length > 0;
   }

   return true;
}

export async function updateHistory(
   user_id: string,
   account_id: string,
   balance: number,
   last_updated: Date = new Date()
): Promise<boolean> {
   const updateHistory = `
      WITH existing_account AS (
         SELECT 1
         FROM accounts
         WHERE user_id = $1 
         AND account_id = $2
      )
      INSERT INTO accounts_history (account_id, balance, last_updated)
      SELECT $2, $3, $4
      FROM existing_account
      WHERE EXISTS (SELECT 1 FROM existing_account)
      ON CONFLICT (account_id, last_updated)
      DO UPDATE SET
         balance = EXCLUDED.balance
      RETURNING account_id;
   `;
   const result = await query(
      updateHistory, [user_id, account_id, balance, last_updated]
   ) as { account_id: string }[];

   return result.length > 0;
}

export async function removeHistory(
   user_id: string,
   account_id: string,
   last_updated: Date
): Promise<"conflict" | "success" | "missing">  {
   return await transaction(async(client: PoolClient) => {
      // Fetch all the existing account records
      const records = `
         SELECT COUNT(*)
         FROM accounts AS a
         INNER JOIN accounts_history as ah
         ON a.account_id = ah.account_id
         WHERE a.user_id = $1
         AND a.account_id = $2;
      `;
      const total: { count: number }[] = (
         await client.query(records, [user_id, account_id])
      ).rows;

      if (total[0].count <= 1) {
         return "conflict";
      } else {
         const removal = `
            DELETE FROM accounts_history
            WHERE account_id = $1
            AND last_updated = $2
            RETURNING account_id;
         `;

         const removals: { account_id: string }[] = (
            await client.query(removal, [account_id, last_updated])
         ).rows;

         if (removals.length === 1) {
            // Matching history record removed
            return "success";
         } else {
            // No matching history record
            return "missing";
         }
      }
   }, "SERIALIZABLE") as "conflict" | "success" | "missing";
}

export async function updateOrdering(user_id: string, updates: Partial<Account>[]): Promise<boolean> {
   // Update account ordering in a single query
   const values = updates.map((_, index) => `($${(index * 2) + 1}, $${(index * 2) + 2})`).join(", ");
   const params = updates.flatMap(update => [String(update.account_id), Number(update.account_order)]);

   const update = `
      UPDATE accounts
      SET account_order = v.account_order::int
      FROM (VALUES ${values}) AS v(account_id, account_order)
      WHERE accounts.account_id = v.account_id::uuid
      AND accounts.user_id = $${params.length + 1}
      RETURNING accounts.user_id;
   `;
   const result: { account_id: string }[] = await query(update, [...params, user_id]);

   return result.length > 0;
}

export async function deleteAccount(user_id: string, account_id: string): Promise<boolean> {
   return await transaction(async(client: PoolClient) => {
      // Disable the account history record removal trigger
      const disableTrigger = `
         ALTER TABLE accounts_history 
         DISABLE TRIGGER prevent_last_history_record_delete_trigger;
      `;
      await client.query(disableTrigger);

      // Remove the account with the respective history records through cascading
      const removal = `
         DELETE FROM accounts
         WHERE user_id = $1 
         AND account_id = $2
         RETURNING account_id;
      `;
      const result: { account_id: string }[] = (
         await client.query(removal, [user_id, account_id])
      ).rows;

      // Enable the account history record removal trigger
      const enableTrigger = `
         ALTER TABLE accounts_history 
         ENABLE TRIGGER prevent_last_history_record_delete_trigger;
      `;
      await client.query(enableTrigger);

      return result.length > 0;
   }, "SERIALIZABLE") as boolean;
}