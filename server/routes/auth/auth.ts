import express from "express";
import statusController from "@/controllers/auth/status";
import logoutController from "@/controllers/auth/logout";
import loginController from "@/controllers/auth/login";
import { authenticateJWT } from "@/session";

const authRouter = express.Router();

authRouter.get("/", statusController);
authRouter.post("/login", authenticateJWT(false), loginController);
authRouter.post("/logout", authenticateJWT(true), logoutController);

export default authRouter;