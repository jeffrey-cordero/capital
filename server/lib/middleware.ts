import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { logger } from "@/lib/logger";
import { sendErrors } from "@/lib/response";

/**
 * Configures the JWT token for the user
 *
 * @param {Response} res - Express response object
 * @param {string} user_id - User ID to include in the token
 * @description
 * - Generates a JWT token with a 24 hour expiration
 * - Stores the token in the client cookies with HTTPOnly and secure flags
 */
export function configureToken(res: Response, user_id: string): void {
   // Generate the JWT token
   const token = jwt.sign({ user_id: user_id }, process.env.SESSION_SECRET || "", { expiresIn: "24h" });

   // Store the JWT token in the client cookies
   res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24,
      secure: process.env.NODE_ENV === "production"
   });
}

/**
 * Middleware function to authenticate the user based on the JWT token
 *
 * @param {boolean} required - Whether the token is required for the endpoint
 * @returns {Function} Express middleware function
 * @description
 * - Checks if a token is present and valid
 * - Attaches the user ID to the request object for further processing (Next Function)
 * - Handles expired or invalid tokens by clearing the cookie and returning a 403 error
 */
export function authenticateToken(required: boolean): any {
   // eslint-disable-next-line consistent-return
   return (req: Request, res: Response, next: NextFunction) => {
      // Fetch the token from the request cookies
      const token = req.cookies.token;

      if (!token && required) {
         // Token present for this endpoint, but not provided
         return sendErrors(res, 401, "Access Denied: No Token Provided");
      } else if (token && !required) {
         // Token not required at this endpoint, but provided
         return sendErrors(res, 302, "Access Denied: Token Not Required");
      } else if (required) {
         try {
            // Verify the JWT token, handling expected thrown errors
            const user = jwt.verify(token, process.env.SESSION_SECRET || "") as any;

            // Attach the user ID for further request handlers
            res.locals.user_id = user.user_id;

            // Proceed to the next request handler
            next();
         } catch (error: any) {
            if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
               // Clear the expired or invalid authentication token cookies
               res.clearCookie("token");
            } else {
               // Unexpected JWT verification errors
               logger.error(error.stack);
            }

            return sendErrors(res, 403, "Access Denied: Invalid Token");
         }
      } else {
         // Proceed to the next middleware or route handler
         next();
      }
   };
}