import express from "express";
import { Request, Response } from "express";

const indexRouter = express.Router();

indexRouter.get("/", async (_req: Request, res: Response) => { res.sendStatus(204) });

export default indexRouter;