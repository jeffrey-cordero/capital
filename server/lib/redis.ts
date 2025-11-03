import { config } from "dotenv";
config();

import Redis from "ioredis";

import { logger } from "@/lib/logger";

/**
 * Redis client with no retry strategy
 */
const redisClient = new Redis(process.env.REDIS_URL || "redis:6379", {
   retryStrategy: () => null
});

/**
 * Error handler for Redis connection issues
 */
redisClient.on("error", (error: any) => {
   if (error.code === "ECONNREFUSED") {
      logger.error(`redisClient.connect(): ${error.message}\n\n${error.stack}`);
   }
});

/**
 * Retrieves a value from Redis cache
 *
 * @param {string} key - Cache key to retrieve
 * @returns {Promise<string | null>} Cached value or null if not found/error
 */
export async function getCacheValue(key: string): Promise<string | null> {
   logger.info(`getCacheValue(${key}): null`);
   return null;
   // try {
   //    return await redisClient.get(key);
   // } catch (error: any) {
   //    logger.error(`redisClient.get(${key}): ${error.message}\n\n${error.stack}`);
   //    return null;
   // }
}

/**
 * Saves a value to Redis cache with expiration
 *
 * @param {string} key - Cache key
 * @param {number} time - Time-to-live in seconds
 * @param {string} value - String value to store
 */
export function setCacheValue(key: string, time: number, value: string): void {
   logger.info(`setCacheValue(${key}): ${value} for ${time} seconds`);
   return;
   // redisClient.setex(key, time, value).catch((error: any) => {
   //    logger.error(`redisClient.setex(${key}): ${error.message}\n\n${error.stack}`);
   // });
}

/**
 * Deletes a key from Redis cache
 *
 * @param {string} key - Cache key to remove
 */
export function removeCacheValue(key: string): void {
   logger.info(`removeCacheValue(${key})`);
   return;
   // redisClient.del(key).catch((error: any) => {
   //    logger.error(`redisClient.del(${key}): ${error.message}\n\n${error.stack}`);
   // });
}