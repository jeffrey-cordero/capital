import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/api/controllers";
import { authenticateUser, getAuthentication, logoutUser } from "@/service/authenticationService";

export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(() => getAuthentication(res, req.cookies.token), res)
);

export const LOGIN = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(() => authenticateUser(res, req.body.username, req.body.password), res)
);

export const LOGOUT = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(() => logoutUser(req, res), res)
);