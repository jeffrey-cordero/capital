import express from "express";

import * as controller from "@/controllers/homeController";
import { authenticateJWT } from "@/lib/authentication/utils";

const homeRouter = express.Router();

homeRouter.get("/marketTrends", authenticateJWT(true), controller.MARKET_TRENDS);
homeRouter.get("/news", authenticateJWT(true), controller.NEWS);

export default homeRouter;