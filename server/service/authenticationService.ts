import { Request, Response } from "express";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { ServiceResponse } from "@/lib/api/response";
import { configureJWT } from "@/lib/authentication/middleware";
import { compare } from "@/lib/database/cryptography";
import { findByUsername } from "@/repository/userRepository";

export async function getAuthentication(res: Response, token: string): Promise<ServiceResponse> {
   try {
      // Verify the JWT token, which will throw an error if invalid
      jwt.verify(token, process.env.SESSION_SECRET || "");

      return {
         code: 200,
         message: "Authenticated status retrieved",
         data: { authenticated: true }
      };
   } catch (error: any) {
      // Handle JWT verification errors
      if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
         // Clear the JWT cookie from the client
         res.clearCookie("token");

         return {
            code: 200,
            message: "Invalid token or token expired",
            data: { authenticated: false }
         };
      }  else {
         console.error(error);

         return {
            code: 500,
            message: "Internal Server Error",
            errors: { system: error.message }
         };
      }
   }
}

export async function authenticateUser(res: Response, username: string, password: string): Promise<ServiceResponse> {
   // Authenticate user based on existing username and valid password through hashing
   const user = await findByUsername(username);

   if (user.length === 0 || !(await compare(password, user[0].password))) {
      return {
         code: 401,
         message: "Invalid credentials",
         errors: {
            username: "Invalid credentials",
            password: "Invalid credentials"
         }
      };
   } else {
      // Configure JWT token for authentication purposes
      configureJWT(res, user[0]);

      return {
         code: 200,
         message: "Successfully authenticated",
         data: user[0]
      };
   }
}

export async function logoutUser(req: Request, res: Response): Promise<ServiceResponse> {
   // Clear the cookies
   res.clearCookie("token");
   res.clearCookie("connect.sid");

   // Destroy the express-session
   req.session.destroy((error: any) => {
      if (error) throw error;
   });

   return {
      code: 200,
      message: "Successfully logged out"
   };
}