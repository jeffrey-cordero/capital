import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import { fetchDashboard } from "@/service/dashboardService";

export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, () => fetchDashboard(res.locals.user_id))
);