require("dotenv").config();

import session from "express-session";
import Redis from "ioredis";

const connectRedis = require("connect-redis").default;

export const redisClient = new Redis(process.env.REDIS_URL || "redis:6379", {
   maxRetriesPerRequest: 3,
   retryStrategy: (times) => {
      if (times >= 3) {
         // Stop retrying after 3 attempts
         return null;
      } else {
         // Retry connection in 3 seconds
         return 3000;
      }
   }
});

// Set up the session store conditionally
export let redisStore: session.Store | undefined = undefined;

// Initialize the session store when Redis is ready
redisClient.on("ready", () => {
   redisStore = new connectRedis({ client: redisClient });
});

// Fallback to undefined store until the Redis client is ready
redisClient.on("reconnecting", () => {
   redisStore = undefined;
});

redisClient.on("error", () => {
   redisStore = undefined;
});