import express from "express";

import * as accountsController from "@/controllers/accountsController";
import * as budgetsController from "@/controllers/budgetsController";
import * as dashboardController from "@/controllers/dashboardController";
import { authenticateToken } from "@/lib/middleware";

const dashboardRouter = express.Router();

/**
 * JWT Middleware for token validation
 */
dashboardRouter.use(authenticateToken(true));

/**
 * Dashboard router for handling user dashboard requests
 */
dashboardRouter.get("/", authenticateToken(true), dashboardController.GET);

/**
 * Accounts router for handling user accounts requests
 */
dashboardRouter.get("/accounts", accountsController.GET);
dashboardRouter.post("/accounts", accountsController.POST);
dashboardRouter.put("/accounts/:id", accountsController.PUT);
dashboardRouter.delete("/accounts/:id", accountsController.DELETE);

/**
 * Budgets router for handling user budgets requests
 */
dashboardRouter.get("/budgets", budgetsController.GET);
dashboardRouter.post("/budgets/category", budgetsController.POST);
dashboardRouter.post("/budgets/budget/:id", budgetsController.POST);
dashboardRouter.put("/budgets/budget/:id", budgetsController.PUT);
dashboardRouter.put("/budgets/category/:id", budgetsController.PUT);
dashboardRouter.delete("/budgets/category/:id", budgetsController.DELETE);

export default dashboardRouter;