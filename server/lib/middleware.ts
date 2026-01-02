import { HTTP_STATUS } from "capital/server";
import { NextFunction, Request, RequestHandler, Response } from "express";
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
 * Generates JWT access and refresh tokens
 *
 * @param {string} user_id - User ID to include in token
 * @param {number} secondsUntilExpire - Seconds until refresh token expires
 * @returns {{ access_token: string; refresh_token: string }} Signed tokens
 */
export function generateTokens(user_id: string, secondsUntilExpire?: number): { access_token: string; refresh_token: string } {
   const access_token = jwt.sign({ user_id }, process.env.SESSION_SECRET || "", { expiresIn: "60min" });
   const refresh_token = jwt.sign({ user_id }, process.env.SESSION_SECRET || "", { expiresIn: secondsUntilExpire || "7d" });

   return { access_token, refresh_token };
}

/**
 * Generates JWT access and refresh tokens
 *
 * @param {Response} _res - Express response object (unused but kept for signature compatibility)
 * @param {string} user_id - User ID to include in token
 * @param {number} secondsUntilExpire - Seconds until refresh token expires
 * @returns {{ access_token: string; refresh_token: string }} Signed tokens
 */
export function configureToken(_res: Response, user_id: string, secondsUntilExpire?: number): { access_token: string; refresh_token: string } {
   return generateTokens(user_id, secondsUntilExpire);
}

/**
 * Clears authentication (No-op since switching to JWT in localStorage, but kept for interface consistency)
 *
 * @param {Response} _res - Express response object
 */
export function clearTokens(_res: Response): void {
   // JWTs are managed in localStorage on the client side
}

/**
 * Middleware to authenticate requests using the JWT access token from cookies, which
 * attaches `user_id` to `res.locals` if valid or clears invalid/expired authentication tokens,
 * where all unauthorized, redirection, forbidden, and refreshable responses are handled internally
 *
 * @param {boolean} required - Whether authentication is required for this endpoint
 * @returns {RequestHandler} Express request handler function
 */
export function authenticateToken(required: boolean): RequestHandler {
   // eslint-disable-next-line consistent-return
   return (req: Request, res: Response, next: NextFunction): void => {
      // Prioritize Authorization header, fallback to cookies
      const authHeader = req.headers.authorization;
      const token: string = authHeader && authHeader.startsWith("Bearer ")
         ? authHeader.split(" ")[1]
         : req.cookies.access_token;

      if (!token && required) {
         return sendErrors(res, HTTP_STATUS.UNAUTHORIZED);
      } else if (token && !required) {
         return sendErrors(res, HTTP_STATUS.REDIRECT);
      } else if (required) {
         try {
            // Verify the JWT token, potentially throwing errors
            const user = jwt.verify(token, process.env.SESSION_SECRET || "") as any;

            // Ensure the `user_id` exists in the token payload
            if (!user.user_id) {
               // Malformed access token, clear both authentication tokens
               clearTokens(res);
               return sendErrors(res, HTTP_STATUS.FORBIDDEN);
            }

            // Make the `user_id` available to further route handlers
            res.locals.user_id = user.user_id;
            next();
         } catch (error: any) {
            if (error instanceof jwt.TokenExpiredError) {
               // Signal to the client that a refresh is required
               return sendSuccess(res, HTTP_STATUS.UNAUTHORIZED, { refreshable: true });
            } else if (error instanceof jwt.JsonWebTokenError) {
               // Invalid/expired access token, clear both authentication tokens
               clearTokens(res);
               return sendErrors(res, HTTP_STATUS.FORBIDDEN);
            } else {
               // Log any unexpected errors
               logger.error(error.stack);
               return sendErrors(res, HTTP_STATUS.FORBIDDEN);
            }
         }
      } else {
         // Authentication is not required, proceed to the next middleware in the chain
         next();
      }
   };
}

/**
 * Middleware to authenticate requests using the JWT refresh token from cookies, which
 * attaches `user_id` and `refresh_token_expiration` to `res.locals` if valid or clears
 * invalid/expired authentication tokens, where all unauthorized and forbidden responses
 * are handled internally
 *
 * @returns {RequestHandler} Express request handler function
 */
export function authenticateRefreshToken(): RequestHandler {
   // eslint-disable-next-line consistent-return
   return (req: Request, res: Response, next: NextFunction) => {
      // Prioritize Authorization header, fallback to cookies
      const authHeader = req.headers.authorization;
      const token: string = authHeader && authHeader.startsWith("Bearer ")
         ? authHeader.split(" ")[1]
         : req.cookies.refresh_token;

      if (!token) {
         // Missing refresh token, clear both authentication tokens
         clearTokens(res);
         return sendErrors(res, HTTP_STATUS.UNAUTHORIZED);
      }

      try {
         // Verify the JWT refresh token, potentially throwing errors
         const user = jwt.verify(token, process.env.SESSION_SECRET || "") as any;

         // Ensure the `user_id` exists in the token payload
         if (!user.user_id) {
            // The `user_id` is missing from the token payload, clear both authentication tokens
            clearTokens(res);
            return sendErrors(res, HTTP_STATUS.FORBIDDEN);
         }

         // Make the `user_id` available to the refresh handler
         res.locals.user_id = user.user_id;

         // Make token available to refresh handler to limit the expiration time of the refresh token
         res.locals.refresh_token_expiration = new Date(user.exp * 1000);

         next();
      } catch (error: any) {
         if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
            // Invalid/expired refresh token, clear both authentication tokens
            clearTokens(res);
            return sendErrors(res, HTTP_STATUS.UNAUTHORIZED);
         } else {
            // Log any unexpected errors
            logger.error(error.stack);
            return sendErrors(res, HTTP_STATUS.FORBIDDEN);
         }
      }
   };
}