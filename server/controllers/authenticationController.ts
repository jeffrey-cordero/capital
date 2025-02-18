import { User } from "capital-types/user";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { configureJWT } from "@/lib/api/authentication";
import { sendErrors, sendSuccess, ServiceResponse } from "@/lib/api/response";
import { fetchAuthentication, login } from "@/service/authenticationService";

export const LOGIN = asyncHandler(async(req: Request, res: Response) => {
   try {
      const { username, password } = req.body;
      const result: ServiceResponse = await login(username, password);

      if (result.code === 200) {
         // Configure JWT token for authentication purposes
         configureJWT(req, res, result.data as User);

         return sendSuccess(res, result.code, result.message, result.data);
      } else {
         return sendErrors(res, result.code, result.message, result.errors);
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export const LOGOUT = asyncHandler(async(req: Request, res: Response) => {
   try {
      // Clear the cookies
      res.clearCookie("token");
      res.clearCookie("connect.sid");

      // Destroy the express-session
      req.session.destroy((error: any) => {
         if (error) {
            throw error;
         }
      });

      return sendSuccess(res, 200, "Successfully logged out");
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export const GET = asyncHandler(async(req: Request, res: Response) => {
   try {
      const result: ServiceResponse = await fetchAuthentication(req.cookies.token);

      if (result.code === 200) {
         return sendSuccess(res, result.code, result.message, { authenticated: true });
      } else {
         return sendErrors(res, result.code, result.message, result.errors);
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});