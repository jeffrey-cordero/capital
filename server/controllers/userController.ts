import { User } from "capital/user";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import { createUser } from "@/service/userService";

export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => createUser(req, res, req.body as User))
);