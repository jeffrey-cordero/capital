import { Account, AccountHistory, accountHistorySchema, accountSchema } from "capital/accounts";
import { ServerResponse } from "capital/server";
import { z } from "zod";

import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as accountsRepository from "@/repository/accountsRepository";

// Cache duration in seconds for account data (10 minutes)
const ACCOUNT_CACHE_DURATION = 10 * 60;

// Helper function to generate account cache key
const getAccountCacheKey = (user_id: string) => `accounts:${user_id}`;

// Helper function to clear account cache on successful account updates
const clearAccountCache = (user_id: string) => {
   removeCacheValue(getAccountCacheKey(user_id));
};

export async function fetchAccounts(user_id: string): Promise<ServerResponse> {
   // Try to get accounts from cache first for better performance
   const cacheKey: string = getAccountCacheKey(user_id);
   const cache: string | null = await getCacheValue(cacheKey);

   if (cache) {
      return sendServiceResponse(200, "Accounts", JSON.parse(cache) as Account[]);
   }

   // Cache miss - fetch from database and store in cache
   const result: Account[] = await accountsRepository.findByUserId(user_id);
   setCacheValue(cacheKey, ACCOUNT_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(200, "Accounts", result);
}

export async function createAccount(user_id: string, account: Account): Promise<ServerResponse> {
   // Validate account data structure
   const fields = accountSchema.strict().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid account fields");
   }

   // Create account and initial history record
   const account_id: string = await accountsRepository.create(user_id, account);

   // Invalidate cache to ensure fresh data on next fetch
   clearAccountCache(user_id);
   return sendServiceResponse(201, "Account created", { account_id });
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
   } else if (Object.keys(account).length <= 1) {
      // account_id + at least one field
      return sendValidationErrors(null, "No account fields to update");
   }

   let result: boolean;

   if (type === "details") {
      // Validate and update account details
      const fields = accountSchema.partial().safeParse(account);

      if (!fields.success) {
         return sendValidationErrors(fields, "Invalid account fields");
      }

      result = await accountsRepository.updateDetails(account.account_id, account);
   } else {
      // Validate and update account history
      const fields = accountHistorySchema.safeParse(account as AccountHistory);

      if (!fields.success) {
         return sendValidationErrors(fields, "Invalid account history fields");
      }

      result = await accountsRepository.updateHistory(
         account.account_id,
         Number(account.balance),
         account.last_updated ? new Date(account.last_updated) : new Date()
      );
   }

   if (!result) {
      return sendServiceResponse(404, "Account not found", undefined,
         { account: "Account does not exist based on the provided ID" });
   }

   // Success - invalidate cache and return success response
   clearAccountCache(user_id);
   return sendServiceResponse(204);
}

export async function updateAccountsOrdering(user_id: string, accounts: string[]): Promise<ServerResponse> {
   // Validate account IDs array
   if (!accounts?.length) {
      return sendValidationErrors(null, "Invalid account ordering fields",
         { accounts: "Account ID array must be non-empty" });
   }

   // Validate each UUID and create updates array
   const uuidSchema = z.string().trim().uuid();
   const updates: Partial<Account>[] = [];

   for (let i = 0; i < accounts.length; i++) {
      if (!uuidSchema.safeParse(accounts[i]).success) {
         return sendValidationErrors(null, "Invalid account ordering fields",
            { account_id: `Account ID must be a valid UUID: '${accounts[i]}'` }
         );
      }

      updates.push({ account_id: accounts[i], account_order: i });
   }

   // Update account ordering in database
   const result = await accountsRepository.updateOrdering(user_id, updates);

   if (!result) {
      return sendServiceResponse(404, "Invalid account ordering fields", undefined,
         { accounts: "No possible ordering updates based on provided account IDs" });
   }

   // Success - invalidate cache and return success response
   clearAccountCache(user_id);
   return sendServiceResponse(204);
}

export async function deleteAccountHistory(user_id: string, account_id: string, last_updated: string): Promise<ServerResponse> {
   // Validate account ID and date
   if (!account_id || !last_updated) {
      const errors: Record<string, string> = {};

      if (!account_id) {
         errors.account_id = "Account ID is required";
      }

      if (!last_updated) {
         errors.last_updated = "Last updated date is required";
      }

      return sendValidationErrors(null, "Invalid account history fields", errors);
   }

   // Delete history record
   const result = await accountsRepository.removeHistory(account_id, new Date(last_updated));

   // Handle different deletion scenarios
   if (result === "missing") {
      return sendServiceResponse(404, "Account history record not found", undefined,
         { history: "Account history does not exist based on the provided date" });
   } else if (result === "conflict") {
      return sendServiceResponse(409, "Account history record conflicts", undefined,
         { history: "At least one history record must remain for this account" });
   }

   // Success - invalidate cache and return success response
   clearAccountCache(user_id);
   return sendServiceResponse(204);
}

export async function deleteAccount(user_id: string, account_id: string): Promise<ServerResponse> {
   // Validate account ID
   if (!account_id) {
      return sendValidationErrors(null, "Invalid account fields",
         { account_id: "Account ID is required" });
   }

   // Delete account
   const result = await accountsRepository.deleteAccount(user_id, account_id);

   if (!result) {
      return sendServiceResponse(404, "Account not found", undefined,
         { account: "Account does not exist based on the provided ID" });
   }

   // Success - invalidate cache and return success response
   clearAccountCache(user_id);
   return sendServiceResponse(204);
}