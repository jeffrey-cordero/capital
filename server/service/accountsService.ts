import { Account, AccountHistory, accountHistorySchema, accountSchema } from "capital-types/accounts";
import { ServerResponse } from "capital-types/server";

import { redisClient } from "@/app";
import {  create,  deleteAccount as removeAccount, findByUserId, updateDetails, updateHistory as updateAccountHistory, updateOrdering } from "@/repository/accountsRepository";

export async function fetchAccounts(user_id: string): Promise<ServerResponse> {
   // Validate account fields
   const cache = await redisClient.get(`accounts:${user_id}`);

   if (cache) {
      return {
         status: 200,
         message: "Accounts",
         data: JSON.parse(cache)
      };
   } else {
      // Fetch accounts from the database repository
      const result = await findByUserId(user_id);

      // Cache the result for 5 minutes
      await redisClient.setex(`accounts:${user_id}`, 5 * 60, JSON.stringify(result));

      return {
         status: 200,
         message: "Accounts",
         data: result
      };
   }
}

export async function createAccount(user_id: string, account: Account): Promise<ServerResponse> {
   // Validate account fields
   const fields = accountSchema.safeParse(account);

   if (!fields.success) {
      const errors = fields.error.flatten().fieldErrors;

      return {
         status: 400,
         message: "Invalid account fields",
         errors: Object.fromEntries(
            Object.entries(errors as Record<string, string[]>).map(([field, errors]) => [
               field,
               errors?.[0] || "Unknown error"
            ])
         )
      };
   }

   const creation = await create(user_id, account);
   await redisClient.del(`accounts:${user_id}`);

   return {
      status: 200,
      message: "Account created",
      data: { account_id: creation.account_id }
   };
}

export async function updateAccount(type: "details" | "history", user_id: string, account: Partial<Account & AccountHistory>): Promise<ServerResponse> {
   // Validate account fields
   const fields = accountSchema.partial().safeParse(account);

   if (!fields.success) {
      const errors = fields.error.flatten().fieldErrors;

      return {
         status: 400,
         message: "Invalid account fields",
         errors: Object.fromEntries(
            Object.entries(errors as Record<string, string[]>).map(([field, errors]) => [
               field,
               errors?.[0] || "Unknown error"
            ])
         )
      };
   }

   if (!account.account_id) {
      return {
         status: 400,
         message: "Account ID is required",
         errors: { account_id: "Missing account ID" }
      };
   }

   if (type === "details") {
      await updateDetails(account.account_id, account);
   } else {
      if (!account.balance) {
         return {
            status: 400,
            message: "Balance is required for updating account history",
            errors: { balance: "Missing balance" }
         };
      }

      const fields = accountHistorySchema.safeParse(account as AccountHistory);

      if (!fields.success) {
         const errors = fields.error.flatten().fieldErrors;

         return {
            status: 400,
            message: "Invalid account history fields",
            errors: Object.fromEntries(
               Object.entries(errors as Record<string, string[]>).map(([field, errors]) => [
                  field,
                  errors?.[0] || "Unknown error"
               ])
            )
         };
      }

      await updateAccountHistory(account.account_id, account.balance, account.last_updated ? new Date(account.last_updated) : new Date());
   }

   await redisClient.del(`accounts:${user_id}`);

   return {
      status: 200,
      message: type === "details" ? "Account details updated" : "Account history updated"
   };
}

export async function updateAccountsOrdering(user_id: string, accounts: Partial<Account>[]): Promise<ServerResponse> {
   const updates: Partial<Account>[] = [];

   for (const account of accounts) {
      if (!account.account_id || typeof account.account_order !== "number") {
         return {
            status: 400,
            message: "Invalid account ordering data",
            errors: { account_order: "Account order must be a number" }
         };
      }

      updates.push({ account_id: account.account_id, account_order: account.account_order });
   }

   await updateOrdering(user_id, updates);
   await redisClient.del(`accounts:${user_id}`);

   return {
      status: 200,
      message: "Account ordering updated"
   };
}

export async function deleteAccount(user_id: string, account_id: string): Promise<ServerResponse> {

   const result = await removeAccount(account_id, user_id);

   if (!result) {
      return {
         status: 404,
         message: "Account not found",
         errors: { account: "Account does not exist based on the provided ID" }
      };
   }

   await redisClient.del(`accounts:${user_id}`);

   return {
      status: 200,
      message: "Account deleted",
      data: { success: true }
   };

}