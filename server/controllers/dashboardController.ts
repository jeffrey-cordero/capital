import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import * as dashboardService from "@/service/dashboardService";
import { submitServiceRequest } from "@/lib/services";

export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => dashboardService.fetchDashboard(res.locals.user_id))
);