import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendErrors, sendSuccess } from "@/lib/api/response";
import { authenticate } from "@/repository/userRepository";
import { configureJWT } from "@/session";

export const login = asyncHandler(async (req: Request, res: Response) => {
   try {
      const { username, password } = req.body;
      const user = await authenticate(username, password);

      if (user === null) {
         return sendErrors(res, 401, "Invalid credentials", {
            username: "Invalid credentials",
            password: "Invalid credentials",
         });
      } else {
         // Configure JWT token
         configureJWT(req, res, user);

         return sendSuccess(res, 200, "Login successful", { token: req.session.token });
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
   try {
     // Clear the JWT token and session cookies from the client
     res.clearCookie("token");
     res.clearCookie('connect.sid');
 
     // Destroy the session
     req.session.destroy((error: any) => {
       if (error) {
         throw error;
       }
     });
     
     return sendSuccess(res, 200, "Logout successful");
   } catch (error: any) {
     console.error(error);
 
     return sendErrors(res, 500, "Internal server error", {
       system: error.message,
     });
   }
});

export const fetchAuthentication = asyncHandler(async (req: Request, res: Response) => {
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
