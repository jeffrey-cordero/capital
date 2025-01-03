import express from "express";
const indexRouter = express.Router();
import { sendSuccess } from "../controllers/api/response";
import { Request, Response } from "express";

indexRouter.get("/", (req: Request, res: Response) => {
   return sendSuccess(res, "REST API is running", {});
});

export default indexRouter;