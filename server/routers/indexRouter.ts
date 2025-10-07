import { HTTP_STATUS } from "capital/server";
import express, { Request, Response } from "express";

import { sendSuccess } from "@/lib/response";

const indexRouter = express.Router();

/**
 * API health check endpoint - GET /
 */
indexRouter.get("/", async(_req: Request, res: Response) => {
   return sendSuccess(res, HTTP_STATUS.OK, "Healthy REST API");
});

export default indexRouter;