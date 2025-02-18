import { Account } from "capital-types/accounts";

import { runQuery } from "@/lib/database/client";

export async function getAccounts(user_id: string) {
   const search = `
      SELECT * FROM accounts 
      WHERE user_id = ?;
   `;

   return await runQuery(search, [user_id]) as Account[];
}