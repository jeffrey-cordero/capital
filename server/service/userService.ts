import { ServerResponse } from "capital/server";
import { User, userSchema } from "capital/user";
import { Request, Response } from "express";

import { hash } from "@/lib/cryptography";
import { configureToken } from "@/lib/middleware";
import { sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as userRepository from "@/repository/userRepository";

/**
 * Helper function to normalize user input for case-insensitive comparison (username, email).
 *
 * @param {string} input - User input to normalize
 * @returns {string} Normalized user input
 */
const normalizeUserInput = (input: string): string => input.toLowerCase().trim();

/**
 * Helper function to generate error messages for username/email conflicts.
 *
 * @param {User[]} existingUsers - Array of existing users
 * @param {string} username - Username to check
 * @param {string} email - Email to check
 * @returns {Record<string, string>} Error messages
 */
const generateConflictErrors = (existingUsers: User[], username: string, email: string): Record<string, string> => {
   const normalizedUsername = normalizeUserInput(username);
   const normalizedEmail = normalizeUserInput(email);

   return existingUsers.reduce((acc: Record<string, string>, record: User) => {
      if (normalizeUserInput(record.username) === normalizedUsername) {
         acc.username = "Username already exists";
      }

      if (normalizeUserInput(record.email) === normalizedEmail) {
         acc.email = "Email already exists";
      }

      return acc;
   }, {});
};

/**
 * Creates a new user and configures their JWT token for authentication.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {User} user - User object
 * @returns {Promise<ServerResponse>} A server response of `201` (`{ success: true }`) or `400`/`409` with respective errors
 */
export async function createUser(req: Request, res: Response, user: User): Promise<ServerResponse> {
   // Validate user fields against the user schema
   const fields = userSchema.safeParse(user);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid user fields");
   }

   // Validate user uniqueness by checking for existing username/email
   const existingUsers: User[] = await userRepository.findConflictingUsers(user.username, user.email);

   if (existingUsers.length === 0) {
      // Hash password and create the new user
      const hashedPassword = await hash(user.password);
      const user_id: string = await userRepository.create({ ...user, password: hashedPassword });

      // Configure JWT token for authentication
      configureToken(res, user_id);

      return sendServiceResponse(201, "Successfully registered", { success: true });
   } else {
      // Handle username/email conflicts
      const errors = generateConflictErrors(existingUsers, user.username, user.email);
      return sendServiceResponse(409, "Invalid user fields", undefined, errors);
   }
}