import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as authenticationService from "@/service/authenticationService";

/**
 * Verifies current authentication status
 *
 * @param {Request} req - Express request object containing auth token in cookies
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with auth status - 200 ({ authenticated: true | false })
 * @description
 * - `req.cookies.token` should be the JWT token for the current user
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.getAuthentication(res, req.cookies.token))
);

/**
 * Authenticates user login attempt
 *
 * @param {Request} req - Express request object containing username and password
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response after authentication - 200 ({ success: true }) or 401
 * @description
 * - `req.body` should be of type `{ username: string, password: string }`
 */
export const LOGIN = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.authenticateUser(res, req.body.username, req.body.password))
);

/**
 * Logs out current user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response after logout - 200 ({ success: true })
 */
export const LOGOUT = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.logoutUser(req, res))
);