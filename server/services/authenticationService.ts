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
 * Authenticates a user with a access token through JWT verification.
 *
 * @param {Response} res - Express response object
 * @param {string} token - JWT token for authentication
 * @returns {Promise<ServerResponse>} A server response of `200` (`{ authenticated: true | false }`)
 */
export async function getAuthentication(res: Response, token: string): Promise<ServerResponse> {
   try {
      // Verify the JWT token, handling expected thrown errors
      jwt.verify(token, process.env.SESSION_SECRET || "");

      return sendServiceResponse(200, { authenticated: true });
   } catch (error: any) {
      // Handle JWT verification errors
      if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
         // Clear the expired or invalid authentication token cookies
         res.clearCookie("token");

         return sendServiceResponse(200, { authenticated: false });
      } else {
         logger.error(error.stack);

         return sendServiceResponse(500, undefined, { server: "Internal Server Error" });
      }
   }
}

/**
 * Authenticates a user with username and password credentials, configuring a
 * JWT token for authentication purposes on success.
 *
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<ServerResponse>} A server response of `200` (`{ success: true }`) or `401` with respective errors
 */
export async function authenticateUser(res: Response, username: string, password: string): Promise<ServerResponse> {
   // Authenticate user based on the provided credentials
   const user: User | null = await findByUsername(username);

   if (!user || !(await argon2.verify(password, user.password))) {
      return sendServiceResponse(401, undefined, {
         username: "Invalid credentials",
         password: "Invalid credentials"
      });
   } else {
      // Configure JWT token for authentication purposes
      configureToken(res, user.user_id as string);

      return sendServiceResponse(200, { success: true });
   }
}

/**
 * Logs out a user.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<ServerResponse>} A server response of `200` (`{ success: true }`)
 */
export async function logoutUser(req: Request, res: Response): Promise<ServerResponse> {
   // Clear the authentication token cookies
   res.clearCookie("token");

   return sendServiceResponse(200, { success: true });
}