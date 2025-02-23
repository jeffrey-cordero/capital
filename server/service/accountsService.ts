import { Account, AccountHistory, accountSchema } from "capital-types/accounts";
import { ServerResponse } from "capital-types/server";

import { redisClient } from "@/app";
import { findByUserId } from "@/repository/accountsRepository";

export async function fetchAccounts(user_id: string): Promise<ServerResponse> {
   // Validate account fields
   const cache = await redisClient.get(`accounts:${user_id}`);

   if (cache) {
      return {
         status: 200,
         message: "Cached accounts",
         data: JSON.parse(cache)
      };
   } else {
      // Fetch accounts from the database repository
      const result = await findByUserId(user_id);

      // Cache the result for 5 minutes
      await redisClient.setex(`accounts:${user_id}`, 5 * 60, JSON.stringify(result));

      return {
         status: 200,
         message: "Fetched accounts",
         data: result
      };
   }
}

export async function createAccount(user_id: string, account: Account): Promise<ServerResponse> {
   // Validate account fields
   const fields = accountSchema.safeParse(account);

   // TODO: Will need to clear redis cache for accounts on successful creation

   return {
      status: 200,
      message: "Awaiting implementation",
      data: {}
   };
}

export async function updateAccount(type: "details" | "history", user_id: string, account: Partial<Account & AccountHistory>): Promise<ServerResponse> {
   // Validate account fields
   const fields = accountSchema.safeParse(account);

   // TODO: Will need to clear redis cache for accounts on successful updates

   return {
      status: 200,
      message: "Awaiting implementation",
      data: {}
   };
}

export async function updateAccountsOrdering(user_id: string, accounts: Partial<Account>[]): Promise<ServerResponse> {
   // TODO: Will need to clear redis cache for accounts on successful updates

   return {
      status: 200,
      message: "Awaiting implementation",
      data: {}
   };
}

export async function deleteAccount(user_id: string, account_id: string): Promise<ServerResponse> {
   // TODO: Will need to clear redis cache for accounts on successful deletion

   return {
      status: 200,
      message: "Awaiting implementation",
      data: {}
   };
}