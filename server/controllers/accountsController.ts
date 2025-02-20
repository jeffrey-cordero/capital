import { type Account } from "capital-types/accounts";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { sendErrors, sendSuccess, ServiceResponse } from "@/lib/api/response";

// Stub service methods
const createAccount = async(user_id: string, account: Account): Promise<ServiceResponse> => {
   // Temporary implementation
   return {
      code: 200,
      message: "Account created successfully",
      data: {
         account_id: "1234567890"
      }
   };
};

const updateAccount = async(user_id: string, account_id: string, account: Account): Promise<ServiceResponse> => {
   // Temporary implementation
   return {
      code: 200,
      message: "Account updated successfully"
   };
};

const updateAccountOrder = async(user_id: string, accounts: Account[]): Promise<ServiceResponse> => {
   // Temporary implementation
   return {
      code: 200,
      message: "Account order updated successfully"
   };
};

const deleteAccount = async(user_id: string, id: string): Promise<ServiceResponse> => {
   // Temporary implementation
   return {
      code: 200,
      message: "Account deleted successfully"
   };
};

// Controller implementation
export const GET = asyncHandler(async(req: Request, res: Response) => {
   return sendSuccess(res, 200, "Accounts Retrieved", {});
});

export const POST = asyncHandler(async(req: Request, res: Response) => {
   try {
      const account = req.body as Account;
      const result: ServiceResponse = await createAccount("", account);

      if (result.code === 200) {
         return sendSuccess(res, result.code, result.message, result.data);
      } else {
         return sendErrors(res, result.code, result.message, result.errors);
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});

export const PUT = asyncHandler(async(req: Request, res: Response) => {
   try {
      if (req.path.endsWith("/order")) {
         const accounts = req.body as Account[];
         const result = await updateAccountOrder("", accounts);

         return sendSuccess(res, result.code, result.message);
      } else {
         const account_id = req.params.id;
         const account = req.body as Account;

         const result = await updateAccount("", account_id, account);

         if (result.code === 200) {
            return sendSuccess(res, result.code, result.message);
         } else {
            return sendErrors(res, result.code, result.message, result.errors);
         }
      }
   } catch (error: any) {
      console.error(error);
      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});

export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   try {
      const account_id = req.params.id;
      const result = await deleteAccount("", account_id);

      return sendSuccess(res, result.code, result.message);
   } catch (error: any) {
      console.error(error);
      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});