import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as dashboardService from "@/service/dashboardService";

/**
 * Fetches dashboard data for the authenticated user (`GET /dashboard`)
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object containing `user_id` in locals
 * @returns {Promise<Response>} The service response for the dashboard fetch request
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => dashboardService.fetchDashboard(res.locals.user_id))
);