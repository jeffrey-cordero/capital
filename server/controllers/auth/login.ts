import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { sendErrors, sendSuccess } from "@/controllers/api/response";
import { User } from "@/models/user";
import { configureJWT } from "@/session";


const login = asyncHandler(async (req: Request, res: Response) => {
   try {
      const { username, password } = req.body;

      const user = await User.authenticate(username, password);

      if (user === null) {
         return sendErrors(res, 401, "Invalid credentials", {
            username: "Invalid credentials",
            password: "Invalid credentials",
         });
      } else {
         // Configure JWT token
         configureJWT(req, res, user);

         return sendSuccess(res, 200, "Login successful");
      }
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal server error", { system: error.message });
   }
});

export default login;

