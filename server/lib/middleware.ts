import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { logger } from "@/lib/logger";
import { sendErrors } from "@/lib/response";

/**
 * Sets a JWT token in a cookie with 24-hour expiration
 *
 * @param {Response} res - Express response object
 * @param {string} user_id - User ID to include in token
 */
export function configureToken(res: Response, user_id: string): void {
   // Generate JWT token
   const token = jwt.sign({ user_id: user_id }, process.env.SESSION_SECRET || "", { expiresIn: "24h" });

   // Store token in HTTP-only cookie
   res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24,
      secure: process.env.NODE_ENV === "production"
   });
}

/**
 * Authenticates requests using the JWT token within the HTTP-only cookie,
 * attaching the `user_id` to res.locals on successful authentication.
 *
 * @param {boolean} required - Whether authentication is required for this endpoint
 * @returns {Function} Express middleware function
 */
export function authenticateToken(required: boolean) {
   // eslint-disable-next-line consistent-return
   return (req: Request, res: Response, next: NextFunction) => {
      // Get token from cookies
      const token = req.cookies.token;

      if (!token && required) {
         return sendErrors(res, 401);
      } else if (token && !required) {
         return sendErrors(res, 302);
      } else if (required) {
         try {
            // Verify token
            const user = jwt.verify(token, process.env.SESSION_SECRET || "") as any;

            // Make user ID available to further route handlers
            res.locals.user_id = user.user_id;
            next();
         } catch (error: any) {
            if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
               // Clear invalid token
               res.clearCookie("token");
            } else {
               // Log unexpected errors
               logger.error(error.stack);
            }

            return sendErrors(res, 403);
         }
      } else {
         // Authentication not required
         next();
      }
   };
}