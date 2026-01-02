import argon2 from "argon2";
import { HTTP_STATUS, ServerResponse } from "capital/server";
import {
   updateUserSchema,
   User,
   UserDetails,
   userSchema,
   UserUpdates
} from "capital/user";
import { Response } from "express";

import { configureToken } from "@/lib/middleware";
import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { clearCacheAndSendSuccess, sendServiceResponse, sendValidationErrors } from "@/lib/services";
import * as userRepository from "@/repository/userRepository";
import { logoutUser } from "@/services/authenticationService";

/**
 * Cache duration for user details (30 minutes)
 */
export const USER_DETAILS_CACHE_DURATION = 30 * 60;

/**
 * Normalizes user input for case-insensitive comparison
 *
 * @param {string} input - User input to normalize
 * @returns {string} Normalized lowercase trimmed string
 */
const normalizeUserInput = (input: string): string => input.toLowerCase().trim();

/**
 * Generates error messages for username/email conflicts
 *
 * @param {User[]} existingUsers - Array of existing users
 * @param {string} username - Username to check
 * @param {string} email - Email to check
 * @returns {Record<string, string>} Object with error messages representing the attribute conflicts
 */
const generateConflictErrors = (
   existingUsers: User[],
   username: string,
   email: string
): Record<string, string> => {
   // Normalize inputs for consistent comparison
   const normalizedUsername = normalizeUserInput(username);
   const normalizedEmail = normalizeUserInput(email);

   // Check each existing user for conflicts with the provided username/email
   return existingUsers.reduce((acc, record: User) => {
      if (normalizeUserInput(record.username) === normalizedUsername) {
         acc.username = "Username already exists";
      }

      if (normalizeUserInput(record.email) === normalizedEmail) {
         acc.email = "Email already exists";
      }

      return acc;
   }, {} as Record<string, string>);
};

/**
 * Generates user cache key for Redis
 *
 * @param {string} user_id - User identifier
 * @returns {string} Redis cache key for user details
 */
const getUserCacheKey = (user_id: string): string => `user:${user_id}`;

/**
 * Fetches user details
 *
 * @param {string} user_id - User identifier
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.OK` with user details or `HTTP_STATUS.NOT_FOUND` with respective errors
 */
export async function fetchUserDetails(user_id: string): Promise<ServerResponse> {
   // Try to get user details from cache first
   const key: string = getUserCacheKey(user_id);
   const cache: string | null = await getCacheValue(key);

   if (cache) {
      return sendServiceResponse(HTTP_STATUS.OK, JSON.parse(cache) as UserDetails);
   }

   // Cache miss - fetch complete user data from the database
   const user: User | null = await userRepository.findByUserId(user_id);

   if (!user) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
         user_id: "User does not exist based on the provided ID"
      });
   }

   // Create a user details record without sensitive information
   const record: UserDetails = {
      username: user.username,
      name: user.name,
      email: user.email,
      birthday: user.birthday
   };
   setCacheValue(key, USER_DETAILS_CACHE_DURATION, JSON.stringify(record));

   return sendServiceResponse(HTTP_STATUS.OK, record);
}

/**
 * Creates a new user and configures JWT token
 *
 * @param {Response} res - Express response object
 * @param {User} user - User object to create
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.CREATED` with success status or `HTTP_STATUS.BAD_REQUEST`/`HTTP_STATUS.CONFLICT` with respective errors
 */
export async function createUser(res: Response, user: User): Promise<ServerResponse> {
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
      // Create the new user with a hashed password
      const digest: string = await argon2.hash(fields.data.password);
      const user_id: string = await userRepository.create({ ...fields.data, password: digest });

      // Configure JWT token for authentication purposes and return it to the client
      const tokens = configureToken(res, user_id);

      return sendServiceResponse(HTTP_STATUS.CREATED, {
         success: true,
         ...tokens
      });
   } else {
      // Handle username/email conflicts
      const errors = generateConflictErrors(existingUsers, fields.data.username, fields.data.email);

      return sendServiceResponse(HTTP_STATUS.CONFLICT, undefined, errors);
   }
}

/**
 * Updates user account details including account security information
 *
 * @param {string} user_id - User identifier
 * @param {Partial<UserUpdates>} updates - User details to update
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.NO_CONTENT` with no content or `HTTP_STATUS.BAD_REQUEST`/`HTTP_STATUS.NOT_FOUND`/`HTTP_STATUS.CONFLICT` with respective errors
 */
export async function updateAccountDetails(user_id: string, updates: Partial<UserUpdates>): Promise<ServerResponse> {
   // Validate update fields with user update schema
   const fields = updateUserSchema.safeParse(updates);

   if (!fields.success) {
      return sendValidationErrors(fields);
   }

   const details: Partial<UserUpdates> = fields.data;

   // If username or email is being updated, check for conflicts with existing users
   if (details.username || details.email) {
      const existingUsers: User[] = await userRepository.findConflictingUsers(
         details.username || "", details.email || "", user_id
      );

      if (existingUsers.length > 0) {
         // Handle username/email conflicts
         const errors = generateConflictErrors(existingUsers, details.username || "", details.email || "");

         return sendServiceResponse(HTTP_STATUS.CONFLICT, undefined, errors);
      }
   }

   // Handle password changes if requested
   if (details.newPassword) {
      // Verify that the current user exists
      const current: User | null = await userRepository.findByUserId(user_id);

      if (!current) {
         return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
            user_id: "User does not exist based on the provided ID"
         });
      }

      // Check if provided password credentials are correct
      if (!details.password || !(await argon2.verify(current.password, details.password))) {
         return sendServiceResponse(HTTP_STATUS.BAD_REQUEST, undefined, {
            password: "Invalid credentials"
         });
      }

      // Hash the new password for secure storage
      const digest: string = await argon2.hash(details.newPassword);
      details.password = digest;
   }

   // Apply the updates to the database
   const result = await userRepository.update(user_id, details);

   if (!result) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
         user_id: "User does not exist based on the provided ID"
      });
   }

   return clearCacheAndSendSuccess(getUserCacheKey(user_id));
}

/**
 * Deletes a user account and all associated data
 *
 * @param {Response} res - Express response object
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.NO_CONTENT` with no content or `HTTP_STATUS.NOT_FOUND` with respective errors
 */
export async function deleteAccount(res: Response): Promise<ServerResponse> {
   // Attempt to delete the user and their associated data
   const user_id: string = res.locals.user_id;
   const result = await userRepository.deleteUser(user_id);

   if (!result) {
      return sendServiceResponse(HTTP_STATUS.NOT_FOUND, undefined, {
         user_id: "User does not exist based on the provided ID"
      });
   }

   // Clear the user authentication status
   logoutUser(res);

   // Clear the respective cache values
   ["accounts", "budgets", "transactions", "user"].forEach((key: string) => {
      removeCacheValue(`${key}:${user_id}`);
   });

   return sendServiceResponse(HTTP_STATUS.NO_CONTENT);
}