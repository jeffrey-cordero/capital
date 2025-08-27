import argon2 from "argon2";
import { ServerResponse } from "capital/server";
import { User } from "capital/user";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { logger } from "@/lib/logger";
import { configureToken } from "@/lib/middleware";
import { sendServiceResponse } from "@/lib/services";
import { findByUsername } from "@/repository/userRepository";

/**
 * Authenticates a user with an access token through JWT verification
 *
 * @param {Response} res - Express response object
 * @param {string} token - JWT token for authentication
 * @returns {Promise<ServerResponse>} A server response of `200` with authentication status
 */
export async function getAuthentication(res: Response, token: string): Promise<ServerResponse> {
   try {
      // Verify the JWT token where errors are potentially thrown
      jwt.verify(token, process.env.SESSION_SECRET || "");

      return sendServiceResponse(200, { authenticated: true });
   } catch (error: any) {
      // Handle specific JWT verification errors
      if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
         // For expired or invalid tokens, clear the cookie and return unauthenticated state
         res.clearCookie("token");

         return sendServiceResponse(200, { authenticated: false });
      } else {
         // For unexpected errors, log them and return server error status
         logger.error(error.stack);

         return sendServiceResponse(500, undefined, { server: "Internal Server Error" });
      }
   }
}

/**
 * Authenticates a user with username and password credentials
 *
 * @param {Response} res - Express response object
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<ServerResponse>} A server response of `200` with success status or `401` with error details
 */
export async function authenticateUser(res: Response, username: string, password: string): Promise<ServerResponse> {
   // Look up the user by username
   const user: User | null = await findByUsername(username);

   // Check if user exists and password matches using argon2 verification
   if (!user || !(await argon2.verify(user.password, password))) {
      // Return the same error message regardless of whether username or password was incorrect
      return sendServiceResponse(401, undefined, {
         username: "Invalid credentials",
         password: "Invalid credentials"
      });
   } else {
      // On successful authentication, configure a JWT token as a cookie
      configureToken(res, user.user_id as string);

      return sendServiceResponse(200, { success: true });
   }
}

/**
 * Logs out a user by clearing their authentication token
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<ServerResponse>} A server response of `200` with success status
 */
export async function logoutUser(req: Request, res: Response): Promise<ServerResponse> {
   // Clearing the token cookie effectively forces client to re-authenticate
   res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none",
      secure: true
   });

   return sendServiceResponse(200, { success: true });
}