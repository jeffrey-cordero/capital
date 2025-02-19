import { Account } from "capital-types/accounts";

import { insertQuery, query } from "@/lib/database/client";

export async function getAccounts(user_id: string): Promise<Account[] | null> {
   const search = `
      SELECT a.*, ah.*
      FROM accounts as a
      INNER JOIN accounts_history as ah
      ON a.account_id = ah.account_id
      WHERE user_id = ?;
   `;

   return await query(search, [user_id]) as Account[];
}

export async function createAccount(user_id: string, account: Account): Promise<Account | null> {
   // user_id fetched from session
   const insert = `
      INSERT INTO accounts (user_id, name, type, image, history, account_order)
      VALUES (?, ?, ?, ?, ?, ?);
   `;

   const result = await insertQuery("accounts", "account_id", insert, 
      [user_id, account.name, account.type, account.image, JSON.stringify(account.history), account.account_order]
   ) as any[];

   const balance = `
      INSERT INTO accounts_history (account_id, balance, date)
      VALUES (?, ?, ?);
   `
   await insertQuery("accounts_history", "account_id", balance, [result[0].account_id, 0, new Date()]);

   return result?.[0] as Account;
}