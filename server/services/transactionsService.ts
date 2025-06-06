import { ServerResponse } from "capital/server";
import { Transaction, transactionSchema } from "capital/transactions";

import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { clearCacheAndSendSuccess, sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as transactionsRepository from "@/repository/transactionsRepository";

/**
 * Cache duration for user transactions (10 minutes)
 */
const TRANSACTION_CACHE_DURATION = 10 * 60;

/**
 * Generates transaction cache key for Redis
 *
 * @param {string} user_id - User identifier
 * @returns {string} Redis cache key for transactions
 */
const getTransactionCacheKey = (user_id: string): string => `transactions:${user_id}`;

/**
 * Fetches user transactions ordered by date descending
 *
 * @param {string} user_id - User identifier
 * @returns {Promise<ServerResponse>} A server response of `200` with transaction array
 */
export async function fetchTransactions(user_id: string): Promise<ServerResponse> {
   // Try to get the transactions from the cache
   const key: string = getTransactionCacheKey(user_id);
   const cache: string | null = await getCacheValue(key);

   if (cache) {
      return sendServiceResponse(200, JSON.parse(cache));
   }

   // Cache miss - fetch from the database and store in the cache
   const result: Transaction[] = await transactionsRepository.findByUserId(user_id);
   setCacheValue(key, TRANSACTION_CACHE_DURATION, JSON.stringify(result));

   return sendServiceResponse(200, result);
}

/**
 * Creates a new transaction
 *
 * @param {string} user_id - User identifier
 * @param {Transaction} transaction - Transaction object to create
 * @returns {Promise<ServerResponse>} A server response of `201` with the inserted transaction ID or `400` with validation errors
 */
export async function createTransaction(user_id: string, transaction: Transaction): Promise<ServerResponse> {
   // Validate input against the transaction schema
   const fields = transactionSchema.strict().safeParse(transaction);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   // Create the transaction in the database and retrieve the inserted transaction ID
   const result: string = await transactionsRepository.create(user_id, fields.data);
   // Invalidate the cache to ensure fresh data for the next request
   removeCacheValue(getTransactionCacheKey(user_id));

   return sendServiceResponse(201, { transaction_id: result });
}

/**
 * Updates an existing transaction
 *
 * @param {string} user_id - User identifier
 * @param {Partial<Transaction>} transaction - Transaction object with updates
 * @returns {Promise<ServerResponse>} A server response of `204` with no content or `400`/`404` with respective errors
 */
export async function updateTransaction(user_id: string, transaction: Partial<Transaction>): Promise<ServerResponse> {
   // Ensure the transaction ID is provided to identify which record to update
   if (!transaction.transaction_id) {
      return sendValidationErrors(null, {
         transaction_id: "Missing transaction ID"
      });
   }

   // Validate input against the partial transaction schema
   const fields = transactionSchema.partial().safeParse(transaction);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   // Update the transaction in the database
   const result = await transactionsRepository.update(user_id, transaction.transaction_id, fields.data);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         transaction_id: "Transaction does not exist or does not belong to the user based on the provided ID"
      });
   }

   return clearCacheAndSendSuccess(getTransactionCacheKey(user_id));
}

/**
 * Deletes a list of transactions
 *
 * @param {string} user_id - User identifier
 * @param {string[]} transactionIds - Transaction IDs to delete
 * @returns {Promise<ServerResponse>} A server response of `204` with no content or `404` with respective errors
 */
export async function deleteTransactions(user_id: string, transactionIds: string[]): Promise<ServerResponse> {
   // Verify that transaction IDs are provided as a non-empty array
   if (!Array.isArray(transactionIds) || !transactionIds?.length) {
      return sendValidationErrors(null, {
         transactionIds: "Missing transaction IDs"
      });
   }

   // Delete all specified transactions in a batch operation
   const result = await transactionsRepository.deleteTransactions(user_id, transactionIds);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         transactionIds: "Transaction(s) do not exist or do not belong to the user based on the provided IDs"
      });
   }

   return clearCacheAndSendSuccess(getTransactionCacheKey(user_id));
}