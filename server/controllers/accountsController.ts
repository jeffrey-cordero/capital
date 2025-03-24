import { type Account, AccountHistory } from "capital/accounts";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as accountsService from "@/service/accountsService";

/**
 * Fetches all financial accounts for a user (GET /dashboard/accounts)
 *
 * @param {Request} req - The Express request object
 * @param {Response} res - The Express response object containing user_id in locals
 * @returns {Promise<Response>} Response after processing the request - 200 (accounts: Account[])
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => accountsService.fetchAccounts(res.locals.user_id))
);

/**
 * Creates a new financial account for a user (POST /dashboard/accounts)
 *
 * @param {Request} req - The Express request object containing account data in body
 * @param {Response} res - The Express response object containing user_id in locals
 * @returns {Promise<Response>} Response after processing the creation request - 201 (account_id: string) or 400
 * @description
 * - `req.body` should be of type `Account`
 */
export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => accountsService.createAccount(res.locals.user_id, req.body as Account))
);

/**
 * Updates account information based on the request parameters
 *
 * @param {Request} req - The Express request object containing update data
 * @param {Response} res - The Express response object containing user_id in locals
 * @returns {Promise<Response>} Response after processing the update request - 204 (no content), 400, or 404
 * @description
 * - If `req.params.id` is "ordering", updates the account display order (PUT /dashboard/accounts/ordering)
 *    - `req.body` should be of type `{ accounts: string[] }`
 * - Otherwise, updates either account details or history based on `last_updated` presence (PUT /dashboard/accounts/:id)
 *    - `req.body` should be of type `Partial<Account & AccountHistory>`
 *    - `req.params.id` should be the `account_id` of the existing account
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;

   if (req.params.id === "ordering") {
      // Update accounts ordering
      return submitServiceRequest(res,
         async() => accountsService.updateAccountsOrdering(user_id, (req.body.accounts ?? []) as string[])
      );
   } else {
      // Update account details or history records based on presence of last_updated
      const account: Partial<Account & AccountHistory> = {
         ...req.body,
         account_id: req.params.id
      };

      return submitServiceRequest(res,
         async() => accountsService.updateAccount(
            account.last_updated ? "history" : "details",
            user_id,
            account
         )
      );
   }
});

/**
 * Deletes account data based on the request parameters (DELETE /dashboard/accounts/:id)
 *
 * @param {Request} req - The Express request object containing account_id in params
 * @param {Response} res - The Express response object containing user_id in locals
 * @returns {Promise<Response>} Response after processing the deletion - 204 (no content), 400, 404, or 409
 * @description
 * - If `req.body.last_updated` is present, deletes specific history record
 *    - `req.body` should be of type `{ last_updated: string }`
 * - Otherwise, deletes entire account and its history
 * - `req.params.id` should be the `account_id` of the existing account
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   const account_id: string = req.params.id;
   const user_id: string = res.locals.user_id;

   if (req.body.last_updated) {
      // Delete a specific account history record
      return submitServiceRequest(res,
         async() => accountsService.deleteAccountHistory(user_id, account_id, req.body.last_updated)
      );
   } else {
      // Delete the entire account and all its history
      return submitServiceRequest(res,
         async() => accountsService.deleteAccount(user_id, account_id)
      );
   }
});