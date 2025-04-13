import { User, UserDetailUpdates } from "capital/user";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as userService from "@/service/userService";

/**
 * Handles POST requests for creating a new user account.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the user creation request
 */
export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => userService.createUser(req, res, req.body as User))
);

/**
 * Handles GET requests for fetching user account settings.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the user details request
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => userService.fetchUserDetails(res.locals.user_id))
);

/**
 * Handles PUT requests for updating user account settings.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the user update request
 */
export const PUT = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => userService.updateAccountDetails(req, res, req.body as Partial<UserDetailUpdates>))
);

/**
 * Handles DELETE requests for removing a user account.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the user deletion request
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => userService.deleteAccount(req, res, res.locals.user_id))
);