import { type Account, AccountHistory } from "capital-types/accounts";
import { ServerResponse } from "capital-types/server";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { sendErrors, sendSuccess } from "@/lib/api/response";
import { createAccount, deleteAccount, fetchAccounts, updateAccount, updateAccountsOrdering } from "@/service/accountsService";

export const GET = asyncHandler(async(req: Request, res: Response) => {
   try {
      const user_id = res.locals.user.user_id;
      const result = await fetchAccounts(user_id);

      return sendSuccess(res, result.status, result.message, result.data);
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});

export const POST = asyncHandler(async(req: Request, res: Response) => {
   try {
      const user_id = res.locals.user.user_id;
      const account = req.body as Account;
      const result: ServerResponse = await createAccount(user_id, account);

      if (result.status === 200) {
         return sendSuccess(res, result.status, result.message, result.data);
      } else {
         return sendErrors(res, result.status, result.message, result.errors);
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});

export const PUT = asyncHandler(async(req: Request, res: Response) => {
   try {
      const user_id = res.locals.user.user_id;

      if (req.path.endsWith("/order")) {
         // Update accounts ordering
         const accounts = req.body as Partial<Account>[];
         const result: ServerResponse = await updateAccountsOrdering(user_id, accounts);

         if (result.status === 200) {
            return sendSuccess(res, result.status, result.message);
         } else {
            return sendErrors(res, result.status, result.message, result.errors);
         }
      } else {
         // Update account details or history
         const account = req.body as Partial<Account & AccountHistory>;
         const result = await updateAccount(req.body.last_updated ? "history" : "details", user_id, account);

         if (result.status === 200) {
            return sendSuccess(res, result.status, result.message);
         } else {
            return sendErrors(res, result.status, result.message, result.errors);
         }
      }
   } catch (error: any) {
      console.error(error);
      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});

export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   try {
      const user_id = res.locals.user.user_id;
      const account_id = req.body.account_id;
      const result = await deleteAccount(user_id, account_id);

      return sendSuccess(res, result.status, result.message);
   } catch (error: any) {
      console.error(error);
      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});