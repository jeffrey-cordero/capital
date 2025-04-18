import { User, UserUpdates } from "capital/user";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as userService from "@/services/userService";

/**
 * Handles POST requests for creating a new user account.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the user creation request
 */
export const POST = asyncHandler(async(req: Request, res: Response) => {
   const user: User = req.body;

   return submitServiceRequest(res, async() => userService.createUser(req, res, user));
});

/**
 * Handles GET requests for fetching user account settings.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the user details request
 */
export const GET = asyncHandler(async(req: Request, res: Response) => {
   return submitServiceRequest(res, async() => userService.fetchUserDetails(res.locals.user_id));
});

/**
 * Handles PUT requests for updating user account settings.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the user update request
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const updates: Partial<UserUpdates> = req.body;

   return submitServiceRequest(res, async() => userService.updateAccountDetails(user_id, updates));
});

/**
 * Handles DELETE requests for removing a user account.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the user deletion request
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   return submitServiceRequest(res, async() => userService.deleteAccount(req, res));
});