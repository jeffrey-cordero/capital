import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/api/controllers";
import { fetchDashboard } from "@/service/dashboardService";

export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(() => fetchDashboard(res.locals.user.user_id), res)
);