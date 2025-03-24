require("dotenv").config();

import Redis from "ioredis";

import { logger } from "@/lib/logger";

/**
 * Initializes and connects to the Redis server
 *
 * @returns {Promise<RedisClientType>} Connected Redis client
 * @description
 * - Connects to the Redis server using the provided URL
 * - Sets a retry strategy for connection attempts (150ms)
 */
const redisClient = new Redis(process.env.REDIS_URL || "redis:6379", {
   retryStrategy: (times) => {
      // Retry connection at most once within 150ms
      if (times <= 1) {
         return 150;
      } else {
         return null;
      }
   }
});

/**
 * Logs Redis connection errors
 *
 * @param {Error} error - The error object
 * @description
 * - Logs connection errors while method handler's will log more specific errors
 */
redisClient.on("error", (error: any) => {
   if (error.code === "ECONNREFUSED") {
      // Log connection errors while method handler's will log more specific errors
      logger.error(`redisClient.connect(): ${error.message}\n\n${error.stack}`);
   }
});

/**
 * Retrieves a value from Redis by key
 *
 * @param {string} key - Redis key to fetch
 * @returns {Promise<any>} Parsed value or null if key doesn't exist
 * @description
 * - Retrieves a value from Redis by key with error logging
 */
export async function getCacheValue(key: string): Promise<string | null> {
   try {
      return await redisClient.get(key);
   } catch (error: any) {
      logger.error(`redisClient.get(${key}): ${error.message}\n\n${error.stack}`);

      return null;
   }
}

/**
 * Sets a key-value pair in Redis with a specific time to live (TTL)
 *
 * @param {string} key - Redis key to set
 * @param {number} time - Time to live (TTL) in seconds
 * @param {string} value - Value to store (will be JSON stringified)
 * @description
 * - Sets a key-value pair in Redis with a specific time to live (TTL)
 * - Logs errors while method handler's will log more specific errors
 */
export function setCacheValue(key: string, time: number, value: string): void {
   redisClient.setex(key, time, value).catch((error: any) => {
      logger.error(`redisClient.setex(${key}): ${error.message}\n\n${error.stack}`);
   });
}

/**
 * Removes a key from Redis
 *
 * @param {string} key - Redis key to delete
 * @description
 * - Removes a key from Redis with error logging
 * - Method handler's will log more specific errors
 */
export function removeCacheValue(key: string): void {
   redisClient.del(key).catch((error: any) => {
      logger.error(`redisClient.del(${key}): ${error.message}\n\n${error.stack}`);
   });
}