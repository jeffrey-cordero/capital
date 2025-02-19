import { Account } from "capital-types/accounts";

import { query } from "@/lib/database/client";

export async function getAccounts(user_id: string) {
   const search = `
      SELECT * FROM accounts 
      WHERE user_id = ?;
   `;

   return await query(search, [user_id]) as Account[];
}

export async function createAccount(user_id: string, account: Account) {
   // user_id fetched from session
   const insert = `
      INSERT INTO accounts (user_id, name, type, image, history, account_order)
      VALUES (?, ?, ?, ?, ?, ?);
   `;

   return await query(insert, [user_id, account.name, account.type, account.image, JSON.stringify(account.history), account.account_order]);
}