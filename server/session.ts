import jwt from "jsonwebtoken";
import session from "express-session";
import { NextFunction, Request, Response } from "express";
import { sendErrors } from "@/lib/api/response";

import { User } from "capital-types/user"

declare module 'express-session' {
   export interface SessionData {
      token: string | undefined;
   }
}

function configureJWT(req: Request, res: Response, user: User): void {
   // JWT token generation
   const secret: string = process.env.SESSION_SECRET || "";
   const token = jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: "6h" });

   // JWT token configuration
   res.cookie("token", token, { httpOnly: true });
   req.session.token = token;
   req.session.save();
}

function authenticateJWT(required: boolean) {
   // JWT validation middleware
   return (req: Request, res: Response, next: NextFunction) => {
      // Get the token from the session or cookies
      const token = req.session.token || req.cookies.token;

      // If token is required but missing, return 401 Unauthorized
      if (!token && required) {
         return sendErrors(res, 401, "Access Denied: No Token Provided")
      } else if (token && !required) {
         // If token is not required but provided, return 403 Forbidden
         return sendErrors(res, 403, "Access Denied: Token Not Required");
      } else if (required) {
         try {
            const secret: string = process.env.SESSION_SECRET || "";
   
            // Verify the JWT token
            const decoded = jwt.verify(token, secret);
   
            // Store JWT token in session for future requests (to prevent cache miss)
            if (required && !req.session.token) {
               req.session.token = token;
            }
   
            // Attach decoded user data to req.user for subsequent handlers
            res.locals.user = decoded;

            // Proceed to the next middleware or route handler
            next();
         } catch (error) {
            console.error(error);

            if (error instanceof jwt.TokenExpiredError) {
               // Clear the expired token from the client
               res.clearCookie("token");
               res.clearCookie('connect.sid');
            }
            
            // If the token is invalid, return 403 Forbidden
            return sendErrors(res, 403, "Access Denied: Invalid Token");
         }
      } else {
         // Proceed to the next middleware or route handler
        next();
      }
   };
}

export { session, configureJWT, authenticateJWT };