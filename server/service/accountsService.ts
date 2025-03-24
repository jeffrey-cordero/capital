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
 * Helper function to generate account cache key
 *
 * @param {string} user_id - User ID
 * @returns {string} Account cache key
 * @description
 * - Generates a cache key for the account data based on the user ID (accounts:${user_id})
 */
const getAccountCacheKey = (user_id: string): string => `accounts:${user_id}`;

/**
 * Helper function to clear account cache on successful account updates
 *
 * @param {string} user_id - User ID
 * @description
 * - Removes the account cache key from Redis
 */
const clearAccountCache = (user_id: string): void => {
   removeCacheValue(getAccountCacheKey(user_id));
};

/**
 * Fetches accounts from cache or database and returns them as a server response
 *
 * @param {string} user_id - User ID
 * @returns {Promise<ServerResponse>} Server response - 200 ({ accounts: Account[] })
 * @description
 * - Fetches accounts from cache or database and returns them as a server response
 * - Writes most recent data to cache if accounts are fetched from the database
 */
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

/**
 * Creates a new account and initial history record
 *
 * @param {string} user_id - User ID
 * @param {Account} account - Account object to create
 * @returns {Promise<ServerResponse>} Server response - 201 ({ account_id: string }) or 400 (errors: Record<string, string>)
 * @description
 * - Validates the account data structure
 * - Creates a new account and initial history record
 * - Invalidates cache to ensure fresh data on next fetch
 */
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

/**
 * Updates an account or its history record
 *
 * @param {string} type - Type of update to perform ("details" | "history")
 * @param {string} user_id - User ID
 * @param {Partial<Account & AccountHistory>} account - Account object to update
 * @returns {Promise<ServerResponse>} Server response - 204 (no content) or 400 (errors: Record<string, string>) or 404 ({account: string})
 * @description
 * - Validates the account data structure
 * - Updates an account or its history record
 * - Invalidates cache to ensure fresh data on next fetch
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
      // Requires at least one field to update (account_id is required)
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

/**
 * Updates the ordering of accounts
 *
 * @param {string} user_id - User ID
 * @param {string[]} accounts - Array of account IDs
 * @returns {Promise<ServerResponse>} Server response - 204 (no content) or 400 (errors: Record<string, string>) or 404 ({accounts: string})
 * @description
 * - Validates the account IDs array
 * - Updates the ordering of accounts in the database
 * - Invalidates cache to ensure fresh data on next fetch
 */
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

/**
 * Deletes an account history record
 *
 * @param {string} user_id - User ID
 * @param {string} account_id - Account ID
 * @param {string} last_updated - Last updated date
 * @returns {Promise<ServerResponse>} Server response - 204 (no content) or 400 (errors: Record<string, string>) or 404 ({history: string}) or 409 ({history: string})
 * @description
 * - Validates the account ID and date
 * - Deletes an account history record
 * - Invalidates cache to ensure fresh data on next fetch
 */
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

/**
 * Deletes an account
 *
 * @param {string} user_id - User ID
 * @param {string} account_id - Account ID
 * @returns {Promise<ServerResponse>} Server response - 204 (no content) or 400 (errors: Record<string, string>) or 404 ({account: string})
 * @description
 * - Validates the account ID
 * - Deletes an account
 * - Invalidates cache to ensure fresh data on next fetch
 */
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