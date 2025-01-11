import express from "express";
import { authenticateJWT } from "@/server/session";

import { fetchStocks, fetchStories } from "@/server/controllers/home";

const homeRouter = express.Router();

homeRouter.get("/stocks", authenticateJWT(true), fetchStocks);
homeRouter.get("/stories", authenticateJWT(true), fetchStories);

export default homeRouter;