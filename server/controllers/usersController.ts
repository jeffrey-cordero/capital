import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendErrors, sendSuccess } from "@/lib/api/response";
import { UserModel } from "@/models/userModel";
import { configureJWT } from "@/session";
import { User } from "capital-types/user";

export const createUser = asyncHandler(async (req: Request, res: Response) => {
   try {
      const { username, name, password, verifyPassword, email } = req.body as User;

      // Validate user fields
      const user = new UserModel(null, username?.trim(), name?.trim(), password, email?.trim(), false);
      const errors = user.validate();

      if (errors !== null) {
         // Invalid user fields
         return sendErrors(res, 400, "Invalid user fields", errors);
      } else if (password !== verifyPassword) {
         // Validate password match
         return sendErrors(res, 400, "Passwords do not match", {
            password: "Passwords do not match",
            verifyPassword: "Passwords do not match"
         });
      } else {
         // Validate user uniqueness
         const normalizedUsername = username.toLowerCase().trim();
         const normalizedEmail = email.toLowerCase().trim();
         const conflicts = await UserModel.fetchExistingUsers(normalizedUsername, normalizedEmail);

         if (conflicts.length > 0) {
            // User exists with same username or email
            const errors = conflicts.reduce((account, user) => {
               if (user.username.toLowerCase().trim() === normalizedUsername) {
                  account.username = "Username already exists";
               }

               if (user.email.toLowerCase().trim() === normalizedEmail) {
                  account.email = "Email already exists";
               }

               return account;
            }, {} as Record<string, string>);

            return sendErrors(res, 400, "Account conflicts", errors);
         } else {
            // Create new user
            await user.create();

            // Configure JWT token
            configureJWT(req, res, user);

            return sendSuccess(res, 201, "Registration successful", { token: req.session.token });
         }
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
   return sendSuccess(res, 200, "Updating user awaits implementation");
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
   return sendSuccess(res, 200, "Deleting user awaits implementation");
});