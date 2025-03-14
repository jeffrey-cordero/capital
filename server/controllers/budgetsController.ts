import { Budget, BudgetCategory } from "capital/budgets";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as budgetsService from "@/service/budgetsService";

export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => budgetsService.fetchBudgets(res.locals.user_id))
);

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

export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;

   if (req.params.id === "ordering") {
      // Update the ordering of budget categories
      return submitServiceRequest(res,
         async() => budgetsService.updateCategoryOrdering(user_id, (req.body.categories ?? []) as string[])
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

export const DELETE = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => budgetsService.deleteCategory(res.locals.user_id, req.params.id))
);