import { ServerResponse } from "capital-types/server";
import { Request, Response } from "express";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { configureToken } from "@/lib/authentication/middleware";
import { compare } from "@/lib/database/cryptography";
import { findByUsername } from "@/repository/userRepository";

export async function getAuthentication(res: Response, token: string): Promise<ServerResponse> {
   try {
      // Verify the JWT token, which will throw an error if invalid
      jwt.verify(token, process.env.SESSION_SECRET || "");

      return {
         status: 200,
         message: "Authenticated Status",
         data: { authenticated: true }
      };
   } catch (error: any) {
      // Handle JWT verification errors
      if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
         // Clear the JWT cookie from the client
         res.clearCookie("token");

         return {
            status: 200,
            message: "Invalid Token",
            data: { authenticated: false }
         };
      }  else {
         console.error(error);

         return {
            status: 500,
            message: "Internal Server Error",
            errors: { System: error.message }
         };
      }
   }
}

export async function authenticateUser(res: Response, username: string, password: string): Promise<ServerResponse> {
   // Authenticate user based on existing username and valid password through hashing
   const user = await findByUsername(username);

   if (user.length === 0 || !(await compare(password, user[0].password))) {
      return {
         status: 401,
         message: "Invalid Credentials",
         errors: {
            username: "Invalid credentials",
            password: "Invalid credentials"
         }
      };
   } else {
      // Configure JWT token for authentication purposes
      configureToken(res, user[0]);

      return {
         status: 200,
         message: "Successfully logged in"
      };
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

   return {
      status: 200,
      message: "Successfully logged out"
   };
}