import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendSuccess } from "@/controllers/api/response";

const status = asyncHandler(async (req: Request, res: Response) => {
   // Route to fetch the authentication status of the user
   try {
      jwt.verify(req.session.token || req.cookies.token, process.env.SESSION_SECRET || "");

      return sendSuccess(res, 200, "Authenticated status retrieved", { authenticated: true });
   } catch (error: any) {
      // Error caught during JWT verification, implying the user is not authenticated
      if (error instanceof TokenExpiredError) {
         // Clear the JWT token and session cookies from the client
         res.clearCookie("token");
         res.clearCookie('connect.sid');

         return sendSuccess(res, 200, "Authenticated status retrieved", { authenticated: false });
      } else {
         // Log non JWT-related errors to the console
         !(error instanceof JsonWebTokenError) && console.error(error);
         
         return sendSuccess(res, 200, "Authenticated status retrieved", { authenticated: false });
      }
   }
});

export default status;