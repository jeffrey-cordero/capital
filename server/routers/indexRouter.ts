import express, { Request, Response } from "express";
import { sendSuccess } from "@/lib/response";

const indexRouter = express.Router();

/**
 * API health check endpoint - GET /
 */
indexRouter.get("/", async(_req: Request, res: Response) => {
   res.status(200).json(sendSuccess(res, 200, "Healthy REST API"));
});

export default indexRouter;