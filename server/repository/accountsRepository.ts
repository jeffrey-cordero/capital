import { Account } from "capital-types/accounts";

import { query } from "@/lib/database/client";

export async function getAccounts(user_id: string): Promise<Account[] | null> {
   const search = `
      SELECT a.*, ah.*
      FROM accounts as a
      INNER JOIN accounts_history as ah
      ON a.account_id = ah.account_id
      WHERE a.user_id = $1;
   `;

   return await query(search, [user_id]) as Account[];
}

export async function createAccount(user_id: string, account: Account): Promise<Account | null> {
   // user_id fetched from session
   // TODO: use $1
   // const insert = `
   //    INSERT INTO accounts (user_id, name, type, image, account_order)
   //    VALUES (?, ?, ?, ?, ?, ?)
   //    RETURNING account_id;
   // `;

   // const result = await ("insert,
   //    [user_id, account.name, account.type, account.image, JSON.stringify(account.history), account.account_order]
   // ) as any[];

   const balance = `
      INSERT INTO accounts_history (account_id, balance, date)
      VALUES ($1, $2, $3);
   `;

   // return result?.[0] as Account;
   return null;
}