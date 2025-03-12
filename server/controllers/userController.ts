import { User } from "capital/user";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import * as userService from "@/service/userService";
import { submitServiceRequest } from "@/lib/services";

export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => userService.createUser(req, res, req.body as User))
);