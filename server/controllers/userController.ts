import { User, UserUpdates } from "capital/user";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as userService from "@/services/userService";

/**
 * Creates a new user account
 *
 * @param {Request} req - Express request object with user details
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with creation confirmation
 */
export const POST = asyncHandler(async(req: Request, res: Response) => {
   const user: User = req.body;

   return submitServiceRequest(res, async() => userService.createUser(res, user));
});

/**
 * Fetches account settings for the authenticated user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with user details
 */
export const GET = asyncHandler(async(_: Request, res: Response) => {
   return submitServiceRequest(res, async() => userService.fetchUserDetails(res.locals.user_id));
});

/**
 * Updates account settings for the authenticated user
 *
 * @param {Request} req - Express request object with updates
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with update confirmation
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const updates: Partial<UserUpdates> = req.body;

   return submitServiceRequest(res, async() => userService.updateAccountDetails(user_id, updates));
});

/**
 * Deletes the current user's account
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with deletion confirmation
 */
export const DELETE = asyncHandler(async(_: Request, res: Response) => {
   return submitServiceRequest(res, async() => userService.deleteAccount(res));
});