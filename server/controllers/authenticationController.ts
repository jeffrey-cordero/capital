import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as authenticationService from "@/service/authenticationService";

/**
 * Verifies current authentication status
 *
 * @param {Request} req - Express request object containing the JWT token in cookies (`{ token: string }`)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the authentication status request
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.getAuthentication(res, req.cookies.token))
);

/**
 * Authenticates user login attempt
 *
 * @param {Request} req - Express request object containing user credentials in body (`{ username: string, password: string }`)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the login request
 */
export const LOGIN = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.authenticateUser(res, req.body.username, req.body.password))
);

/**
 * Logs out current user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the logout request
 */
export const LOGOUT = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.logoutUser(req, res))
);