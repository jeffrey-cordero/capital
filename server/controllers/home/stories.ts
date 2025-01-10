

import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendErrors, sendSuccess } from "@/controllers/api/response";
import { redisClient } from "@/app";
import { Stories } from "@/models/stories";

const stories = asyncHandler(async (req: Request, res: Response) => {
   try {
      const cache = await redisClient.get("stories");

      if (cache) {
         return sendSuccess(res, 200, "Stories", { stories: JSON.parse(cache) });
      } else {
         return sendSuccess(res, 200, "Stories", { stories: await Stories.fetchStories() });
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export default stories;

