import { ServerResponse } from "capital-types/server";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { sendErrors, sendSuccess } from "@/lib/api/response";
import { authenticateUser, logoutUser } from "@/service/authenticationService";

export const LOGIN = asyncHandler(async(req: Request, res: Response) => {
   try {
      const { username, password } = req.body;
      const result: ServerResponse = await authenticateUser(res, username, password);

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

export const LOGOUT = asyncHandler(async(req: Request, res: Response) => {
   try {
      const result: ServerResponse = await logoutUser(req, res);

      return sendSuccess(res, result.status, result.message);
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});