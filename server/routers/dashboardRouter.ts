import express from "express";

import * as accountsController from "@/controllers/accountsController";
import * as dashboardController from "@/controllers/dashboardController";
import { authenticateJWT } from "@/lib/authentication/middleware";

const dashboardRouter = express.Router();

dashboardRouter.get("/", authenticateJWT(true), dashboardController.GET);

dashboardRouter.get("/accounts", authenticateJWT(true), accountsController.GET);
dashboardRouter.post("/accounts", authenticateJWT(true), accountsController.POST);
dashboardRouter.put("/accounts/order", authenticateJWT(true), accountsController.PUT);
dashboardRouter.put("/accounts/:id", authenticateJWT(true), accountsController.PUT);
dashboardRouter.delete("/accounts/:id", authenticateJWT(true), accountsController.DELETE);

export default dashboardRouter;