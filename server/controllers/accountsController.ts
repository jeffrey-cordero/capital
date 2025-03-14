import { type Account, AccountHistory } from "capital/accounts";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as accountsService from "@/service/accountsService";

export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => accountsService.fetchAccounts(res.locals.user_id))
);

export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => accountsService.createAccount(res.locals.user_id, req.body as Account))
);

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