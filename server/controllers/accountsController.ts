import { type Account, AccountHistory } from "capital-types/accounts";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/api/controllers";
import { createAccount, deleteAccount, fetchAccounts, updateAccount, updateAccountsOrdering } from "@/service/accountsService";

export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(() => fetchAccounts(res.locals.user.user_id), res)
);

export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(() => createAccount(res.locals.user.user_id, req.body as Account), res)
);

export const PUT = asyncHandler(async(req: Request, res: Response) => {
   // Handle accounting ordering or details/history updates
   const user_id = res.locals.user.user_id;

   if (req.path.endsWith("/order")) {
      // Update accounts ordering
      return submitServiceRequest(() => updateAccountsOrdering(user_id, (req.body.accounts ?? []) as string[]), res);
   } else {
      // Update account details or history
      return submitServiceRequest(
         () => updateAccount(req.body.last_updated ? "history" : "details", user_id,  req.body as Partial<Account & AccountHistory>), res
      );
   }
});

export const DELETE = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(() => deleteAccount(res.locals.user.user_id, req.body.account_id), res)
);