import express from "express";
import { sendSuccess } from "@/controllers/api/response";
import { Request, Response } from "express";

const indexRouter = express.Router();

indexRouter.get("/", async (req: Request, res: Response) => {
   console.log(req);
   return sendSuccess(res, 200, "API is running");
});

export default indexRouter;