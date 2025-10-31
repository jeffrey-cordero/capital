import { Budget, BudgetCategory } from "capital/budgets";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as budgetsService from "@/services/budgetsService";

/**
 * Fetches all budgets for the authenticated user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with organized budgets data
 */
export const GET = asyncHandler(async(_: Request, res: Response) => {
   return submitServiceRequest(res, async() => budgetsService.fetchBudgets(res.locals.user_id));
});

/**
 * Creates a new budget category or budget entry
 *
 * @param {Request} req - Express request object with budget and/or category data
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with creation confirmation
 */
export const POST = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;

   if (req.path === "/budgets/category") {
      // Create a new budget category with it's initial budget record
      return submitServiceRequest(res, async() => budgetsService.createBudgetCategory(user_id, req.body));
   } else {
      // Create a new budget for a specific budget category
      const budget_category_id: string = req.params.id;
      const budget: Budget = { ...req.body, budget_category_id };

      return submitServiceRequest(res, async() => budgetsService.createBudget(user_id, budget));
   }
});

/**
 * Updates budget categories, ordering, or individual budgets
 *
 * @param {Request} req - Express request object with update data
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with update confirmation
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;

   if (req.params.id === "ordering") {
      // Update the ordering of budget categories
      const ordering: string[] = req.body.categoryIds;

      return submitServiceRequest(res, async() => budgetsService.updateCategoryOrdering(user_id, ordering));
   } else if (req.path.includes("/budgets/budget")) {
      // Update a budget for a specific year/month
      const budget_category_id: string = req.params.id;
      const budget: Budget = { ...req.body, budget_category_id };

      return submitServiceRequest(res, async() => budgetsService.updateBudget(user_id, budget));
   } else {
      // Update a budget category
      const budget_category_id: string = req.params.id;
      const category: BudgetCategory = { ...req.body, budget_category_id };

      return submitServiceRequest(res, async() => budgetsService.updateCategory(user_id, category));
   }
});

/**
 * Deletes a budget category
 *
 * @param {Request} req - Express request object with category ID
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with deletion confirmation
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const budget_category_id: string = req.params.id;

   return submitServiceRequest(res, async() => budgetsService.deleteCategory(user_id, budget_category_id));
});