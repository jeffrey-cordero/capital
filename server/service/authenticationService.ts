import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { ServiceResponse } from "@/lib/api/response";

import { authenticateUser } from "./userService";

export async function login(username: string, password: string): Promise<ServiceResponse> {
   return await authenticateUser(username, password);
}

export async function getAuthentication(token: string): Promise<ServiceResponse> {
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