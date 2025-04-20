import express from "express";

import * as accountsController from "@/controllers/accountsController";
import * as budgetsController from "@/controllers/budgetsController";
import * as dashboardController from "@/controllers/dashboardController";
import * as transactionsController from "@/controllers/transactionsController";
import * as userController from "@/controllers/userController";
import { authenticateToken } from "@/lib/middleware";

const dashboardRouter = express.Router();

/**
 * Protects all dashboard routes with JWT authentication
 *
 * @requires {string} req.cookies.token - Authentication token
 */
dashboardRouter.use(authenticateToken(true));

/**
 * Retrieves dashboard overview data - GET /dashboard/
 */
dashboardRouter.get("/", dashboardController.GET);

/**
 * Fetches all user accounts - GET /dashboard/accounts
 */
dashboardRouter.get("/accounts", accountsController.GET);

/**
 * Creates a new user account - POST /dashboard/accounts
 *
 * @requires {Account} req.body - User account data
 */
dashboardRouter.post("/accounts", accountsController.POST);

/**
 * Updates a user account or a series of user account orderings - PUT /dashboard/accounts/:id
 *
 * @param {string} id - User account ID or "ordering"
 * @requires {Partial<Account>|{accountsIds: string[]}} req.body - User account data or UUIDs
 */
dashboardRouter.put("/accounts/:id", accountsController.PUT);

/**
 * Deletes a user account - DELETE /dashboard/accounts/:id
 *
 * @param {string} id - User account ID
 */
dashboardRouter.delete("/accounts/:id", accountsController.DELETE);

/**
 * Fetches all budget categories and their respective budget goals - GET /dashboard/budgets
 */
dashboardRouter.get("/budgets", budgetsController.GET);

/**
 * Creates a budget category - POST /dashboard/budgets/category
 *
 * @requires {BudgetCategory & Budget} req.body - Budget category and initial budget goal data
 */
dashboardRouter.post("/budgets/category", budgetsController.POST);

/**
 * Creates a budget goal for a budget category - POST /dashboard/budgets/budget/:id
 *
 * @param {string} id - Budget category ID
 * @requires {Budget} req.body - Budget goal data
 */
dashboardRouter.post("/budgets/budget/:id", budgetsController.POST);

/**
 * Updates a budget goal for a budget category - PUT /dashboard/budgets/budget/:id
 *
 * @param {string} id - Budget category ID
 * @requires {Budget} req.body - Budget goal data
 */
dashboardRouter.put("/budgets/budget/:id", budgetsController.PUT);

/**
 * Updates a budget category or a series of budget category orderings - PUT /dashboard/budgets/category/:id
 *
 * @param {string} id - Budget category ID or "ordering"
 * @requires {BudgetCategory|{categoryIds: string[]}} req.body - Budget category data or UUIDs
 */
dashboardRouter.put("/budgets/category/:id", budgetsController.PUT);

/**
 * Deletes a budget category - DELETE /dashboard/budgets/category/:id
 *
 * @param {string} id - Budget category ID
 */
dashboardRouter.delete("/budgets/category/:id", budgetsController.DELETE);

/**
 * Fetches all transactions - GET /dashboard/transactions
 */
dashboardRouter.get("/transactions", transactionsController.GET);

/**
 * Creates a new transaction - POST /dashboard/transactions
 *
 * @requires {Transaction} req.body - Transaction data
 */
dashboardRouter.post("/transactions", transactionsController.POST);

/**
 * Updates a transaction - PUT /dashboard/transactions/:id
 *
 * @param {string} id - Transaction ID
 * @requires {Partial<Transaction>} req.body - Transaction data to update
 */
dashboardRouter.put("/transactions/:id", transactionsController.PUT);

/**
 * Deletes one or more transactions - DELETE /dashboard/transactions/:id
 *
 * @param {string} id - Transaction ID
 * @requires {string[]|undefined} [req.body.transactionIds] - Optional transaction UUIDs for batch deletions
 */
dashboardRouter.delete("/transactions/:id", transactionsController.DELETE);

/**
 * Fetches user account settings - GET /dashboard/settings
 */
dashboardRouter.get("/settings", userController.GET);

export default dashboardRouter;