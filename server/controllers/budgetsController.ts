import { Budget, BudgetCategory } from "capital/budgets";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as budgetsService from "@/service/budgetsService";

/**
 * Fetches all budgets for the authenticated user (GET /dashboard/budgets)
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object containing user_id in locals
 * @returns {Promise<Response>} Response containing user's budgets - 200 (budgets: OrganizedBudgets)
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => budgetsService.fetchBudgets(res.locals.user_id))
);

/**
 * Creates either a new budget category or budget entry
 *
 * @param {Request} req - Express request object containing budget data
 * @param {Response} res - Express response object containing user_id in locals
 * @returns {Promise<Response>} Response after creation - 201 ({ budget_category_id: string } or { success: true }), 204 (no content), 400, or 404
 * @description
 * - If `req.path` includes "category", creates new budget category with initial budget (POST /dashboard/budgets/category)
 *    - `req.body` should be of type `Budget & BudgetCategory`
 * - Otherwise, creates new budget for existing category using `req.params.id` (POST /dashboard/budgets/budget/:id)
 *    - `req.body` should be of type `Budget`
 *    - `req.params.id` should be the `budget_category_id` of the existing budget category
 */
export const POST = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;

   if (req.path.includes("category")) {
      // Create a new budget category with initial budget
      return submitServiceRequest(res,
         async() => budgetsService.createBudgetCategory(user_id, req.body as Budget & BudgetCategory)
      );
   } else {
      // Create a new budget for a specific budget category
      const budget: Budget = {
         ...req.body,
         budget_category_id: req.params.id
      };

      return submitServiceRequest(res,
         async() => budgetsService.createBudget(user_id, budget)
      );
   }
});

/**
 * Updates budget categories or individual budgets
 *
 * @param {Request} req - Express request object containing update data
 * @param {Response} res - Express response object containing user_id in locals
 * @returns {Promise<Response>} Response after update - 204 (no content), 400, or 404
 * @description
 * - If `req.params.id` is "ordering", updates category display order (PUT /dashboard/budgets/ordering)
 *    - `req.body` should be of type `{ categories: string[] }`
 * - If `req.path` includes "/budgets/budget", updates specific budget (PUT /dashboard/budgets/budget/:id)
 *    - `req.body` should be of type `Budget`
 * - Otherwise, updates budget category details (PUT /dashboard/budgets/category/:id)
 *    - `req.body` should be of type `BudgetCategory`
 *    - `req.params.id` should be the `budget_category_id` of the existing budget category for non-ordering updates
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;

   if (req.params.id === "ordering") {
      // Update the ordering of budget categories
      return submitServiceRequest(res,
         async() => budgetsService.updateCategoryOrdering(user_id, req.body.categories as string[])
      );
   } else if (req.path.includes("/budgets/budget")) {
      // Update a budget for a specific year/month
      const budget: Budget = {
         ...req.body,
         budget_category_id: req.params.id
      };

      return submitServiceRequest(res,
         async() => budgetsService.updateBudget(user_id, budget)
      );
   } else {
      // Update a budget category
      const category: BudgetCategory = {
         ...req.body,
         budget_category_id: req.params.id
      };

      return submitServiceRequest(res,
         async() => budgetsService.updateCategory(user_id, category)
      );
   }
});

/**
 * Deletes a budget category (DELETE /dashboard/budgets/category/:id)
 *
 * @param {Request} req - Express request object containing category ID in params
 * @param {Response} res - Express response object containing user_id in locals
 * @returns {Promise<Response>} Response after deletion - 204 (no content), 400, or 404
 * @description
 * - Deletes a budget category and all associated budgets
 * - `req.params.id` should be the `budget_category_id` of the existing budget category
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => budgetsService.deleteCategory(res.locals.user_id, req.params.id))
);