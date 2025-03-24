import { User } from "capital/user";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as userService from "@/service/userService";

/**
 * Creates a new user account
 *
 * @param {Request} req - Express request object containing user data
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response after user creation - 201 ({ success: true }), 400, or 409 if user exists
 * @description
 * - `req.body` should be of type `User`
 */
export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => userService.createUser(req, res, req.body as User))
);