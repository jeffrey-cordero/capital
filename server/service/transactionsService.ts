import { ServerResponse } from "capital/server";
import { Transaction, transactionSchema } from "capital/transactions";

import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as transactionsRepository from "@/repository/transactionsRepository";

/**
 * Cache duration in seconds for transaction data (10 minutes)
 */
const TRANSACTION_CACHE_DURATION = 10 * 60;

/**
 * Helper function to generate transaction cache key for Redis.
 *
 * @param {string} user_id - User ID
 * @returns {string} Transaction cache key
 */
const getTransactionCacheKey = (user_id: string): string => `transactions:${user_id}`;

/**
 * Helper function to clear transaction cache on successful transaction updates.
 *
 * @param {string} user_id - User ID
 */
const clearTransactionCache = (user_id: string): void => {
   removeCacheValue(getTransactionCacheKey(user_id));
};

/**
 * Helper function to send a successful update/delete response mapping to a cache clear for strong consistency.
 *
 * @param {string} user_id - User ID
 * @returns {Promise<ServerResponse>} A server response of `204` (no content)
 */
const clearCacheOnSuccess = (user_id: string): ServerResponse => {
   // Invalidate cache to ensure fresh data on next fetch
   clearTransactionCache(user_id);
   return sendServiceResponse(204);
};

/**
 * Fetches user transactions from cache or database ordered by date descending.
 *
 * @param {string} user_id - User ID
 * @returns {Promise<ServerResponse>} A server response of `200` (`Transaction[]`)
 */
export async function fetchTransactions(user_id: string): Promise<ServerResponse> {
   const key: string = getTransactionCacheKey(user_id);
   const cache: string | null = await getCacheValue(key);

   if (cache) {
      return sendServiceResponse(200, "Transactions", JSON.parse(cache) as Transaction[]);
   }

   // Cache miss - fetch from database and store in cache
   const result: Transaction[] = await transactionsRepository.findByUserId(user_id);
   setCacheValue(key, TRANSACTION_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(200, "Transactions", result);
}

/**
 * Creates a new transaction.
 *
 * @param {string} user_id - User ID
 * @param {Transaction} transaction - Transaction object to create
 * @returns {Promise<ServerResponse>} A server response of `201` (`{ transaction_id: string }`) or `400` with respective errors
 */
export async function createTransaction(user_id: string, transaction: Transaction): Promise<ServerResponse> {
   // Validate input against transaction schema
   const fields = transactionSchema.strict().safeParse(transaction);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid transaction fields");
   }

   // Create transaction in the database
   const result: string = await transactionsRepository.create(user_id, fields.data as Transaction);
   clearTransactionCache(user_id);

   return sendServiceResponse(201, "Transaction created", { transaction_id: result });
}

/**
 * Updates an existing transaction.
 *
 * @param {string} user_id - User ID
 * @param {string} transaction_id - Transaction ID
 * @param {Partial<Transaction>} updates - Transaction object with updates from request body
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404` with respective errors
 */
export async function updateTransaction(user_id: string, transaction_id: string, updates: Partial<Transaction>): Promise<ServerResponse> {
   if (!transaction_id) {
      return sendValidationErrors(null, "Invalid transaction fields", {
         transaction_id: "Missing transaction ID"
      });
   }

   // Ensure there are fields to update
   if (Object.keys(updates).length === 0) {
      return sendValidationErrors(null, "No transaction fields to update");
   }

   // Validate input against partial transaction schema
   const fields = transactionSchema.partial().safeParse(updates);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid transaction fields");
   }

   // Update the transaction
   const result: boolean = await transactionsRepository.update(user_id, transaction_id, fields.data as Partial<Transaction>);

   if (!result) {
      return sendServiceResponse(404, "Transaction not found", undefined, {
         transaction: "Transaction does not exist or does not belong to the user based on the provided ID"
      });
   }

   return clearCacheOnSuccess(user_id);
}

/**
 * Deletes a list of transactions.
 *
 * @param {string} user_id - User ID
 * @param {string[]} transactionIds - Transaction IDs
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404` with respective errors
 */
export async function deleteTransactions(user_id: string, transactionIds: string[]): Promise<ServerResponse> {
   if (!transactionIds) {
      return sendValidationErrors(null, "Invalid transaction fields", {
         transactionIds: "Missing transaction IDs"
      });
   }

   // Delete the transaction(s)
   const result: boolean = await transactionsRepository.deleteTransactions(user_id, transactionIds);

   if (!result) {
      return sendServiceResponse(404, "Transaction(s) not found", undefined, {
         transaction: "Transaction(s) do not exist or do not belong to the user based on the provided IDs"
      });
   }

   return clearCacheOnSuccess(user_id);
}