import express from "express";

import * as accountsController from "@/controllers/accountsController";
import * as dashboardController from "@/controllers/dashboardController";
import { authenticateToken } from "@/lib/middleware";

const dashboardRouter = express.Router();

// JWT Middleware for token validation
dashboardRouter.use(authenticateToken(true));

// Dashboard
dashboardRouter.get("/", authenticateToken(true), dashboardController.GET);

// Accounts
dashboardRouter.get("/accounts", accountsController.GET);
dashboardRouter.post("/accounts", accountsController.POST);
dashboardRouter.put("/accounts/:id", accountsController.PUT);
dashboardRouter.delete("/accounts/:id", accountsController.DELETE);

export default dashboardRouter;