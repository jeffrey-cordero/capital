import { Budget, BudgetCategory } from "capital/budgets";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as budgetsService from "@/service/budgetsService";

/**
 * Fetches all budgets for the authenticated user (`GET /dashboard/budgets`)
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object containing `user_id` in locals
 * @returns {Promise<Response>} The service response for the fetch request
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => budgetsService.fetchBudgets(res.locals.user_id))
);

/**
 * Creates either a new budget category or budget entry (`POST /dashboard/budgets` or
 * `POST /dashboard/budgets/category`). If the request path includes `"category"`, a new budget
 * category is created. Otherwise, a new budget is created for an existing budget category.
 *
 * @param {Request} req - Express request object containing budget data in body (`Budget & BudgetCategory` or `Budget`)
 * @param {Response} res - Express response object containing `user_id` in locals
 * @returns {Promise<Response>} The service response for the creation request
 */
export const POST = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;

   if (req.path === "/budgets/category") {
      // Create a new budget category with it's initial budget record
      return submitServiceRequest(res,
         async() => budgetsService.createBudgetCategory(user_id, req.body as Budget & BudgetCategory)
      );
   } else {
      // Create a new budget for a specific budget category
      const budget: Budget = { ...req.body, budget_category_id: req.params.id };

      return submitServiceRequest(res,
         async() => budgetsService.createBudget(user_id, budget)
      );
   }
});

/**
 * Updates budget categories or individual budgets (`PUT /dashboard/budgets` or
 * `PUT /dashboard/budgets/category` or `PUT /dashboard/category/ordering`). If the request path
 * includes `"ordering"`, the category display order is updated. Otherwise, the budget category
 * details or a specific budget are updated based on the request path.
 *
 * @param {Request} req - Express request object containing update data (`{ categoryIds: string[] }` or `BudgetCategory` or `Budget`)
 * @param {Response} res - Express response object containing `user_id` in locals
 * @returns {Promise<Response>} The service response for the update request
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;

   if (req.params.id === "ordering") {
      // Update the ordering of budget categories
      return submitServiceRequest(res,
         async() => budgetsService.updateCategoryOrdering(user_id, req.body.categoryIds as string[])
      );
   } else if (req.path.includes("/budgets/budget")) {
      // Update a budget for a specific year/month
      const budget: Budget = { ...req.body, budget_category_id: req.params.id };

      return submitServiceRequest(res,
         async() => budgetsService.updateBudget(user_id, budget)
      );
   } else {
      // Update a budget category
      const category: BudgetCategory = { ...req.body, budget_category_id: req.params.id };

      return submitServiceRequest(res,
         async() => budgetsService.updateCategory(user_id, category)
      );
   }
});

/**
 * Deletes a budget category (`DELETE /dashboard/budgets/category/:id`)
 *
 * @param {Request} req - Express request object containing category ID in params
 * @param {Response} res - Express response object containing `user_id` in locals
 * @returns {Promise<Response>} The service response for the deletion request
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => budgetsService.deleteCategory(res.locals.user_id, req.params.id))
);