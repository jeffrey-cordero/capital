import express from "express";
import logoutController from "@/controllers/auth/logout";
import loginController from "@/controllers/auth/login";
import { authenticateJWT } from "@/session";

const authRouter = express.Router();

authRouter.post("/login", authenticateJWT(false), loginController);
authRouter.post("/logout", authenticateJWT(true), logoutController);

export default authRouter;