import { Account, AccountHistory, accountHistorySchema, accountSchema } from "capital-types/accounts";
import { ServerResponse } from "capital-types/server";
import { z } from "zod";

import { redisClient } from "@/app";
import { sendServerResponse, sendValidationErrors } from "@/lib/api/service";
import {  create,  deleteAccount as removeAccount, findByUserId, updateDetails, updateHistory as updateAccountHistory, updateOrdering } from "@/repository/accountsRepository";

export async function fetchAccounts(user_id: string): Promise<ServerResponse> {
   // Validate account fields
   const cache = await redisClient.get(`accounts:${user_id}`);

   if (cache) {
      return sendServerResponse(200, "Accounts", JSON.parse(cache));
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
      await updateDetails(account.account_id, account);
   } else {
      if (!account.balance) {
         return sendValidationErrors(null, "Balance is required for updating account history", { balance: "Missing balance" });
      }

      const fields = accountHistorySchema.safeParse(account as AccountHistory);

      if (!fields.success) {
         return sendValidationErrors(fields, "Invalid account history fields");
      } else {
         await updateAccountHistory(account.account_id, account.balance, account.last_updated ? new Date(account.last_updated) : new Date());
      }
   }

   await redisClient.del(`accounts:${user_id}`);

   return sendServerResponse(204, type === "details" ? "Account details updated" : "Account history updated");
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

   await updateOrdering(user_id, updates);
   await redisClient.del(`accounts:${user_id}`);

   return sendServerResponse(204, "Account ordering updated");
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