import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendSuccess } from "@/controllers/api/response";

const status = asyncHandler(async (req: Request, res: Response) => {
   // Route to fetch the authentication status of the user
   try {
      jwt.verify(req.session.token || req.cookies.token, process.env.SESSION_SECRET || "");

      return sendSuccess(res, 200, "Authenticated status retrieved", { authenticated: true });
   } catch (error: any) {
      // Error caught during JWT verification, implying the user is not authenticated
      console.error(error);

      return sendSuccess(res, 200, "Authenticated status retrieved", { authenticated: false });
   }
});

export default status;