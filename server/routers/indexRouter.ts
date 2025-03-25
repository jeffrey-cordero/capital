import express, { Request, Response } from "express";

const indexRouter = express.Router();

/**
 * API Health Testing Endpoint
 */
indexRouter.get("/", async(_req: Request, res: Response) => {
   res.sendStatus(204).end();
});

export default indexRouter;