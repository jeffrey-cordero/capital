import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { configureJWT } from "@/lib/api/authentication";
import { sendErrors, sendSuccess, ServiceResponse } from "@/lib/api/response";
import { login, fetchAuthentication } from "@/service/authenticationService";
import { User } from "capital-types/user";

export const LOGIN = asyncHandler(async (req: Request, res: Response) => {
   const { username, password } = req.body;
   const result: ServiceResponse = await login(username, password);

   if (result.code === 200) {
      // Configure JWT token for a successful login
      configureJWT(req, res, result.data as User);

      return sendSuccess(res, result.code, result.message, result.data);
   } else {
      return sendErrors(res, result.code, result.message, result.errors);
   }
});

export const LOGOUT = asyncHandler(async (req: Request, res: Response) => {
   try {
      res.clearCookie("token");
      res.clearCookie("connect.sid");

      // Destroy the session
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

export const GET = asyncHandler(async (req: Request, res: Response) => {
   const result: ServiceResponse = await fetchAuthentication(req.cookies.token);

   if (result.code === 200) {
      return sendSuccess(res, result.code, result.message, result.data);
   } else {
      return sendErrors(res, result.code, result.message, result.errors);
   }
});