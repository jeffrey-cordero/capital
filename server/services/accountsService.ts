import { Account, accountSchema } from "capital/accounts";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import { z } from "zod";

import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { clearCacheAndSendSuccess, sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as accountsRepository from "@/repository/accountsRepository";

/**
 * Cache duration for user accounts (30 minutes)
 */
export const ACCOUNT_CACHE_DURATION = 30 * 60;

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
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.OK` with user accounts array
 */
export async function fetchAccounts(user_id: string): Promise<ServerResponse> {
   // Try to get financial accounts from cache first
   const key: string = getAccountCacheKey(user_id);
   const cache: string | null = await getCacheValue(key);

   if (cache) {
      return sendServiceResponse(HTTP_STATUS.OK, JSON.parse(cache));
   }

   // Cache miss - fetch from database and store in cache
   const result: Account[] = await accountsRepository.findByUserId(user_id);
   setCacheValue(key, ACCOUNT_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(HTTP_STATUS.OK, result);
}

/**
 * Creates a new account
 *
 * @param {string} user_id - User identifier
 * @param {Account} account - Account details to create
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.CREATED` with the inserted account ID or `HTTP_STATUS.BAD_REQUEST` with validation errors
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

   return sendServiceResponse(HTTP_STATUS.CREATED, { account_id });
}

/**
 * Updates an account with a last updated timestamp
 *
 * @param {string} user_id - User identifier
 * @param {Partial<Account>} account - Account object to update
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.NO_CONTENT` with no content or `HTTP_STATUS.BAD_REQUEST`/`HTTP_STATUS.NOT_FOUND` with errors
 */
export async function updateAccount(
   user_id: string,
   account: Partial<Account>
): Promise<ServerResponse> {
   // Verify required fields are present for the update
   if (!account.account_id) {
      return sendValidationErrors(null, { account_id: "Account ID is required" });
   } else if (!account.last_updated) {
      return sendValidationErrors(null, { last_updated: "Last updated timestamp is required" });
   }

   // Validate account fields against the account schema
   const fields = accountSchema.partial().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   // Update account details in the database
   const result = await accountsRepository.updateDetails(user_id, account.account_id, fields.data);

   if (!result) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
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
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.NO_CONTENT` with no content or `HTTP_STATUS.BAD_REQUEST`/`HTTP_STATUS.NOT_FOUND` with errors
 */
export async function updateAccountsOrdering(user_id: string, accounts: string[]): Promise<ServerResponse> {
   // Validate the array of account IDs is not empty
   if (!Array.isArray(accounts)) {
      return sendValidationErrors(null, {
         accounts: "Account ID's array must be a valid array representation"
      });
   } else if (accounts.length === 0) {
      return sendValidationErrors(null, {
         accounts: "Account ID's array must not be empty"
      });
   }

   // Validate each account ID against the UUID schema and create order updates
   const uuidSchema = z.string().trim().uuid();
   const updates: Partial<Account>[] = [];
   const invalidAccountIds: string[] = [];

   for (let i = 0; i < accounts.length; i++) {
      const uuidFields = uuidSchema.safeParse(accounts[i]);

      if (!uuidFields.success) {
         invalidAccountIds.push(accounts[i]);
      } else {
         updates.push({ account_id: uuidFields.data, account_order: i });
      }
   }

   if (invalidAccountIds.length > 0) {
      return sendValidationErrors(null, {
         account_id: `Invalid account ID's: '${invalidAccountIds.join(", ")}'`
      });
   }

   // Perform bulk order update in the database
   const result = await accountsRepository.updateOrdering(user_id, updates);

   if (!result) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
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
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.NO_CONTENT` with no content or `HTTP_STATUS.BAD_REQUEST`/`HTTP_STATUS.NOT_FOUND` with errors
 */
export async function deleteAccount(user_id: string, account_id: string): Promise<ServerResponse> {
   // Validate the account ID input exists
   if (!account_id) {
      return sendValidationErrors(null, {
         account_id: "Account ID is required"
      });
   }

   // Attempt to delete the account from the database
   const result = await accountsRepository.deleteAccount(user_id, account_id);

   if (!result) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
         account_id: "Account does not exist based on the provided ID or does not belong to the user"
      });
   }

   return clearCacheAndSendSuccess(getAccountCacheKey(user_id));
}