import { ServerResponse } from "capital/server";
import { User, userSchema } from "capital/user";
import { Request, Response } from "express";

import { sendServerResponse, sendValidationErrors } from "@/lib/api/service";
import { configureToken } from "@/lib/authentication/middleware";
import { hash } from "@/lib/database/cryptography";
import { create, findConflictingUsers } from "@/repository/userRepository";

export async function createUser(req: Request, res: Response, user: User): Promise<ServerResponse> {
   // Validate user fields and uniqueness before insertion
   const fields = userSchema.safeParse(user);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid user fields");
   } else if (fields.data.password !== fields.data.verifyPassword) {
      // Invalid new password verification
      return sendValidationErrors(null, "Invalid user fields", {
         password: "Passwords do not match",
         verifyPassword: "Passwords do not match"
      });
   } else {
      // Handle user uniqueness
      const result = await findConflictingUsers(user.username, user.email);

      if (result.length === 0) {
         // User does not exist with same username and/or email
         const creation = await create({ ...user, password: await hash(user.password) });

         // Configure JWT token for authentication purposes
         configureToken(res, creation[0]);

         return sendServerResponse(201, "Successfully registered");
      } else {
         // User exists with same username and/or email
         const normalizedUsername = user.username.toLowerCase().trim();
         const normalizedEmail = user.email.toLowerCase().trim();

         const errors = result.reduce((acc, record) => {
            if (record.username.toLowerCase().trim() === normalizedUsername) {
               acc.username = "Username already exists";
            }

            if (record.email.toLowerCase().trim() === normalizedEmail) {
               acc.email = "Email already exists";
            }

            return acc;
         }, {} as Record<string, string>);

         return sendServerResponse(409, "Invalid user fields", undefined, errors);
      }
   }
}