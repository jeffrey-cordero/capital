import { User } from "capital-types/user";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { configureJWT } from "@/lib/api/authentication";
import { sendErrors, sendSuccess, ServiceResponse } from "@/lib/api/response";
import { createUser } from "@/service/userService";

export const POST = asyncHandler(async(req: Request, res: Response) => {
   try {
      const user = req.body as User;
      const result: ServiceResponse = await createUser(user);

      if (result.errors) {
         // Invalid user fields
         return sendErrors(res, result.code, result.message, result.errors as Record<string, string>);
      } else {
         // Configure JWT token for a successful registration
         configureJWT(req, res, user);

         return sendSuccess(res, result.code, result.message);
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export const PUT = asyncHandler(async(req: Request, res: Response) => {
   return sendSuccess(res, 200, "Updating user awaits implementation");
});

export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   return sendSuccess(res, 200, "Deleting user awaits implementation");
});