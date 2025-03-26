import { User } from "capital/user";
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