import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as dashboardService from "@/services/dashboardService";

/**
 * Fetches dashboard data for the authenticated user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with dashboard data
 */
export const GET = asyncHandler(async(req: Request, res: Response) => {
   return submitServiceRequest(res, async() => dashboardService.fetchDashboard(res.locals.user_id));
});