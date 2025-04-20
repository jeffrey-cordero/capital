import { Account, accountSchema } from "capital/accounts";
import { ServerResponse } from "capital/server";
import { z } from "zod";

import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { clearCacheAndSendSuccess, sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as accountsRepository from "@/repository/accountsRepository";

/**
 * Cache duration for user accounts (30 minutes)
 */
const ACCOUNT_CACHE_DURATION = 30 * 60;

/**
 * Generates user accounts cache key for Redis
 *
 * @param {string} user_id - User identifier
 * @returns {string} Redis cache key for user accounts
 */
const getAccountCacheKey = (user_id: string): string => `accounts:${user_id}`;

/**
 * Fetches user financial accounts
 *
 * @param {string} user_id - User identifier
 * @returns {Promise<ServerResponse>} A server response of `200` with user accounts array
 */
export async function fetchAccounts(user_id: string): Promise<ServerResponse> {
   // Try to get financial accounts from cache first
   const key: string = getAccountCacheKey(user_id);
   const cache: string | null = await getCacheValue(key);

   if (cache) {
      return sendServiceResponse(200, JSON.parse(cache));
   }

   // Cache miss - fetch from database and store in cache
   const result: Account[] = await accountsRepository.findByUserId(user_id);
   setCacheValue(key, ACCOUNT_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(200, result);
}

/**
 * Creates a new account
 *
 * @param {string} user_id - User identifier
 * @param {Account} account - Account details to create
 * @returns {Promise<ServerResponse>} A server response of `201` with the inserted account ID or `400` with validation errors
 */
export async function createAccount(user_id: string, account: Account): Promise<ServerResponse> {
   // Validate input against account schema
   const fields = accountSchema.strict().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   // Create account in the database and retrieve the inserted account ID
   const account_id: string = await accountsRepository.create(user_id, fields.data as Account);

   // Invalidate cache to ensure fresh data for the next request
   removeCacheValue(getAccountCacheKey(user_id));

   return sendServiceResponse(201, { account_id });
}

/**
 * Updates an account with a last updated timestamp
 *
 * @param {string} user_id - User identifier
 * @param {Partial<Account>} account - Account object to update
 * @returns {Promise<ServerResponse>} A server response of `204` with no content or `400`/`404` with errors
 */
export async function updateAccount(
   user_id: string,
   account: Partial<Account>
): Promise<ServerResponse> {
   // Verify required fields are present for the update
   if (!account.account_id) {
      return sendValidationErrors(null, { account_id: "Missing account ID" });
   } else if (!account.last_updated) {
      return sendValidationErrors(null, { last_updated: "Missing last updated timestamp" });
   }

   // Validate account fields against the account schema
   const fields = accountSchema.partial().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   // Update account details in the database
   const result = await accountsRepository.updateDetails(user_id, account.account_id, fields.data);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         account_id: "Account does not exist based on the provided ID"
      });
   }

   return clearCacheAndSendSuccess(getAccountCacheKey(user_id));
}

/**
 * Updates the ordering of accounts
 *
 * @param {string} user_id - User identifier
 * @param {string[]} accounts - Array of account IDs
 * @returns {Promise<ServerResponse>} A server response of `204` with no content or `400`/`404` with errors
 */
export async function updateAccountsOrdering(user_id: string, accounts: string[]): Promise<ServerResponse> {
   // Validate the array of account IDs is not empty
   if (!Array.isArray(accounts) || !accounts?.length) {
      return sendValidationErrors(null, {
         accounts: "Account ID's array must be a valid array representation"
      });
   }

   // Validate each account ID against the UUID schema and create order updates
   const uuidSchema = z.string().trim().uuid();
   const updates: Partial<Account>[] = [];

   for (let i = 0; i < accounts.length; i++) {
      const uuidFields = uuidSchema.safeParse(accounts[i]);

      if (!uuidFields.success) {
         return sendValidationErrors(null, {
            account_id: `Invalid account ID: '${accounts[i]}'`
         });
      }

      updates.push({ account_id: uuidFields.data, account_order: i });
   }

   // Perform bulk order update in the database
   const result = await accountsRepository.updateOrdering(user_id, updates);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         accounts: "Account(s) do not exist or do not belong to the user based on the provided IDs"
      });
   }

   return clearCacheAndSendSuccess(getAccountCacheKey(user_id));
}

/**
 * Deletes an account
 *
 * @param {string} user_id - User identifier
 * @param {string} account_id - Account identifier
 * @returns {Promise<ServerResponse>} A server response of `204` with no content or `400`/`404` with errors
 */
export async function deleteAccount(user_id: string, account_id: string): Promise<ServerResponse> {
   // Validate the account ID input exists
   if (!account_id) {
      return sendValidationErrors(null, {
         account_id: "Missing account ID"
      });
   }

   // Attempt to delete the account from the database
   const result = await accountsRepository.deleteAccount(user_id, account_id);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         account_id: "Account does not exist based on the provided ID or does not belong to the user"
      });
   }

   return clearCacheAndSendSuccess(getAccountCacheKey(user_id));
}