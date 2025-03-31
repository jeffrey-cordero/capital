import { Account, AccountHistory, accountHistorySchema, accountSchema } from "capital/accounts";
import { ServerResponse } from "capital/server";
import { z } from "zod";

import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as accountsRepository from "@/repository/accountsRepository";

/**
 * Cache duration in seconds for account data (10 minutes)
 */
const ACCOUNT_CACHE_DURATION = 10 * 60;

/**
 * Helper function to generate account cache key for Redis.
 *
 * @param {string} user_id - User ID
 * @returns {string} Account cache key
 */
const getAccountCacheKey = (user_id: string): string => `accounts:${user_id}`;

/**
 * Helper function to clear account cache on successful account updates.
 *
 * @param {string} user_id - User ID
 */
const clearAccountCache = (user_id: string): void => {
   removeCacheValue(getAccountCacheKey(user_id));
};

/**
 * Helper function to send a successful update response.
 *
 * @param {string} user_id - User ID
 * @returns {Promise<ServerResponse>} A server response of `204` (no content)
 */
const clearCacheOnSuccess = (user_id: string): ServerResponse => {
   // Invalidate cache to ensure fresh data on next fetch
   clearAccountCache(user_id);
   return sendServiceResponse(204);
};

/**
 * Fetches user financial accounts from cache or database.
 *
 * @param {string} user_id - User ID
 * @returns {Promise<ServerResponse>} A server response of `200` (`Account[]`)
 */
export async function fetchAccounts(user_id: string): Promise<ServerResponse> {
   // Try to get accounts from cache first
   const key: string = getAccountCacheKey(user_id);
   const cache: string | null = await getCacheValue(key);

   if (cache) {
      return sendServiceResponse(200, "Accounts", JSON.parse(cache) as Account[]);
   }

   // Cache miss - fetch from database and store in cache
   const result: Account[] = await accountsRepository.findByUserId(user_id);
   setCacheValue(key, ACCOUNT_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(200, "Accounts", result);
}

/**
 * Creates a new account and initial history record.
 *
 * @param {string} user_id - User ID
 * @param {Account} account - Account object to create
 * @returns {Promise<ServerResponse>} A server response of `201` (`{ account_id: string }`) or `400` with respective errors
 */
export async function createAccount(user_id: string, account: Account): Promise<ServerResponse> {
   // Validate input against account schema
   const fields = accountSchema.strict().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid account fields");
   }

   // Create account and it's initial history record
   const account_id: string = await accountsRepository.create(user_id, fields.data as Account);

   // Invalidate cache to ensure fresh data on next fetch
   clearAccountCache(user_id);
   return sendServiceResponse(201, "Account created", { account_id });
}

/**
 * Updates an account or its history record.
 *
 * @param {string} type - Type of update to perform ("details" | "history")
 * @param {string} user_id - User ID
 * @param {Partial<Account & AccountHistory>} account - Account object to update
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/404` with respective errors
 */
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
      return sendValidationErrors(null, "No account fields to update");
   }

   let result: boolean;

   if (type === "details") {
      // Validate input against account schema
      const fields = accountSchema.partial().safeParse(account);

      if (!fields.success) {
         return sendValidationErrors(fields, "Invalid account fields");
      }

      result = await accountsRepository.updateDetails(account.account_id, fields.data as Partial<Account & AccountHistory>);
   } else {
      // Validate input against account history schema
      const fields = accountHistorySchema.safeParse(account as AccountHistory);

      if (!fields.success) {
         return sendValidationErrors(fields, "Invalid account history fields");
      }

      result = await accountsRepository.updateHistory(
         account.account_id,
         Number(fields.data.balance),
         fields.data.last_updated ? new Date(fields.data.last_updated) : new Date()
      );
   }

   if (!result) {
      return sendServiceResponse(404, "Account not found", undefined,
         { account: "Account does not exist based on the provided ID" });
   }

   return clearCacheOnSuccess(user_id);
}

/**
 * Updates the ordering of accounts.
 *
 * @param {string} user_id - User ID
 * @param {string[]} accounts - Array of account IDs
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404` with respective errors
 */
export async function updateAccountsOrdering(user_id: string, accounts: string[]): Promise<ServerResponse> {
   // Validate array of account IDs
   if (!Array.isArray(accounts) || !accounts?.length) {
      return sendValidationErrors(null, "Invalid account ordering fields",
         { accounts: "Account ID array must be non-empty" });
   }

   // Validate each account ID against UUID schema
   const uuidSchema = z.string().trim().uuid();
   const updates: Partial<Account>[] = [];

   for (let i = 0; i < accounts.length; i++) {
      const uuidFields = uuidSchema.safeParse(accounts[i]);

      if (!uuidFields.success) {
         return sendValidationErrors(null, "Invalid account ordering fields",
            { account_id: `Account ID must be a valid UUID: '${accounts[i]}'` }
         );
      }

      updates.push({ account_id: uuidFields.data, account_order: i });
   }

   // Update account ordering in database
   const result = await accountsRepository.updateOrdering(user_id, updates);

   if (!result) {
      return sendServiceResponse(404, "Invalid account ordering fields", undefined,
         { accounts: "No possible ordering updates based on provided account IDs" });
   }

   return clearCacheOnSuccess(user_id);
}

/**
 * Deletes an account history record.
 *
 * @param {string} user_id - User ID
 * @param {string} account_id - Account ID
 * @param {string} last_updated - Last updated date
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404`/`409` with respective errors
 */
export async function deleteAccountHistory(user_id: string, account_id: string, last_updated: string): Promise<ServerResponse> {
   // Validate account ID and date inputs
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

   return clearCacheOnSuccess(user_id);
}

/**
 * Deletes an account.
 *
 * @param {string} user_id - User ID
 * @param {string} account_id - Account ID
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404` with respective errors
 */
export async function deleteAccount(user_id: string, account_id: string): Promise<ServerResponse> {
   // Validate account ID input
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

   return clearCacheOnSuccess(user_id);
}