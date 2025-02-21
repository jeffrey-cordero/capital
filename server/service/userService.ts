import { User, userSchema } from "capital-types/user";
import { Request, Response } from "express";

import { ServiceResponse } from "@/lib/api/response";
import { configureJWT } from "@/lib/authentication/middleware";
import { hash } from "@/lib/database/cryptography";
import { create, findConflictingUsers } from "@/repository/userRepository";

export async function createUser(req: Request, res: Response, user: User): Promise<ServiceResponse> {
   // Validate user fields and uniqueness before insertion
   const fields = userSchema.safeParse(user);

   if (!fields.success) {
      const errors = fields.error.flatten().fieldErrors;

      return {
         code: 400,
         message: "Invalid user fields",
         errors: Object.fromEntries(
            Object.entries(errors as Record<string, string[]>).map(([field, errors]) => [
               field,
               errors?.[0] || "Unknown error"
            ])
         )
      };
   } else if (fields.data.password !== fields.data.verifyPassword) {
      // Invalid new password verification
      return {
         code: 400,
         message: "Invalid user fields",
         errors: {
            password: "Passwords do not match",
            verifyPassword: "Passwords do not match"
         }
      };
   } else {
      // Handle user uniqueness
      const result = await findConflictingUsers(user.username, user.email);

      if (result.length === 0) {
         // User does not exist with same username and/or email
         const creation = await create({ ...user, password: await hash(user.password) });

         // Configure JWT token for authentication purposes
         configureJWT(res, creation[0]);

         return {
            code: 200,
            message: "Successfully registered",
            data: creation[0]
         };
      } else {
         // User exists with same username and/or email
         const normalizedUsername = user.username.toLowerCase().trim();
         const normalizedEmail = user.email.toLowerCase().trim();

         const errors = result.reduce((account, user) => {
            if (user.username.toLowerCase().trim() === normalizedUsername) {
               account.username = "Username already exists";
            }

            if (user.email.toLowerCase().trim() === normalizedEmail) {
               account.email = "Email already exists";
            }

            return account;
         }, {} as Record<string, string>);

         return {
            code: 409,
            message: "Invalid user fields",
            errors: errors
         };
      }
   }
}