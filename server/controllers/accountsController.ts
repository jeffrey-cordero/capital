import { type Account, AccountHistory } from "capital/accounts";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as accountsService from "@/service/accountsService";

/**
 * Fetches all financial accounts for a user (`GET /dashboard/accounts`)
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object containing `user_id` in locals
 * @returns {Promise<Response>} The service response for the fetch request
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => accountsService.fetchAccounts(res.locals.user_id))
);

/**
 * Creates a new financial account for a user (`POST /dashboard/accounts`)
 *
 * @param {Request} req - The request object containing account data in body (`Account`)
 * @param {Response} res - The response object containing `user_id` in locals
 * @returns {Promise<Response>} The service response for the creation request
 */
export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => accountsService.createAccount(res.locals.user_id, req.body as Account))
);

/**
 * Updates account information based on the request parameters (`PUT /dashboard/accounts/:id` or
 * `PUT /dashboard/accounts/ordering`). If the request path includes "ordering", then account
 * ordering is updated. Otherwise, account details or history records are updated based on the
 * presence of `last_updated`.
 *
 * @param {Request} req - The request object containing update data in body (`{ accountsIds: string[] }` or `Partial<Account & AccountHistory>`)
 * @param {Response} res - The response object containing `user_id` in locals
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
      // Update account details or history records based on presence of last_updated
      const account: Partial<Account & AccountHistory> = { ...req.body, account_id: req.params.id };

      return submitServiceRequest(res,
         async() => accountsService.updateAccount(account.last_updated ? "history" : "details", user_id, account)
      );
   }
});

/**
 * Deletes account data based on the request parameters (`DELETE /dashboard/accounts/:id`). If
 * the `req.body.last_updated` is present, then a specific history record is deleted. Otherwise,
 * the entire account and its history are deleted.
 *
 * @param {Request} req - The request object containing `account_id` in params and `last_updated` in body
 * @param {Response} res - The response object containing `user_id` in locals
 * @returns {Promise<Response>} The service response for the deletion request
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