import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendErrors, sendSuccess } from "@/controllers/api/response";

const logout = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Clear the JWT token and session cookies from the client
    res.clearCookie("token");
    res.clearCookie('connect.sid');

    // Destroy the session
    req.session.destroy((error: any) => {
      if (error) {
        throw error;
      }
    });
    
    return sendSuccess(res, 200, "Logout successful");
  } catch (error: any) {
    console.error(error);

    return sendErrors(res, 500, "Internal server error", {
      system: error.message,
    });
  }
});

export default logout;
