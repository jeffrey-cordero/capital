import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as authenticationService from "@/service/authenticationService";

export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.getAuthentication(res, req.cookies.token))
);

export const LOGIN = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.authenticateUser(res, req.body.username, req.body.password))
);

export const LOGOUT = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => authenticationService.logoutUser(req, res))
);