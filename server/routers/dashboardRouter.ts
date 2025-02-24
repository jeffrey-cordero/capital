import express from "express";

import * as accountsController from "@/controllers/accountsController";
import * as dashboardController from "@/controllers/dashboardController";
import { authenticateToken } from "@/lib/authentication/middleware";

const dashboardRouter = express.Router();

dashboardRouter.get("/", authenticateToken(true), dashboardController.GET);

dashboardRouter.get("/accounts", authenticateToken(true), accountsController.GET);
dashboardRouter.post("/accounts", authenticateToken(true), accountsController.POST);
dashboardRouter.put("/accounts", authenticateToken(true), accountsController.PUT);
dashboardRouter.put("/accounts/order", authenticateToken(true), accountsController.PUT);
dashboardRouter.delete("/accounts", authenticateToken(true), accountsController.DELETE);

export default dashboardRouter;