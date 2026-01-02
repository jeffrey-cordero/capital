import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as authenticationService from "@/services/authenticationService";

/**
 * Verifies current authentication status
 *
 * @param {Request} req - Express request object with authentication token
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with authentication status
 */
export const GET = asyncHandler(async(req: Request, res: Response) => {
   const authHeader = req.headers.authorization;
   const token: string = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.cookies.access_token;

   return submitServiceRequest(res, async() => authenticationService.getAuthentication(res, token));
});

/**
 * Authenticates user login attempts
 *
 * @param {Request} req - Express request object with login credentials
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with authentication confirmation
 */
export const LOGIN = asyncHandler(async(req: Request, res: Response) => {
   const { username, password } = req.body;

   return submitServiceRequest(res, async() => authenticationService.authenticateUser(res, username, password));
});

/**
 * Refreshes authentication tokens using a valid refresh token
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object with user_id in locals
 * @returns {Promise<Response>} Service response with refresh confirmation
 */
export const REFRESH = asyncHandler(async(_: Request, res: Response) => {
   return submitServiceRequest(res, async() => authenticationService.refreshToken(res, res.locals.user_id));
});

/**
 * Logs out the current user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with logout confirmation
 */
export const LOGOUT = asyncHandler(async(_: Request, res: Response) => {
   return submitServiceRequest(res, async() => authenticationService.logoutUser(res));
});