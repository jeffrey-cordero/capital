import { User } from "capital-types/user";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { sendErrors, sendSuccess, ServiceResponse } from "@/lib/api/response";
import { createUser } from "@/service/userService";

export const POST = asyncHandler(async(req: Request, res: Response) => {
   try {
      const user = req.body as User;
      const result: ServiceResponse = await createUser(req, res, user);

      if (result.code === 200) {
         return sendSuccess(res, result.code, result.message);
      } else {
         // Invalid user fields or account conflict(s)
         return sendErrors(res, result.code, result.message, result.errors);
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});

export const PUT = asyncHandler(async(req: Request, res: Response) => {
   try {
      return sendSuccess(res, 200, "Updating user awaits implementation");
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});

export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   try {
      return sendSuccess(res, 200, "Deleting user awaits implementation");
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});