import { User } from "capital-types/user";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/api/controllers";
import { createUser } from "@/service/userService";

export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(() => createUser(req, res, req.body as User), res)
);