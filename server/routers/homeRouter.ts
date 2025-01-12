import express from "express";
import { authenticateJWT } from "@/session";

import { fetchStocks, fetchNews } from "@/controllers/homeController";

const homeRouter = express.Router();

homeRouter.get("/stocks", authenticateJWT(true), fetchStocks);
homeRouter.get("/news", authenticateJWT(true), fetchNews);

export default homeRouter;