import express from "express";
import { authenticateJWT } from "@/lib/api/authentication";

import * as controller from "@/controllers/homeController";

const homeRouter = express.Router();

homeRouter.get("/marketTrends", authenticateJWT(true), controller.MARKET_TRENDS);
homeRouter.get("/news", authenticateJWT(true), controller.NEWS);

export default homeRouter;