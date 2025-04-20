import { type Account } from "capital/accounts";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as accountsService from "@/services/accountsService";

/**
 * Fetches all financial accounts for the authenticated user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with user's accounts
 */
export const GET = asyncHandler(async(req: Request, res: Response) => {
   return submitServiceRequest(res, async() => accountsService.fetchAccounts(res.locals.user_id));
});

/**
 * Creates a new financial account for the authenticated user
 *
 * @param {Request} req - Express request object with account details
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with creation confirmation
 */
export const POST = asyncHandler(async(req: Request, res: Response) => {
   return submitServiceRequest(res, async() => accountsService.createAccount(res.locals.user_id, req.body));
});

/**
 * Updates account details or changes account ordering
 *
 * @param {Request} req - Express request object with account update data
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with update confirmation
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;

   if (req.params.id === "ordering") {
      // Update accounts ordering
      const ordering: string[] = req.body.accountsIds;

      return submitServiceRequest(res, async() => accountsService.updateAccountsOrdering(user_id, ordering));
   } else {
      // Update account details
      const account_id: string = req.params.id;
      const account: Partial<Account> = { ...req.body, account_id };

      return submitServiceRequest(res, async() => accountsService.updateAccount(user_id, account));
   }
});

/**
 * Deletes a specific account
 *
 * @param {Request} req - Express request object with account ID
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with deletion confirmation
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const account_id: string = req.params.id;

   return submitServiceRequest(res, async() => accountsService.deleteAccount(user_id, account_id));
});