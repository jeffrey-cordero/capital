require("dotenv").config();

import Redis from "ioredis";

import { logger } from "@/lib/logger";

/**
 * Initializes and connects to the Redis server, where the application follows a
 * retry strategy of `150ms` for connection attempts and cache aside / lazy-loading
 * approach for caching values
 */
const redisClient = new Redis(process.env.REDIS_URL || "redis:6379", {
   retryStrategy: (times) => {
      if (times <= 1) {
         return 150; // 150ms retry strategy
      } else {
         return null; // No retries after the first attempt
      }
   }
});

/**
 * Logs Redis connection errors and acts as a fallback for unexpected errors
 */
redisClient.on("error", (error: any) => {
   if (error.code === "ECONNREFUSED") {
      // Log connection errors, where method handler's log more specific errors
      logger.error(`redisClient.connect(): ${error.message}\n\n${error.stack}`);
   }
});

/**
 * Retrieves a value from Redis by key
 *
 * @param {string} key - Redis key to fetch
 * @returns {Promise<any>} Parsed value or null if key doesn't exist
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
 * Sets a key-value pair in Redis with a specific time to live (`TTL`) in seconds
 *
 * @param {string} key - Redis key to set
 * @param {number} time - Time to live (`TTL`) in seconds
 * @param {string} value - Value to store in Redis cache
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
 */
export function removeCacheValue(key: string): void {
   redisClient.del(key).catch((error: any) => {
      logger.error(`redisClient.del(${key}): ${error.message}\n\n${error.stack}`);
   });
}