import { type Account } from "capital/accounts";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as accountsService from "@/service/accountsService";

/**
 * Handles GET requests for fetching all financial accounts for a user.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the fetch request
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => accountsService.fetchAccounts(res.locals.user_id))
);

/**
 * Handles POST requests for creating a new financial account for a user.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the creation request
 */
export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => accountsService.createAccount(res.locals.user_id, req.body as Account))
);

/**
 * Handles PUT requests for updating account details or accounts ordering.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the update request
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;

   if (req.params.id === "ordering") {
      // Update accounts ordering
      return submitServiceRequest(res,
         async() => accountsService.updateAccountsOrdering(user_id, (req.body.accountsIds as string[]))
      );
   } else {
      // Update account details
      const account: Partial<Account> = { ...req.body, account_id: req.params.id };

      return submitServiceRequest(res,
         async() => accountsService.updateAccount(user_id, account)
      );
   }
});

/**
 * Handles DELETE requests for deleting an account.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the deletion request
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => accountsService.deleteAccount(res.locals.user_id, req.params.id))
);