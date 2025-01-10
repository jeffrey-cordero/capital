import express from "express";
import { authenticateJWT } from "@/session";

import stocksController from "@/controllers/home/stocks";
import storiesController from "@/controllers/home/stories";

const homeRouter = express.Router();

homeRouter.get("/stocks", authenticateJWT(true), stocksController);
homeRouter.get("/stories", authenticateJWT(true), storiesController);

export default homeRouter;