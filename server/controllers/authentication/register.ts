import asyncHandler from "express-async-handler";
import { Request, Response } from "express";

import { sendSuccess } from "../api/response";


const register = asyncHandler(async (req: Request, res: Response) => {
   console.log(req.body);
   
   return sendSuccess(res, "Registration successful, I think???  ", { "body": req.body });
});

export default register;

