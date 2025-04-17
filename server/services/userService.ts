import { ServerResponse } from "capital/server";
import {
   User,
   UserDetails,
   UserUpdates,
   userSchema,
   updateUserSchema
} from "capital/user";
import { Request, Response } from "express";

import { compare, hash } from "@/lib/cryptography";
import { configureToken } from "@/lib/middleware";
import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as userRepository from "@/repository/userRepository";
import { logoutUser } from "@/services/authenticationService";

/**
 * Cache duration in seconds for user details (30 minutes)
 */
const USER_DETAILS_CACHE_DURATION = 30 * 60;

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
const generateConflictErrors = (
   existingUsers: User[],
   username: string,
   email: string
): Record<string, string> => {
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
 * Helper function to generate user cache key for Redis.
 *
 * @param {string} user_id - User ID
 * @returns {string} User cache key
 */
const getUserCacheKey = (user_id: string): string => `user:${user_id}`;

/**
 * Helper function to clear user cache on successful user updates.
 *
 * @param {string} user_id - User ID
 */
const clearUserCache = (user_id: string): void => {
   removeCacheValue(getUserCacheKey(user_id));
};

/**
 * Fetches user details from cache or database.
 *
 * @param {string} user_id - User ID
 * @returns {Promise<ServerResponse>} A server response of `200` (`UserDetails`) or `404` if not found
 */
export async function fetchUserDetails(user_id: string): Promise<ServerResponse> {
   // Try to get user details from cache first
   const key: string = getUserCacheKey(user_id);
   const cache: string | null = await getCacheValue(key);

   if (cache) {
      return sendServiceResponse(200, "User details", JSON.parse(cache) as UserDetails);
   }

   // Cache miss - fetch from database and store in cache
   const user: User | null = await userRepository.findByUserId(user_id);

   if (!user) {
      return sendServiceResponse(404, undefined, {
         user: "User does not exist based on the provided ID"
      });
   }

   // Create a user details object without sensitive information
   const userDetails: UserDetails = {
      username: user.username,
      name: user.name,
      email: user.email,
      birthday: user.birthday
   };

   // Cache user details
   setCacheValue(key, USER_DETAILS_CACHE_DURATION, JSON.stringify(userDetails));

   return sendServiceResponse(200, "User details", userDetails);
}

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
      return sendValidationErrors(fields);
   }

   // Validate user uniqueness by checking for existing username/email
   const existingUsers: User[] = await userRepository.findConflictingUsers(
      fields.data.username, fields.data.email
   );

   if (existingUsers.length === 0) {
      // Hash password and create the new user
      const hashedPassword = await hash(fields.data.password);
      const user_id: string = await userRepository.create({ ...fields.data, password: hashedPassword });

      // Configure JWT token for authentication
      configureToken(res, user_id);

      return sendServiceResponse(201, { success: true });
   } else {
      // Handle username/email conflicts
      const errors = generateConflictErrors(existingUsers, fields.data.username, fields.data.email);
      return sendServiceResponse(409, undefined, errors);
   }
}

/**
 * Updates user account details including password changes.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Partial<UserUpdates>} updates - User details to update
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `400`/`404`/`409` with respective errors
 */
export async function updateAccountDetails(req: Request, res: Response, updates: Partial<UserUpdates>): Promise<ServerResponse> {
   const user_id: string = res.locals.user_id;

   // Validate update fields with user update schema
   const fields = updateUserSchema.safeParse(updates);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   const details: Partial<UserUpdates> = { ...fields.data };

   if (Object.keys(details).length === 0) {
      return sendServiceResponse(400, { user: "No updates provided" });
   }

   // Validate username and email uniqueness if provided
   if (details.username || details.email) {
      // Check for conflicts excluding the current user
      const existingUsers: User[] = await userRepository.findConflictingUsers(
         details.username || "", details.email || "", user_id
      );

      if (existingUsers.length > 0) {
         // Handle username/email conflicts that are not tied to the current user
         const errors = generateConflictErrors(existingUsers, details.username || "", details.email || "");

         return sendServiceResponse(409, undefined, errors);
      }
   }

   // Handle password changes
   if (details.newPassword) {
      // Verify the current password first
      const current = await userRepository.findByUserId(user_id);

      if (!current) {
         return sendServiceResponse(404, undefined, {
            user: "User does not exist based on the provided ID"
         });
      }

      // Check if provided password matches current password
      if (!details.password || !(await compare(details.password, current.password))) {
         return sendServiceResponse(400, undefined, {
            password: "Invalid password"
         });
      }

      // Hash the new password
      const hashedPassword = await hash(details.newPassword);
      details.password = hashedPassword;
   }

   // Update user details in the database
   const result = await userRepository.update(user_id, details);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         user: "User does not exist based on the provided ID"
      });
   }

   // Clear the user cache to ensure fresh data on next fetch
   clearUserCache(user_id);

   return sendServiceResponse(204);
}

/**
 * Deletes a user account and all their associated data.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {string} user_id - The ID of the user to delete
 * @returns {Promise<ServerResponse>} A server response of `204` (no content) or `404` if the user does not exist
 */
export async function deleteAccount(req: Request, res: Response, user_id: string): Promise<ServerResponse> {
   // Attempt to delete the user and their data
   const result = await userRepository.deleteUser(user_id);

   if (!result) {
      return sendServiceResponse(404, undefined, {
         user: "User does not exist based on the provided ID"
      });
   }

   // Clear the user cache and log the user out
   clearUserCache(user_id);
   await logoutUser(req, res);

   return sendServiceResponse(204);
}