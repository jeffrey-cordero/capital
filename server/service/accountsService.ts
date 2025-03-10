import { Account, AccountHistory, accountHistorySchema, accountSchema } from "capital/accounts";
import { ServerResponse } from "capital/server";
import { z } from "zod";

import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse, sendValidationErrors } from "@/lib/services";
import {
   create,
   deleteAccount as removeAccount,
   findByUserId,
   removeHistory,
   updateDetails,
   updateHistory as updateAccountHistory,
   updateOrdering
} from "@/repository/accountsRepository";

// Cache duration in seconds for account data
const ACCOUNT_CACHE_DURATION = 10 * 60;

// Helper function to generate account cache key
const getAccountCacheKey = (userId: string) => `accounts:${userId}`;

// Helper function to clear account cache on successful account updates
const clearAccountCache = (userId: string) => {
   removeCacheValue(getAccountCacheKey(userId));
};

export async function fetchAccounts(user_id: string): Promise<ServerResponse> {
   // Try to get accounts from cache first
   const cacheKey: string = getAccountCacheKey(user_id);
   const cache: string | null = await getCacheValue(cacheKey);

   if (cache) {
      return sendServiceResponse(200, "Accounts", JSON.parse(cache) as Account[]);
   } else {
      // If not in cache, fetch from database
      const result: Account[] = await findByUserId(user_id);

      setCacheValue(cacheKey, ACCOUNT_CACHE_DURATION, JSON.stringify(result));
      return sendServiceResponse(200, "Accounts", result);
   }
}

export async function createAccount(user_id: string, account: Account): Promise<ServerResponse> {
   // Validate account data structure
   const fields = accountSchema.strict().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid account fields");
   } else {
      // Create account and clear the cache
      const account_id: string = await create(user_id, account);

      clearAccountCache(user_id);
      return sendServiceResponse(201, "Account created", { account_id });
   }
}

export async function updateAccount(
   type: "details" | "history",
   user_id: string,
   account: Partial<Account & AccountHistory>
): Promise<ServerResponse> {
   // Validate base account fields
   if (!account.account_id) {
      return sendValidationErrors(null, "Invalid account fields",
         { account_id: "Missing account ID" });
   } else if (Object.keys(account).length === 0) {
      return sendValidationErrors(null, "No account fields to update");
   }

   let result: boolean;

   if (type === "details") {
      // Validate and update account details
      const fields = accountSchema.partial().safeParse(account);

      if (!fields.success) {
         return sendValidationErrors(fields, "Invalid account fields");
      } else {
         result = await updateDetails(user_id, account.account_id, account);
      }
   } else {
      // Validate and update account history
      const fields = accountHistorySchema.safeParse(account as AccountHistory);

      if (!fields.success) {
         return sendValidationErrors(fields, "Invalid account history fields");
      } else {
         result = await updateAccountHistory(
            user_id,
            account.account_id,
            Number(account.balance),
            account.last_updated ? new Date(account.last_updated) : new Date()
         ); 
      }
   }

   if (!result) {
      return sendServiceResponse(404, "Account not found", undefined,
         { account: "Account does not exist based on the provided ID" });
   } else {
      clearAccountCache(user_id);
      return sendServiceResponse(204);
   }
}

export async function updateAccountsOrdering(user_id: string, accounts: string[]): Promise<ServerResponse> {
   // Validate account IDs array
   if (!accounts?.length) {
      return sendValidationErrors(null, "Invalid account ordering fields",
         { accounts: "Account ID array must be non-empty" });
   }

   // Validate each UUID and create updates array
   const uuidSchema = z.string().uuid();
   const updates: Partial<Account>[] = [];

   for (let i = 0; i < accounts.length; i++) {
      if (!uuidSchema.safeParse(accounts[i]).success) {
         // UUID validation failed
         return sendValidationErrors(null, "Invalid account ordering fields",
            { account_id: `Account ID must be a valid UUID: '${accounts[i]}'` }
         );
      }

      updates.push({ account_id: accounts[i], account_order: i });
   }

   const result = await updateOrdering(user_id, updates);

   if (!result) {
      return sendServiceResponse(404, "Invalid account ordering fields", undefined,
         { accounts: "No possible ordering updates based on provided account ID's" });
   } else {
      clearAccountCache(user_id);
      return sendServiceResponse(204);
   }
}

export async function deleteAccountHistory(user_id: string, account_id: string, last_updated: string): Promise<ServerResponse> {
   const result = await removeHistory(user_id, account_id, new Date(last_updated));

   // Handle different deletion scenarios (missing, conflict, success)
   if (result === "missing") {
      return sendServiceResponse(404, "Account history record not found", undefined,
         { history: "Account history does not exist based on the provided date" });
   } else if (result === "conflict") {
      return sendServiceResponse(409, "Account history record conflicts", undefined,
         { history: "At least one history record must remain for this account" });
   } else {
      clearAccountCache(user_id);
      return sendServiceResponse(204);
   }
}

export async function deleteAccount(user_id: string, account_id: string): Promise<ServerResponse> {
   const result = await removeAccount(user_id, account_id);

   if (!result) {
      return sendServiceResponse(404, "Account not found", undefined,
         { account: "Account does not exist based on the provided ID" });
   } else {
      clearAccountCache(user_id);
      return sendServiceResponse(204);
   }
}