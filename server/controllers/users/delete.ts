import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendSuccess } from "@/controllers/api/response";

const deletion = asyncHandler(async (req: Request, res: Response) => {
   return sendSuccess(res, 200, "Deleting user awaits implementation");
});

export default deletion;