import { type Account, AccountHistory } from "capital/accounts";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import {
   createAccount,
   deleteAccount,
   deleteAccountHistory,
   fetchAccounts,
   updateAccount,
   updateAccountsOrdering
} from "@/service/accountsService";

export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, () => fetchAccounts(res.locals.user_id))
);

export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, () => createAccount(res.locals.user_id, req.body as Account))
);

export const PUT = asyncHandler(async(req: Request, res: Response) => {
   // Handle accounting ordering or details/history updates
   const user_id = res.locals.user_id;

   if (req.params.id === "ordering") {
      // Update accounts ordering
      return submitServiceRequest(res, () => updateAccountsOrdering(user_id, (req.body.accounts ?? []) as string[]));
   } else {
      // Update account details or history
      const account = req.body as Partial<Account & AccountHistory>;
      account.account_id = req.params.id;

      return submitServiceRequest(res,
         () => updateAccount(account.last_updated ? "history" : "details", user_id,  account)
      );
   }
});

export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   // Handle deleting account history records or the entire account
   const user_id = res.locals.user_id;
   const account_id = req.params.id;

   if (req.body.last_updated) {
      const { last_updated } = req.body;

      return submitServiceRequest(res, () => deleteAccountHistory(user_id, account_id, last_updated));
   } else {
      return submitServiceRequest(res, () => deleteAccount(user_id, account_id));
   }
});