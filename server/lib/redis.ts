require("dotenv").config();

import Redis from "ioredis";

import { logger } from "@/lib/logger";

const redisClient = new Redis(process.env.REDIS_URL || "redis:6379", {
   retryStrategy: (times) => {
      // Retry connection at most once with a single second interval
      if (times <= 1) {
         return 1000;
      } else {
         return null;
      }
   }
});

redisClient.on("error", (error: any) => {
   if (error.code === "ECONNREFUSED") {
      // Log connection errors while method handler's will log more specific errors
      logger.error(`redisClient.connect(): ${error.message}\n\n${error.stack}`);
   }
});

// Helper methods to handle Redis operations with logging and graceful recovery
export async function getCacheValue(key: string): Promise<string | null> {
   try {
      return await redisClient.get(key);
   } catch (error: any) {
      logger.error(`redisClient.get(${key}): ${error.message}\n\n${error.stack}`);

      return null;
   }
}

export function setCacheValue(key: string, time: number, value: string): void {
   redisClient.setex(key, time, value).catch((error: any) => {
      logger.error(`redisClient.setex(${key}): ${error.message}\n\n${error.stack}`);
   });
}

export function removeCacheValue(key: string): void {
   redisClient.del(key).catch((error: any) => {
      logger.error(`redisClient.del(${key}): ${error.message}\n\n${error.stack}`);
   });
}