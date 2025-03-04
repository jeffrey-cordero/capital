import { type Account, AccountHistory } from "capital/accounts";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/api/controllers";
import { createAccount, deleteAccount, deleteAccountHistory, fetchAccounts, updateAccount, updateAccountsOrdering } from "@/service/accountsService";

export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(() => fetchAccounts(res.locals.user.user_id), res)
);

export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(() => createAccount(res.locals.user.user_id, req.body as Account), res)
);

export const PUT = asyncHandler(async(req: Request, res: Response) => {
   // Handle accounting ordering or details/history updates
   const user_id = res.locals.user.user_id;

   if (req.params.id === "ordering") {
      // Update accounts ordering
      return submitServiceRequest(() => updateAccountsOrdering(user_id, (req.body.accounts ?? []) as string[]), res);
   } else {
      // Update account details or history
      const account = req.body as Partial<Account & AccountHistory>;
      account.account_id = req.params.id;

      return submitServiceRequest(
         () => updateAccount(account.last_updated ? "history" : "details", user_id,  account), res
      );
   }
});

export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   // Handle deleting account history records or the entire account
   const user_id = res.locals.user.user_id;
   const account_id = req.params.id;

   console.log(user_id, account_id);

   if (req.body.last_updated) {
      const { last_updated } = req.body;

      return submitServiceRequest(() => deleteAccountHistory(user_id, account_id, last_updated), res);
   } else {
      return submitServiceRequest(() => deleteAccount(user_id, account_id), res);
   }
});