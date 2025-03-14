import { Account, AccountHistory } from "capital/accounts";
import { PoolClient } from "pg";

import { FIRST_PARAM, query, transaction } from "@/lib/database";

export async function findByUserId(user_id: string): Promise<Account[]> {
   // Fetch accounts with their history records in a single efficient query
   const search = `
      SELECT a.*, ah.*
      FROM accounts as a
      INNER JOIN accounts_history as ah
      ON a.account_id = ah.account_id
      WHERE a.user_id = $1
      ORDER BY a.account_order ASC, ah.last_updated DESC;
   `;
   const result: (Account & AccountHistory)[] = await query(search, [user_id]);

   // Track positions to efficiently build account objects with history
   const positions: Record<string, number> = {};

   // Process query results into structured account objects with history arrays
   return result.reduce((acc: Account[], record: Account & AccountHistory) => {
      const account_id = record.account_id as string;
      const existing = positions[account_id];

      // Add history to existing account or create new account entry
      if (account_id in positions) {
         // Add history record to existing account
         acc[existing].history.push({
            balance: record.balance,
            last_updated: record.last_updated
         });
      } else {
         // Track position of new account in result array
         positions[account_id] = acc.length;

         // Create new account with initial history entry
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
      // Create account record with basic details
      const creation = `
         INSERT INTO accounts (user_id, name, type, image, account_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING account_id;
      `;
      const result = await client.query<{ account_id: string }>(
         creation,
         [user_id, account.name.trim(), account.type, account.image, account.account_order]
      );
      const account_id = result.rows[0].account_id;

      // Create initial history record with starting balance
      const history = `
         INSERT INTO accounts_history (account_id, balance, last_updated)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING last_updated;
      `;
      await client.query(history, [account_id, account.balance]);

      return account_id;
   }) as string;
}

export async function updateDetails(
   account_id: string,
   updates: Partial<Account & AccountHistory>
): Promise<boolean> {
   // Build dynamic update query based on provided fields
   const fields: string[] = [];
   const values: any[] = [];
   let params = FIRST_PARAM;

   // Only include fields that are present in the updates
   ["name", "type", "image", "account_order"].forEach((field: string) => {
      if (field in updates) {
         fields.push(`${field} = $${params}`);
         values.push(updates[field as keyof (Account & AccountHistory)]);
         params++;

         // Trim string fields (except account_order which is numeric)
         if (field !== "account_order") {
            values[values.length - 1] = String(values[values.length - 1])?.trim();
         }
      }
   });

   // Handle balance updates through the history table if provided
   if (updates.balance !== undefined) {
      await updateHistory(account_id, updates.balance, new Date());
   }

   // Skip query if no fields to update
   if (fields.length === 0) return true;

   // Add account ID for WHERE clause
   values.push(account_id);

   const updateQuery = `
      UPDATE accounts
      SET ${fields.join(", ")}
      WHERE account_id = $${params}
      RETURNING account_id;
   `;

   const result = await query(updateQuery, values) as Account[];

   return result.length > 0;
}

export async function updateHistory(
   account_id: string,
   balance: number,
   last_updated: Date = new Date()
): Promise<boolean> {
   // Insert or update history record with UPSERT pattern
   const updateHistory = `
      INSERT INTO accounts_history (account_id, balance, last_updated)
      VALUES ($1, $2, $3)
      ON CONFLICT (account_id, last_updated)
      DO UPDATE SET balance = EXCLUDED.balance
      RETURNING account_id;
   `;

   const result = await query(
      updateHistory,
      [account_id, balance, last_updated]
   ) as { account_id: string }[];

   return result.length > 0;
}

export async function removeHistory(
   account_id: string,
   last_updated: Date
): Promise<"conflict" | "success" | "missing"> {
   return await transaction(async(client: PoolClient) => {
      // Prevent removal if it's the last history record (data integrity)
      const records = `
         SELECT COUNT(*)
         FROM accounts_history
         WHERE account_id = $1;
      `;
      const result = await client.query<{ count: number }>(records, [account_id]);

      if (!result.rows.length || result.rows[0].count <= 1) {
         return "conflict";
      }

      // Remove specific history record
      const removal = `
         DELETE FROM accounts_history
         WHERE account_id = $1
         AND last_updated = $2
         RETURNING account_id;
      `;

      const removals = await client.query<{ account_id: string }>(
         removal,
         [account_id, last_updated]
      );

      return removals.rows.length === 1 ? "success" : "missing";
   }, "SERIALIZABLE") as "conflict" | "success" | "missing";
}

export async function updateOrdering(user_id: string, updates: Partial<Account>[]): Promise<boolean> {
   // Bulk update account ordering in a single efficient query
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

   const result = await query(update, [...params, user_id]) as { account_id: string }[];

   return result.length > 0;
}

export async function deleteAccount(user_id: string, account_id: string): Promise<boolean> {
   return await transaction(async(client: PoolClient) => {
      // Temporarily disable trigger to allow cascade delete
      await client.query(
         "ALTER TABLE accounts_history DISABLE TRIGGER prevent_last_history_record_delete_trigger;"
      );

      // Remove account and associated history through CASCADE
      const removal = `
         DELETE FROM accounts
         WHERE user_id = $1 
         AND account_id = $2
         RETURNING account_id;
      `;
      const result = await client.query<{ account_id: string }>(removal, [user_id, account_id]);

      // Re-enable trigger
      await client.query(
         "ALTER TABLE accounts_history ENABLE TRIGGER prevent_last_history_record_delete_trigger;"
      );

      return result.rows.length > 0;
   }, "SERIALIZABLE") as boolean;
}