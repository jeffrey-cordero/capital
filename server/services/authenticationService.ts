import argon2 from "argon2";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import { User } from "capital/user";
import { Response } from "express";
import jwt from "jsonwebtoken";

import { logger } from "@/lib/logger";
import { clearTokens, configureToken } from "@/lib/middleware";
import { sendServiceResponse } from "@/lib/services";
import { findByUsername } from "@/repository/userRepository";

/**
 * Authenticates a user with an access token through JWT verification
 *
 * @param {Response} res - Express response object
 * @param {string} token - JWT token for authentication
 * @returns {ServerResponse} A server response of `HTTP_STATUS.OK` with authentication status
 */
export function getAuthentication(res: Response, token: string): ServerResponse {
   try {
      // Verify the JWT token, potentially throwing errors
      jwt.verify(token, process.env.SESSION_SECRET || "");

      return sendServiceResponse(HTTP_STATUS.OK, { authenticated: true });
   } catch (error: any) {
      if (error instanceof jwt.TokenExpiredError) {
         // Signal to the client that a refresh is required
         return sendServiceResponse(HTTP_STATUS.UNAUTHORIZED, { refreshable: true });
      } else if (error instanceof jwt.JsonWebTokenError) {
         // Clear invalid/expired authentication tokens
         clearTokens(res);
         return sendServiceResponse(HTTP_STATUS.OK, { authenticated: false });
      } else {
         // Log any unexpected errors
         logger.error(error.stack);
         return sendServiceResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, undefined, { server: "Internal Server Error" });
      }
   }
}

/**
 * Authenticates a user with username and password credentials
 *
 * @param {Response} res - Express response object
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.OK` with success status or `HTTP_STATUS.UNAUTHORIZED` with error details
 */
export async function authenticateUser(res: Response, username: string, password: string): Promise<ServerResponse> {
   // Look up the user by username, which is case-insensitive
   const user: User | null = await findByUsername(username);

   // Check if user exists and password matches using argon2 verification
   if (!user || !(await argon2.verify(user.password, password))) {
      // Return the same error message regardless of whether username or password was incorrect
      return sendServiceResponse(HTTP_STATUS.UNAUTHORIZED, undefined, {
         username: "Invalid credentials",
         password: "Invalid credentials"
      });
   } else {
      // On successful authentication, configure a JWT token as a cookie
      configureToken(res, user.user_id as string);

      return sendServiceResponse(HTTP_STATUS.OK, { success: true });
   }
}

/**
 * Refreshes authentication tokens using a valid refresh token, which
 * issues new access and refresh tokens for security purposes
 *
 * @param {Response} res - Express response object
 * @param {string} user_id - User ID from validated refresh token
 * @returns {ServerResponse} A server response of `HTTP_STATUS.OK` with success status
 */
export function refreshToken(res: Response, user_id: string): ServerResponse {
   // Determine the expiration time of the refresh token in seconds
   const secondsUntilExpire: number = Math.max(0, Math.floor((new Date(res.locals.refresh_token_expiration).getTime() - Date.now()) / 1000));

   // Rotate both tokens for security purposes
   configureToken(res, user_id, secondsUntilExpire);

   return sendServiceResponse(HTTP_STATUS.OK, { success: true });
}

/**
 * Logs out a user by clearing their authentication tokens
 *
 * @param {Response} res - Express response object
 * @returns {ServerResponse} A server response of `HTTP_STATUS.OK` with success status
 */
export function logoutUser(res: Response): ServerResponse {
   // Clear both authentication tokens
   clearTokens(res);

   return sendServiceResponse(HTTP_STATUS.OK, { success: true });
}