import { ServerResponse } from "capital/server";
import { User } from "capital/user";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { compare } from "@/lib/cryptography";
import { logger } from "@/lib/logger";
import { configureToken } from "@/lib/middleware";
import { sendServiceResponse } from "@/lib/services";
import { findByUsername } from "@/repository/userRepository";

export async function getAuthentication(res: Response, token: string): Promise<ServerResponse> {
   try {
      // Verify the JWT token, handling expected thrown errors
      jwt.verify(token, process.env.SESSION_SECRET || "");

      return sendServiceResponse(200, "Authenticated Status", { authenticated: true });
   } catch (error: any) {
      // Handle JWT verification errors
      if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
         // Clear the expired or invalid authentication token and express-session cookies
         res.clearCookie("token");
         res.clearCookie("connect.sid");

         return sendServiceResponse(200, "Invalid Token", { authenticated: false });
      } else {
         logger.error(error.stack);

         return sendServiceResponse(500, "Internal Server Error", undefined,
            { server: error.message || error.code || "An unknown error occurred" }
         );
      }
   }
}

export async function authenticateUser(res: Response, username: string, password: string): Promise<ServerResponse> {
   // Authenticate user based on the provided credentials
   const user: User[] = await findByUsername(username);

   if (user.length === 0 || !(await compare(password, user[0].password))) {
      return sendServiceResponse(401, "Invalid Credentials", undefined, {
         username: "Invalid credentials",
         password: "Invalid credentials"
      });
   } else {
      // Configure JWT token for authentication purposes
      configureToken(res, user[0]);

      return sendServiceResponse(200, "Successfully logged in");
   }
}

export async function logoutUser(req: Request, res: Response): Promise<ServerResponse> {
   // Clear the authentication token and express-session cookies
   res.clearCookie("token");
   res.clearCookie("connect.sid");

   // Destroy the express-session
   req.session.destroy((error: any) => {
      if (error) {
         throw error;
      }
   });

   return sendServiceResponse(200, "Successfully logged out");
}