import express from "express";
import logoutController from "@/controllers/auth/logout";
import loginController from "@/controllers/auth/login";
import { authenticateJWT } from "@/session";
import { sendSuccess } from "@/controllers/api/response";

const authRouter = express.Router();

authRouter.get("/", authenticateJWT(true), async(req, res) => sendSuccess(res, 200, "Authenticated"));
authRouter.post("/login", authenticateJWT(false), loginController);
authRouter.post("/logout", authenticateJWT(true), logoutController);

export default authRouter;