import { Account, accountSchema } from "capital/accounts";
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
      return sendServiceResponse(200, JSON.parse(cache) as Account[]);
   }

   // Cache miss - fetch from database and store in cache
   const result: Account[] = await accountsRepository.findByUserId(user_id);
   setCacheValue(key, ACCOUNT_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(200, result);
}

/**
 * Creates a new account.
 *
 * @param {string} user_id - User ID
 * @param {Account} account - Account object to create
 * @returns {Promise<ServerResponse>} A server response of `201` (`{ account_id: string }`) or `400` with respective errors
 */
export async function createAccount(user_id: string, account: Account): Promise<ServerResponse> {
   // Validate input against account schema
   const fields = accountSchema.strict().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   // Create account
   const account_id: string = await accountsRepository.create(user_id, fields.data as Account);

   // Invalidate cache to ensure fresh data on next fetch
   clearAccountCache(user_id);
   return sendServiceResponse(201, { account_id });
}

/**
 * Updates an account.
 *
 * @param {string} user_id - User ID
 * @param {Partial<Account>} account - Account object to update
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/404` with respective errors
 */
export async function updateAccount(
   user_id: string,
   account: Partial<Account>
): Promise<ServerResponse> {
   // Validate base account fields
   if (!account.account_id) {
      return sendValidationErrors(null, { account_id: "Missing account ID" });
   } else if (Object.keys(account).length <= 1) {
      // Last updated is required for timezone purposes
      return sendValidationErrors(null, { account: "No account fields to update other than `last_updated`" });
   }

   const fields = accountSchema.partial().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   const result = await accountsRepository.updateDetails(account.account_id, fields.data as Partial<Account>);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         account: "Account does not exist based on the provided ID"
      });
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
      return sendValidationErrors(null, {
         accounts: "Account ID array must be non-empty"
      });
   }

   // Validate each account ID against UUID schema
   const uuidSchema = z.string().trim().uuid();
   const updates: Partial<Account>[] = [];

   for (let i = 0; i < accounts.length; i++) {
      const uuidFields = uuidSchema.safeParse(accounts[i]);

      if (!uuidFields.success) {
         return sendValidationErrors(null, {
            account_id: `Account ID must be a valid UUID: '${accounts[i]}'`
         });
      }

      updates.push({ account_id: uuidFields.data, account_order: i });
   }

   // Update account ordering in database
   const result = await accountsRepository.updateOrdering(user_id, updates);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         accounts: "No possible ordering updates based on provided account IDs"
      });
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
      return sendValidationErrors(null, {
         account_id: "Account ID is required"
      });
   }

   // Delete account
   const result = await accountsRepository.deleteAccount(user_id, account_id);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         account: "Account does not exist based on the provided ID"
      });
   }

   return clearCacheOnSuccess(user_id);
}