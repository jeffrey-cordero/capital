import express from "express";

import * as accountsController from "@/controllers/accountsController";
import * as budgetsController from "@/controllers/budgetsController";
import * as dashboardController from "@/controllers/dashboardController";
import * as transactionsController from "@/controllers/transactionsController";
import { authenticateToken } from "@/lib/middleware";

const dashboardRouter = express.Router();

/**
 * JWT Middleware for token validation
 */
dashboardRouter.use(authenticateToken(true));

/**
 * GET /dashboard/
 */
dashboardRouter.get("/", dashboardController.GET);

/**
 * GET /dashboard/accounts
 */
dashboardRouter.get("/accounts", accountsController.GET);

/**
 * POST /dashboard/accounts
 *    req.body: Account
 */
dashboardRouter.post("/accounts", accountsController.POST);

/**
 * PUT /dashboard/accounts/:id
 *    req.params.id: Account ID || "ordering"
 *    req.body: Partial<Account> || { accountsIds: string[] }
 */
dashboardRouter.put("/accounts/:id", accountsController.PUT);

/**
 * DELETE /dashboard/accounts/:id
 *    req.params.id: Account ID
 */
dashboardRouter.delete("/accounts/:id", accountsController.DELETE);

/**
 * GET /dashboard/budgets
 */
dashboardRouter.get("/budgets", budgetsController.GET);

/**
 * POST /dashboard/budgets/category
 *    req.body: BudgetCategory & Budget
 */
dashboardRouter.post("/budgets/category", budgetsController.POST);

/**
 * POST /dashboard/budgets/budget/:id
 *    req.body: Budget
 *    req.params.id: Budget Category ID
 */
dashboardRouter.post("/budgets/budget/:id", budgetsController.POST);

/**
 * PUT /dashboard/budgets/budget/:id
 *    req.params.id: Budget Category ID
 *    req.body: Budget
 */
dashboardRouter.put("/budgets/budget/:id", budgetsController.PUT);

/**
 * PUT /dashboard/budgets/category/:id
 *    req.params.id: Budget Category ID || "ordering"
 *    req.body: BudgetCategory || { categoryIds: string[] }
 */
dashboardRouter.put("/budgets/category/:id", budgetsController.PUT);

/**
 * DELETE /dashboard/budgets/category/:id
 *    req.params.id: Budget Category ID
 */
dashboardRouter.delete("/budgets/category/:id", budgetsController.DELETE);

/**
 * GET /dashboard/transactions
 */
dashboardRouter.get("/transactions", transactionsController.GET);

/**
 * POST /dashboard/transactions
 *    req.body: Transaction
 */
dashboardRouter.post("/transactions", transactionsController.POST);

/**
 * PUT /dashboard/transactions/:id
 *    req.params.id: Transaction ID
 *    req.body: Partial<Transaction>
 */
dashboardRouter.put("/transactions/:id", transactionsController.PUT);

/**
 * DELETE /dashboard/transactions/:id
 *    req.params.id: Transaction ID || req.body: { transactionIds: string[] }
 */
dashboardRouter.delete("/transactions/:id", transactionsController.DELETE);

export default dashboardRouter;