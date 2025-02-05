import express from "express";
import { authenticateJWT } from "@/lib/api/authentication";

import { login, logout, fetchAuthentication } from "@/controllers/authController";

const authRouter = express.Router();

authRouter.get("/", fetchAuthentication);
authRouter.post("/login", authenticateJWT(false), login);
authRouter.post("/logout", authenticateJWT(true), logout);

export default authRouter;