import { ServerResponse } from "capital/server";
import { Request, Response } from "express";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { compare } from "@/lib/cryptography";
import { logger } from "@/lib/logger";
import { configureToken } from "@/lib/middleware";
import { sendServerResponse } from "@/lib/service";
import { findByUsername } from "@/repository/userRepository";

export async function getAuthentication(res: Response, token: string): Promise<ServerResponse> {
   try {
      // Verify the JWT token, which will throw an error if invalid
      jwt.verify(token, process.env.SESSION_SECRET || "");

      return sendServerResponse(200, "Authenticated Status", { authenticated: true });
   } catch (error: any) {
      // Handle JWT verification errors
      if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
         // Clear the JWT cookie from the client
         res.clearCookie("token");

         return sendServerResponse(200, "Invalid Token", { authenticated: false });
      } else {
         logger.error(error);

         return sendServerResponse(500, "Internal Server Error", undefined, { System: error.message });
      }
   }
}

export async function authenticateUser(res: Response, username: string, password: string): Promise<ServerResponse> {
   // Authenticate user based on existing username and valid password through hashing
   const user = await findByUsername(username);

   if (user.length === 0 || !(await compare(password, user[0].password))) {
      return sendServerResponse(401, "Invalid Credentials", undefined, {
         username: "Invalid credentials",
         password: "Invalid credentials"
      });
   } else {
      // Configure JWT token for authentication purposes
      configureToken(res, user[0]);

      return sendServerResponse(200, "Successfully logged in");
   }
}

export async function logoutUser(req: Request, res: Response): Promise<ServerResponse> {
   // Clear the cookies
   res.clearCookie("token");
   res.clearCookie("connect.sid");

   // Destroy the express-session
   req.session.destroy((error: any) => {
      if (error) throw error;
   });

   return sendServerResponse(200, "Successfully logged out");
}