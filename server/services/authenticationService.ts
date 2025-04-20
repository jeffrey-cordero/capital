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
      // Handle JWT verification errors
      if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
         // Clear the expired or invalid authentication token cookies
         res.clearCookie("token");

         return sendServiceResponse(200, { authenticated: false });
      } else {
         // Log unexpected errors
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
   // Authenticate user based on the provided credentials
   const user: User | null = await findByUsername(username);

   if (!user || !(await argon2.verify(user.password, password))) {
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
 * Logs out a user by clearing their authentication token
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<ServerResponse>} A server response of `200` with success status
 */
export async function logoutUser(req: Request, res: Response): Promise<ServerResponse> {
   // Clear the authentication token cookies
   res.clearCookie("token");

   return sendServiceResponse(200, { success: true });
}