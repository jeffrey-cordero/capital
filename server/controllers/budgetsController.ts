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
   console.log(user_id);

   if (req.params.id === "category")  {
      // Create a new budget category
      return submitServiceRequest(res,
         async() => budgetsService.createBudgetCategory(user_id, req.body as Budget & BudgetCategory)
      );
   } else {
      // Create a new budget for a specific budget category
      return submitServiceRequest(res,
         async() => budgetsService.createBudget(user_id, req.body as Budget)
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
   } else {
      // Update a budget category
      return submitServiceRequest(res,
         async() => budgetsService.updateCategory(user_id, req.body as BudgetCategory)
      );
   }
});

export const DELETE = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => budgetsService.deleteCategory(res.locals.user_id, req.body.budget_category_id))
);