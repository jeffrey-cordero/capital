import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { ServiceResponse } from "@/lib/api/response";
import { authenticate } from "@/repository/userRepository";

export async function login(username: string, password: string): Promise<ServiceResponse> {
   try {
      const result = await authenticate(username, password);

      if (result === null) {
         return {
            code: 401,
            message: "Invalid credentials",
            errors: {
               username: "Invalid credentials",
               password: "Invalid credentials"
            }
         };
      } else {
         return {
            code: 200,
            message: "Login successful",
            data: result
         };
      }
   } catch (error: any) {
      console.error(error);

      return {
         code: 500,
         message: "Internal Server Error",
         errors: { system: error.message }
      };
   }
}

export async function fetchAuthentication(token: string): Promise<ServiceResponse> {
   try {
      // Verify the JWT token
      return {
         code: 200,
         message: "Authenticated status retrieved",
         data: { authenticated: jwt.verify(token, process.env.SESSION_SECRET || "") }
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