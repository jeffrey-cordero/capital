import { Account, AccountHistory, accountHistorySchema, accountSchema } from "capital/accounts";
import { ServerResponse } from "capital/server";
import { z } from "zod";

import { redisClient } from "@/app";
import { sendServerResponse, sendValidationErrors } from "@/lib/api/service";
import {  create,  deleteAccount as removeAccount, findByUserId, removeHistory, updateDetails, updateHistory as updateAccountHistory, updateOrdering } from "@/repository/accountsRepository";

export async function fetchAccounts(user_id: string): Promise<ServerResponse> {
   // Validate account fields
   const cache = await redisClient.get(`accounts:${user_id}`);

   if (cache) {
      return sendServerResponse(200, "Accounts", { accounts: JSON.parse(cache) });
   } else {
      // Fetch accounts from the database repository
      const result = await findByUserId(user_id);

      // Cache the result for 5 minutes
      await redisClient.setex(`accounts:${user_id}`, 5 * 60, JSON.stringify(result));

      return sendServerResponse(200, "Accounts", { accounts: result });
   }
}

export async function createAccount(user_id: string, account: Account): Promise<ServerResponse> {
   // Validate account fields
   const fields = accountSchema.safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid account fields");
   } else {
      const creation = await create(user_id, account);
      await redisClient.del(`accounts:${user_id}`);

      return sendServerResponse(200, "Account created", { account_id: creation.account_id });
   }
}

export async function updateAccount(type: "details" | "history", user_id: string, account: Partial<Account & AccountHistory>): Promise<ServerResponse> {
   // Validate account fields
   const fields = accountSchema.partial().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid account fields");
   } else if (!account.account_id) {
      return sendValidationErrors(null, "Invalid account fields", { account_id: "Missing account ID" });
   }

   if (type === "details") {
      const result = await updateDetails(account.account_id, account);

      if (result) {
         await redisClient.del(`accounts:${user_id}`);

         return sendServerResponse(204, "Account details updated");
      } else {
         return sendServerResponse(404, "Account not found", undefined, { account: "Account does not exist based on the provided ID" });
      }
   } else {
      const fields = accountHistorySchema.safeParse(account as AccountHistory);

      if (!fields.success) {
         return sendValidationErrors(fields, "Invalid account history fields");
      } else {
         const result = await updateAccountHistory(
            account.account_id, account.balance as number, account.last_updated ? new Date(account.last_updated) : new Date()
         );

         if (result) {
            await redisClient.del(`accounts:${user_id}`);

            return sendServerResponse(204, "Account history updated");
         } else {
            return sendServerResponse(404, "Account not found", undefined, { account: "Account does not exist based on the provided ID" });
         }
      }
   }
}

export async function updateAccountsOrdering(user_id: string, accounts: string[]): Promise<ServerResponse> {
   // Parse the array of account IDs
   const uuidSchema = z.string().uuid();
   const updates: Partial<Account>[] = [];

   if (!accounts || accounts.length === 0) {
      return sendValidationErrors(null, "Invalid account ordering data", { accounts: "Account ID array must be non-empty" });
   }

   for (let i = 0; i < accounts.length; i++) {
      if (!uuidSchema.safeParse(accounts[i]).success) {
         return sendValidationErrors(null, "Invalid account ordering data", { account_order: `Account order must be a number: '${accounts[i]}'` });
      }

      updates.push({ account_id: accounts[i], account_order: i });
   }

   const result = await updateOrdering(user_id, updates);

   if (!result) {
      return sendServerResponse(404, "Account(s) not found", undefined, { accounts: "No account order's could be updated based on provided ID(s)" });
   } else {
      await redisClient.del(`accounts:${user_id}`);

      return sendServerResponse(204, "Account ordering updated");
   }
}

export async function deleteAccountHistory(user_id: string, account_id: string, last_updated: string): Promise<ServerResponse> {
   const result = await removeHistory(account_id, new Date(last_updated));

   if (result === "missing") {
      return sendServerResponse(404, "Account history record not found", undefined,
         { history: "Account history does not exist based on the provided date" }
      );
   } else if (result === "conflict") {
      return sendServerResponse(409, "Account history record conflicts", undefined,
         { history: "At least one history record must remain for this account" }
      );
   } else {
      await redisClient.del(`accounts:${user_id}`);

      return sendServerResponse(204, "Account history record deleted");
   }
}

export async function deleteAccount(user_id: string, account_id: string): Promise<ServerResponse> {
   const result = await removeAccount(user_id, account_id);

   if (!result) {
      return sendServerResponse(404, "Account not found", undefined, { account: "Account does not exist based on the provided ID" });
   } else {
      await redisClient.del(`accounts:${user_id}`);

      return sendServerResponse(204, "Account deleted");
   }
}