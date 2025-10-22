import { HTTP_STATUS } from "capital/server";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { logger } from "@/lib/logger";
import { sendErrors, sendSuccess } from "@/lib/response";

/**
 * Token expiration constants in milliseconds
 */
export const TOKEN_EXPIRATIONS = {
   ACCESS_TOKEN: 60 * 60 * 1000, // 1 hour
   REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000 // 7 days
} as const;

/**
 * Sets JWT access and refresh tokens in HTTP-only cookies
 *
 * Access token expires in 24 hours, refresh token in 7 days.
 * Tokens are rotated on each refresh for security.
 *
 * @param {Response} res - Express response object
 * @param {string} user_id - User ID to include in token
 * @param {number} secondsUntilExpire - Seconds until refresh token expires
 */
export function configureToken(res: Response, user_id: string, secondsUntilExpire?: number): void {
   // Store access and refresh tokens in HTTP-only cookies
   const access_token = jwt.sign({ user_id: user_id }, process.env.SESSION_SECRET || "", { expiresIn: "60min" });
   res.cookie("access_token", access_token, {
      httpOnly: true,
      sameSite: "none",
      maxAge: TOKEN_EXPIRATIONS.ACCESS_TOKEN,
      secure: true
   });

   const refresh_token = jwt.sign({ user_id: user_id }, process.env.SESSION_SECRET || "", { expiresIn: secondsUntilExpire || "7d" });
   res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      sameSite: "none",
      maxAge: (secondsUntilExpire || TOKEN_EXPIRATIONS.REFRESH_TOKEN),
      secure: true,
      path: "/api/v1/authentication/refresh"
   });
}

/**
 * Clears both access and refresh token cookies
 *
 * Used during logout to remove authentication tokens
 *
 * @param {Response} res - Express response object
 */
export function clearTokens(res: Response): void {
   res.clearCookie("access_token", {
      httpOnly: true,
      sameSite: "none",
      secure: true
   });

   res.clearCookie("refresh_token", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/api/v1/authentication/refresh"
   });
}

/**
 * Authenticates requests using the JWT access token from HTTP-only cookie
 *
 * Attaches user_id to res.locals on successful authentication.
 * Returns `HTTP_STATUS.UNAUTHORIZED` with `refreshable` flag for expired tokens.
 *
 * @param {boolean} required - Whether authentication is required for this endpoint
 * @returns {Function} Express middleware function
 */
export function authenticateToken(required: boolean) {
   // eslint-disable-next-line consistent-return
   return (req: Request, res: Response, next: NextFunction) => {
      // Get token from cookies
      const token = req.cookies.access_token;

      if (!token && required) {
         return sendErrors(res, HTTP_STATUS.UNAUTHORIZED);
      } else if (token && !required) {
         return sendErrors(res, HTTP_STATUS.REDIRECT);
      } else if (required) {
         try {
            // Verify token
            const user = jwt.verify(token, process.env.SESSION_SECRET || "") as any;

            // Ensure user_id exists in token payload
            if (!user.user_id) {
               clearTokens(res);
               return sendErrors(res, HTTP_STATUS.FORBIDDEN);
            }

            // Make user ID available to further route handlers
            res.locals.user_id = user.user_id;
            next();
         } catch (error: any) {
            logger.error(error.message);

            if (error instanceof jwt.TokenExpiredError) {
               // Signal to the client that refresh is needed
               return sendSuccess(res, HTTP_STATUS.UNAUTHORIZED, { refreshable: true });
            } else if (error instanceof jwt.JsonWebTokenError) {
               // Clear invalid token
               clearTokens(res);
               return sendErrors(res, HTTP_STATUS.FORBIDDEN);
            } else {
               // Log unexpected errors
               logger.error(error.stack);
               return sendErrors(res, HTTP_STATUS.FORBIDDEN);
            }
         }
      } else {
         // Authentication not required
         next();
      }
   };
}

/**
 * Authenticates requests using the JWT refresh token from HTTP-only cookie
 *
 * Validates refresh token and attaches user_id to res.locals for token rotation.
 * Used exclusively for the refresh endpoint.
 *
 * @returns {Function} Express middleware function
 */
export function authenticateRefreshToken() {
   // eslint-disable-next-line consistent-return
   return (req: Request, res: Response, next: NextFunction) => {
      // Get refresh token from cookies
      const token = req.cookies.refresh_token;

      if (!token) {
         return sendErrors(res, HTTP_STATUS.UNAUTHORIZED);
      }

      try {
         // Verify refresh token
         const user = jwt.verify(token, process.env.SESSION_SECRET || "") as any;

         // Ensure user_id exists in token payload
         if (!user.user_id) {
            clearTokens(res);
            return sendErrors(res, HTTP_STATUS.FORBIDDEN);
         }

         // Make user ID available to refresh handler
         res.locals.user_id = user.user_id;

         // Make token available to refresh handler to limit the expiration time of the refresh token
         res.locals.refresh_token_expiration = new Date(user.exp * 1000);

         next();
      } catch (error: any) {
         if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
            // Clear invalid/expired refresh token
            clearTokens(res);
            return sendErrors(res, HTTP_STATUS.UNAUTHORIZED);
         } else {
            // Log unexpected errors
            logger.error(error.stack);
            return sendErrors(res, HTTP_STATUS.FORBIDDEN);
         }
      }
   };
}