import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as authenticationService from "@/service/authenticationService";

/**
 * Handles GET requests for verifying current authentication status.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the authentication status request
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.getAuthentication(res, req.cookies.token))
);

/**
 * Handles POST requests for authenticating user login attempts.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the login request
 */
export const LOGIN = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.authenticateUser(res, req.body.username, req.body.password))
);

/**
 * Handles POST requests for logging out current users.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the logout request
 */
export const LOGOUT = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.logoutUser(req, res))
);